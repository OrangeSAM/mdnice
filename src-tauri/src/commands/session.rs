use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// 上次会话的运行状态(与用户偏好的 settings.json 分离)。
/// file_content / file_tree 不持久化:启动时从磁盘重读,拿到最新内容。
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct SessionState {
    pub last_folder_path: String,
    pub last_file_path: String,
    pub last_scroll_top: f64,
}

fn session_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir().ok_or("Cannot get config directory")?;
    let app_dir = config_dir.join("mdnice");
    fs::create_dir_all(&app_dir).map_err(|e| format!("Failed to create config dir: {}", e))?;
    Ok(app_dir.join("session.json"))
}

#[tauri::command]
pub fn load_session() -> Result<SessionState, String> {
    let path = session_path()?;
    if path.exists() {
        let content =
            fs::read_to_string(&path).map_err(|e| format!("Failed to read session: {}", e))?;
        // session 是可丢弃的运行状态,文件损坏时静默回退默认值,不阻断启动
        let session: SessionState = serde_json::from_str(&content).unwrap_or_default();
        Ok(session)
    } else {
        Ok(SessionState::default())
    }
}

#[tauri::command]
pub fn save_session(session: SessionState) -> Result<(), String> {
    let path = session_path()?;
    let content =
        serde_json::to_string_pretty(&session).map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(path, content).map_err(|e| format!("Failed to save session: {}", e))
}
