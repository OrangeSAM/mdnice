use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

/// 通过文件关联 / 命令行参数打开、但前端尚未消费的文件路径队列
pub static PENDING_OPEN_FILES: Mutex<Vec<String>> = Mutex::new(Vec::new());

/// 过滤出 Markdown 文件路径并加入待打开队列
pub fn push_pending_open_file(path: String) {
    let lower = path.to_lowercase();
    let is_md = ["md", "markdown", "mdx", "mdown", "mkd"]
        .iter()
        .any(|ext| lower.ends_with(&format!(".{}", ext)));
    if is_md {
        PENDING_OPEN_FILES.lock().unwrap().push(path);
    }
}

/// 前端拉取待打开的文件路径 (取走即清空)
#[tauri::command]
pub fn take_pending_open_files() -> Vec<String> {
    std::mem::take(&mut PENDING_OPEN_FILES.lock().unwrap())
}

/// 调起系统打印对话框(可存为 PDF)。macOS 下 wry 支持,配合预览区的 @media print 样式
#[tauri::command]
pub fn print_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| format!("Failed to open print dialog: {}", e))
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

/// 文件最后修改时间(Unix 毫秒)。文件不存在时返回 None(供外部修改轮询用)
#[tauri::command]
pub fn file_mtime(path: String) -> Result<Option<u64>, String> {
    match fs::metadata(&path) {
        Ok(meta) => Ok(meta
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
pub async fn open_file_dialog() -> Result<Option<String>, String> {
    Ok(None)
}

#[tauri::command]
pub async fn open_folder_dialog() -> Result<Option<String>, String> {
    Ok(None)
}

#[tauri::command]
pub fn read_folder(path: String) -> Result<Vec<FileEntry>, String> {
    let dir_path = PathBuf::from(&path);
    if !dir_path.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let read_dir = match fs::read_dir(&dir_path) {
        Ok(rd) => rd,
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    };

    let mut entries = Vec::new();

    for entry in read_dir {
        // 单个 entry 读取失败时跳过，避免个别异常文件阻断整个目录
        let Ok(entry) = entry else { continue };

        let name = entry.file_name().to_string_lossy().to_string();

        // 忽略以 . 开头的隐藏项，以及 node_modules / target / dist 等大型目录
        if name.starts_with('.') || name == "node_modules" || name == "target" || name == "dist" {
            continue;
        }

        // 使用 symlink_metadata / file_type 检查，避免软链接循环导致递归爆栈
        let Ok(file_type) = entry.file_type() else { continue };
        let is_symlink = file_type.is_symlink();
        let is_dir = if is_symlink {
            false // 软链接目录不进行深层递归，防止死循环
        } else {
            file_type.is_dir()
        };

        let path_str = entry.path().to_string_lossy().to_string();

        let children = if is_dir {
            Some(read_folder(path_str.clone()).unwrap_or_default())
        } else {
            None
        };

        entries.push(FileEntry {
            name,
            path: path_str,
            is_dir,
            children,
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    Ok(entries)
}

/// 全文搜索的单条结果
#[derive(Debug, Serialize)]
pub struct SearchMatch {
    pub path: String,
    pub name: String,
    pub line_number: u32,
    pub snippet: String,
}

const MAX_SEARCH_FILE_SIZE: u64 = 2 * 1024 * 1024; // 2MB 以外的文件跳过
const MAX_SEARCH_DEPTH: usize = 10;

/// 大小写不敏感地查找 needle 在 hay 中的位置,返回字符下标(避免按字节切坏 UTF-8)
fn find_char_index(hay: &str, needle: &str) -> Option<usize> {
    let hay_lower: Vec<char> = hay.to_lowercase().chars().collect();
    let needle_lower: Vec<char> = needle.to_lowercase().chars().collect();
    if needle_lower.is_empty() || hay_lower.len() < needle_lower.len() {
        return None;
    }
    for i in 0..=(hay_lower.len() - needle_lower.len()) {
        if hay_lower[i..i + needle_lower.len()] == needle_lower[..] {
            return Some(i);
        }
    }
    None
}

/// 从原始行里截取匹配处前后的上下文作为 snippet(按字符操作,UTF-8 安全)
fn make_snippet(line: &str, char_pos: usize, match_len: usize) -> String {
    let chars: Vec<char> = line.chars().collect();
    let start = char_pos.saturating_sub(30);
    let end = (char_pos + match_len + 40).min(chars.len());
    let mut snippet: String = chars[start..end].iter().collect();
    if start > 0 {
        snippet = format!("…{}", snippet);
    }
    if end < chars.len() {
        snippet = format!("{}…", snippet);
    }
    snippet
}

fn search_dir(dir: &PathBuf, query: &str, results: &mut Vec<SearchMatch>, depth: usize, max: usize) {
    if depth > MAX_SEARCH_DEPTH || results.len() >= max {
        return;
    }
    let Ok(read_dir) = fs::read_dir(dir) else { return };

    let mut entries: Vec<_> = read_dir.filter_map(|e| e.ok()).collect();
    entries.sort_by_key(|a| a.file_name());

    for entry in entries {
        let Ok(file_type) = entry.file_type() else { continue };
        let name = entry.file_name().to_string_lossy().to_string();

        if file_type.is_dir() {
            if name.starts_with('.') || name == "node_modules" || name == "target" || name == "dist" {
                continue;
            }
            search_dir(&entry.path(), query, results, depth + 1, max);
            continue;
        }

        let lower = name.to_lowercase();
        let is_md = ["md", "markdown", "mdown", "mkd"]
            .iter()
            .any(|ext| lower.ends_with(&format!(".{}", ext)));
        if !is_md || results.len() >= max {
            continue;
        }
        if entry.metadata().map(|m| m.len() > MAX_SEARCH_FILE_SIZE).unwrap_or(true) {
            continue;
        }

        let Ok(content) = fs::read_to_string(entry.path()) else { continue };
        let path_str = entry.path().to_string_lossy().to_string();

        for (idx, line) in content.lines().enumerate() {
            if let Some(char_pos) = find_char_index(line, query) {
                // 查询长度按字符数计(与 find_char_index 的字符下标对齐)
                let match_len = query.chars().count();
                results.push(SearchMatch {
                    path: path_str.clone(),
                    name: name.clone(),
                    line_number: (idx + 1) as u32,
                    snippet: make_snippet(line, char_pos, match_len),
                });
                if results.len() >= max {
                    return;
                }
            }
        }
    }
}

/// 在目录下所有 Markdown 文件里做大小写不敏感的全文搜索
#[tauri::command]
pub fn search_folder(path: String, query: String, max_results: Option<usize>) -> Result<Vec<SearchMatch>, String> {
    let query = query.trim().to_string();
    if query.is_empty() {
        return Ok(vec![]);
    }
    let dir_path = PathBuf::from(&path);
    if !dir_path.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    let mut results = Vec::new();
    search_dir(&dir_path, &query, &mut results, 0, max_results.unwrap_or(60));
    Ok(results)
}
