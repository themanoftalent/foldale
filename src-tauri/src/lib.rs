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
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = Database::new().expect("Failed to initialize Foldale SQLite database");
    let app_state = AppState { db: Arc::new(db) };

    tauri::Builder::default()
        .menu(|app| {
            let about_item = MenuItem::with_id(app, "open_about", "About Foldale", true, None::<&str>)?;
            let app_submenu = Submenu::with_items(
                app,
                "Foldale",
                true,
                &[
                    &about_item,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::services(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::show_all(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, None)?,
                ],
            )?;

            let edit_submenu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?;

            let window_submenu = Submenu::with_items(
                app,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, None)?,
                    &PredefinedMenuItem::fullscreen(app, None)?,
                    &PredefinedMenuItem::close_window(app, None)?,
                ],
            )?;

            Menu::with_items(app, &[&app_submenu, &edit_submenu, &window_submenu])
        })
        .on_menu_event(|app, event| {
            if event.id() == "open_about" {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
                let _ = app.emit("open-about", ());
            }
        })
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
            commands::set_native_folder_icon,
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
            commands::get_operation_logs,
            commands::get_autostart,
            commands::set_autostart
        ])
        .run(tauri::generate_context!())
        .expect("error while running foldale application");
}
