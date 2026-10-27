mod commands;

use commands::file::push_pending_open_file;
use tauri::{Emitter, Manager, RunEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // 第二个实例启动 (如右键打开文件): 把文件路径转发给已有实例
            for arg in args.iter().skip(1) {
                push_pending_open_file(arg.clone());
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.emit::<()>("open-file", ());
                let _ = window.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![
            commands::file::read_file,
            commands::file::write_file,
            commands::file::file_mtime,
            commands::file::open_file_dialog,
            commands::file::open_folder_dialog,
            commands::file::read_folder,
            commands::file::search_folder,
            commands::file::reveal_in_folder,
            commands::file::open_in_default_app,
            commands::file::print_window,
            commands::file::take_pending_open_files,
            commands::settings::load_settings,
            commands::settings::save_settings,
            commands::session::load_session,
            commands::session::save_session,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // macOS: Finder 右键打开文件走 Opened 事件; app 已运行时也会触发
            #[cfg(target_os = "macos")]
            if let RunEvent::Opened { urls } = &event {
                for url in urls {
                    // url 形如 file:///path/to.md, 转成本地路径
                    let path = url
                        .to_file_path()
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_else(|_| url.to_string());
                    push_pending_open_file(path);
                }
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit::<()>("open-file", ());
                }
            }
            // 首次启动由命令行参数 / Finder 带文件打开
            if let RunEvent::Ready = event {
                for arg in std::env::args().skip(1) {
                    push_pending_open_file(arg);
                }
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit::<()>("open-file", ());
                }
            }
        });
}
