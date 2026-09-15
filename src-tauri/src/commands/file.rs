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

    let mut entries = Vec::new();
    let read_dir = fs::read_dir(&dir_path).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to read metadata: {}", e))?;

        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files
        if name.starts_with('.') {
            continue;
        }

        let path = entry.path().to_string_lossy().to_string();
        let is_dir = metadata.is_dir();

        let children = if is_dir {
            Some(read_folder(path.clone()).unwrap_or_default())
        } else {
            None
        };

        entries.push(FileEntry {
            name,
            path,
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
