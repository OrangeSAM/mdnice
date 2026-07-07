use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub font_size: u32,
    pub font_family: String,
    pub line_height: f64,
    pub theme: String,
    pub editor_font_size: u32,
    pub editor_width: f64,
    pub preview_max_width: u32,
    pub show_sidebar: bool,
    pub view_mode: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            font_size: 16,
            font_family: "system-ui".into(),
            line_height: 1.8,
            theme: "light".into(),
            editor_font_size: 14,
            editor_width: 50.0,
            preview_max_width: 800,
            show_sidebar: true,
            view_mode: "split".into(),
        }
    }
}

fn config_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir().ok_or("Cannot get config directory")?;
    let app_dir = config_dir.join("mdnice");
    fs::create_dir_all(&app_dir).map_err(|e| format!("Failed to create config dir: {}", e))?;
    Ok(app_dir.join("settings.json"))
}

#[tauri::command]
pub fn load_settings() -> Result<AppSettings, String> {
    let path = config_path()?;
    if path.exists() {
        let content =
            fs::read_to_string(&path).map_err(|e| format!("Failed to read settings: {}", e))?;
        let mut settings: AppSettings =
            serde_json::from_str(&content).map_err(|e| format!("Failed to parse settings: {}", e))?;
        // Ensure view_mode has a default
        if settings.view_mode.is_empty() {
            settings.view_mode = "split".into();
        }
        Ok(settings)
    } else {
        Ok(AppSettings::default())
    }
}

#[tauri::command]
pub fn save_settings(settings: AppSettings) -> Result<(), String> {
    let path = config_path()?;
    let content =
        serde_json::to_string_pretty(&settings).map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(path, content).map_err(|e| format!("Failed to save settings: {}", e))
}
