mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            commands::file::read_file,
            commands::file::write_file,
            commands::file::open_file_dialog,
            commands::file::open_folder_dialog,
            commands::file::read_folder,
            commands::settings::load_settings,
            commands::settings::save_settings,
            commands::session::load_session,
            commands::session::save_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
