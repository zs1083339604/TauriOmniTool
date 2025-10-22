use tauri::Manager;
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// 引入日志文件
use tauri_plugin_log::{Target, TargetKind};
mod utils;
use utils::api::{files_or_directory, get_active_explorer_select_files, send_api_request};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(debug_assertions)] // 仅在调试(debug)版本中包含此代码
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
                window.close_devtools();
            }
            Ok(())
        })
        // 注册日志插件
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        // 全局热键
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        // SQL
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            files_or_directory,
            get_active_explorer_select_files,
            send_api_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
