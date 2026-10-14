pub mod archive;
pub mod commands;
pub mod db;
pub mod fs_ops;
pub mod menu;
pub mod models;
pub mod search;
pub mod system;
pub mod transfer;
pub mod trash;
pub mod util;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use commands::AppState;
use db::Database;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // A broken or locked database must not stop the file manager from starting.
    let (db, db_error) = match Database::open(&db::default_db_path()) {
        Ok(db) => (db, None),
        Err(e) => (Database::in_memory(), Some(e)),
    };
    let app_state = AppState {
        db: Arc::new(db),
        db_error,
        jobs: Mutex::new(HashMap::new()),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::all()
                        - tauri_plugin_window_state::StateFlags::VISIBLE,
                )
                .build(),
        )
        .manage(app_state)
        .menu(|app| menu::build(app))
        .on_menu_event(|app, event| {
            let id = event.id().0.clone();
            if id == "github" {
                let _ = open::that_detached("https://github.com/themanoftalent/foldale");
                return;
            }
            let _ = app.emit("menu", id);
        })
        .setup(|app| {
            // The frontend shows the window once its first paint is ready. If that
            // never happens (for example a script error), show it anyway.
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(2500));
                if let Some(w) = handle.get_webview_window("main") {
                    if !w.is_visible().unwrap_or(true) {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_directory,
            commands::record_visit,
            commands::get_file_info,
            commands::calculate_dir_size,
            commands::path_exists,
            commands::unique_name,
            commands::free_space,
            commands::create_file,
            commands::create_directory,
            commands::rename_item,
            commands::batch_rename,
            commands::duplicate_items,
            commands::create_symlink,
            commands::plan_transfer,
            commands::run_transfer,
            commands::cancel_job,
            commands::rename_many,
            commands::trash_items,
            commands::restore_trashed,
            commands::delete_permanently,
            commands::read_text_preview,
            commands::search_directory,
            commands::list_archive_contents,
            commands::create_zip_archive,
            commands::extract_archive,
            commands::is_supported_archive,
            commands::get_system_locations,
            commands::get_mounted_drives,
            commands::eject_volume,
            commands::reveal_in_os,
            commands::open_with_default_app,
            commands::open_in_terminal,
            commands::copy_text,
            commands::app_info,
            commands::get_bookmarks,
            commands::add_bookmark,
            commands::rename_bookmark,
            commands::reorder_bookmarks,
            commands::remove_bookmark,
            commands::get_recent_history,
            commands::clear_history,
            commands::get_setting,
            commands::set_setting,
            commands::get_operation_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running Foldale");
}
