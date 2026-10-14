use std::sync::Arc;
use tauri::State;

use crate::archive;
use crate::db::Database;
use crate::fs_ops;
use crate::models::{
    ArchiveEntry, BatchRenameResult, Bookmark, DetailedFileInfo, DirSizeResult,
    DirectoryListing, DriveInfo, OperationLog, RenameOperation, SearchQuery, SearchResultEntry,
    SystemLocations,
};
use crate::search;
use crate::system;

pub struct AppState {
    pub db: Arc<Database>,
}

// --- Filesystem Commands ---

#[tauri::command]
pub async fn list_directory(
    path: String,
    show_hidden: bool,
    state: State<'_, AppState>,
) -> Result<DirectoryListing, String> {
    let result = fs_ops::list_directory(&path, show_hidden)?;
    let _ = state.db.add_history(&result.current_path);
    Ok(result)
}

#[tauri::command]
pub async fn get_file_info(path: String) -> Result<DetailedFileInfo, String> {
    fs_ops::get_file_info(&path)
}

#[tauri::command]
pub async fn calculate_dir_size(path: String) -> Result<DirSizeResult, String> {
    tokio::task::spawn_blocking(move || fs_ops::calculate_dir_size(&path))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_file(
    path: String,
    initial_content: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    fs_ops::create_file(&path, initial_content.as_deref())?;
    let _ = state
        .db
        .log_operation("create_file", &path, None, "success", None);
    Ok(())
}

#[tauri::command]
pub async fn create_directory(path: String, state: State<'_, AppState>) -> Result<(), String> {
    fs_ops::create_directory(&path)?;
    let _ = state
        .db
        .log_operation("create_dir", &path, None, "success", None);
    Ok(())
}

#[tauri::command]
pub async fn rename_item(
    old_path: String,
    new_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    fs_ops::rename_item(&old_path, &new_path)?;
    let _ = state
        .db
        .log_operation("rename", &old_path, Some(&new_path), "success", None);
    Ok(())
}

#[tauri::command]
pub async fn batch_rename(
    operations: Vec<RenameOperation>,
    state: State<'_, AppState>,
) -> Result<BatchRenameResult, String> {
    let res = fs_ops::batch_rename(operations)?;
    let _ = state.db.log_operation(
        "batch_rename",
        &format!("{} items", res.succeeded.len()),
        None,
        "success",
        None,
    );
    Ok(res)
}

#[tauri::command]
pub async fn copy_items(
    sources: Vec<String>,
    destination_dir: String,
    overwrite: bool,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let dest_clone = destination_dir.clone();
    let count = sources.len();
    let copied = tokio::task::spawn_blocking(move || {
        fs_ops::copy_items(sources, destination_dir, overwrite)
    })
    .await
    .map_err(|e| e.to_string())??;

    let _ = state.db.log_operation(
        "copy",
        &format!("{} items", count),
        Some(&dest_clone),
        "success",
        None,
    );
    Ok(copied)
}

#[tauri::command]
pub async fn move_items(
    sources: Vec<String>,
    destination_dir: String,
    overwrite: bool,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let dest_clone = destination_dir.clone();
    let count = sources.len();
    let moved = tokio::task::spawn_blocking(move || {
        fs_ops::move_items(sources, destination_dir, overwrite)
    })
    .await
    .map_err(|e| e.to_string())??;

    let _ = state.db.log_operation(
        "move",
        &format!("{} items", count),
        Some(&dest_clone),
        "success",
        None,
    );
    Ok(moved)
}

#[tauri::command]
pub async fn delete_items(
    paths: Vec<String>,
    permanent: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let count = paths.len();
    fs_ops::delete_items(paths, permanent)?;
    let op_name = if permanent { "perm_delete" } else { "trash" };
    let _ = state.db.log_operation(
        op_name,
        &format!("{} items", count),
        None,
        "success",
        None,
    );
    Ok(())
}

#[tauri::command]
pub async fn duplicate_item(path: String, state: State<'_, AppState>) -> Result<String, String> {
    let new_path = fs_ops::duplicate_item(&path)?;
    let _ = state
        .db
        .log_operation("duplicate", &path, Some(&new_path), "success", None);
    Ok(new_path)
}

#[tauri::command]
pub async fn create_symlink(target: String, link_path: String) -> Result<(), String> {
    fs_ops::create_symlink(&target, &link_path)
}

#[tauri::command]
pub async fn read_text_preview(path: String, max_bytes: Option<usize>) -> Result<String, String> {
    let limit = max_bytes.unwrap_or(256 * 1024);
    fs_ops::read_text_preview(&path, limit)
}

#[tauri::command]
pub async fn read_file_base64(path: String) -> Result<String, String> {
    fs_ops::read_file_base64(&path)
}

// --- Search Commands ---

#[tauri::command]
pub async fn search_directory(query: SearchQuery) -> Result<Vec<SearchResultEntry>, String> {
    tokio::task::spawn_blocking(move || search::search_directory(query))
        .await
        .map_err(|e| e.to_string())?
}

// --- Archive Commands ---

#[tauri::command]
pub async fn list_archive_contents(archive_path: String) -> Result<Vec<ArchiveEntry>, String> {
    tokio::task::spawn_blocking(move || archive::list_archive_contents(&archive_path))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_zip_archive(
    sources: Vec<String>,
    archive_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let arc_clone = archive_path.clone();
    let count = sources.len();
    tokio::task::spawn_blocking(move || archive::create_zip_archive(sources, &archive_path))
        .await
        .map_err(|e| e.to_string())??;

    let _ = state.db.log_operation(
        "create_archive",
        &format!("{} items", count),
        Some(&arc_clone),
        "success",
        None,
    );
    Ok(())
}

#[tauri::command]
pub async fn extract_archive(
    archive_path: String,
    destination_dir: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let src_clone = archive_path.clone();
    let dest_clone = destination_dir.clone();
    tokio::task::spawn_blocking(move || archive::extract_archive(&archive_path, &destination_dir))
        .await
        .map_err(|e| e.to_string())??;

    let _ = state.db.log_operation(
        "extract_archive",
        &src_clone,
        Some(&dest_clone),
        "success",
        None,
    );
    Ok(())
}

// --- System & OS Integration Commands ---

#[tauri::command]
pub async fn get_system_locations() -> Result<SystemLocations, String> {
    system::get_system_locations()
}

#[tauri::command]
pub async fn get_mounted_drives() -> Result<Vec<DriveInfo>, String> {
    system::get_mounted_drives()
}

#[tauri::command]
pub async fn reveal_in_os(path: String) -> Result<(), String> {
    system::reveal_in_os(&path)
}

#[tauri::command]
pub async fn open_with_default_app(path: String) -> Result<(), String> {
    system::open_with_default_app(&path)
}

#[tauri::command]
pub async fn open_in_terminal(dir_path: String) -> Result<(), String> {
    system::open_in_terminal(&dir_path)
}

// --- Database & Persistence Commands ---

#[tauri::command]
pub async fn get_bookmarks(state: State<'_, AppState>) -> Result<Vec<Bookmark>, String> {
    state.db.get_bookmarks()
}

#[tauri::command]
pub async fn add_bookmark(
    name: String,
    path: String,
    icon: String,
    state: State<'_, AppState>,
) -> Result<Bookmark, String> {
    state.db.add_bookmark(&name, &path, &icon)
}

#[tauri::command]
pub async fn remove_bookmark(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    state.db.remove_bookmark(id)
}

#[tauri::command]
pub async fn get_recent_history(
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    state.db.get_recent_history(limit.unwrap_or(20))
}

#[tauri::command]
pub async fn get_setting(
    key: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    state.db.get_setting(&key)
}

#[tauri::command]
pub async fn set_setting(
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.db.set_setting(&key, &value)
}

#[tauri::command]
pub async fn get_operation_logs(
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<OperationLog>, String> {
    state.db.get_operation_logs(limit.unwrap_or(50))
}
