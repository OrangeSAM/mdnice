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

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
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
