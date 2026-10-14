pub mod archive;
pub mod commands;
pub mod db;
pub mod fs_ops;
pub mod models;
pub mod search;
pub mod system;
pub mod transfer;
pub mod trash;
pub mod util;

use std::sync::Arc;
use commands::AppState;
use db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = Database::new().expect("Failed to initialize Foldale SQLite database");
    let app_state = AppState { db: Arc::new(db) };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::list_directory,
            commands::get_file_info,
            commands::calculate_dir_size,
            commands::create_file,
            commands::create_directory,
            commands::rename_item,
            commands::batch_rename,
            commands::check_conflicts,
            commands::copy_items,
            commands::copy_items_with_policy,
            commands::move_items,
            commands::move_items_with_policy,
            commands::undo_last_operation,
            commands::delete_items,
            commands::duplicate_item,
            commands::create_symlink,
            commands::read_text_preview,
            commands::read_file_base64,
            commands::search_directory,
            commands::list_archive_contents,
            commands::create_zip_archive,
            commands::extract_archive,
            commands::get_system_locations,
            commands::get_mounted_drives,
            commands::reveal_in_os,
            commands::open_with_default_app,
            commands::open_in_terminal,
            commands::get_bookmarks,
            commands::add_bookmark,
            commands::remove_bookmark,
            commands::get_recent_history,
            commands::get_setting,
            commands::get_all_settings,
            commands::set_setting,
            commands::get_operation_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running foldale application");
}
