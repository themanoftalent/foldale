//! Tauri command surface. Every filesystem mutation is logged to the operation log
//! with its real outcome (success, partial or error).

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

use crate::archive;
use crate::db::Database;
use crate::fs_ops;
use crate::models::*;
use crate::search;
use crate::system;
use crate::transfer::{self, ProgressSink};
use crate::trash;

pub struct AppState {
    pub db: Arc<Database>,
    pub db_error: Option<String>,
    pub jobs: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl AppState {
    fn register_job(&self, id: &str) -> Arc<AtomicBool> {
        let flag = Arc::new(AtomicBool::new(false));
        if let Ok(mut j) = self.jobs.lock() {
            j.insert(id.to_string(), flag.clone());
        }
        flag
    }
    fn finish_job(&self, id: &str) {
        if let Ok(mut j) = self.jobs.lock() {
            j.remove(id);
        }
    }
    fn log(&self, op: &str, source: &str, dest: Option<&str>, errors: &[(String, String)]) {
        let (status, msg) = if errors.is_empty() {
            ("success", None)
        } else {
            ("error", Some(errors.iter().map(|(p, e)| format!("{p}: {e}")).collect::<Vec<_>>().join("; ")))
        };
        let _ = self.db.log_operation(op, source, dest, status, msg.as_deref());
    }
}

async fn blocking<T: Send + 'static>(f: impl FnOnce() -> T + Send + 'static) -> Result<T, String> {
    tokio::task::spawn_blocking(f).await.map_err(|e| e.to_string())
}

fn summary(paths: &[String]) -> String {
    match paths.len() {
        0 => "nothing".into(),
        1 => paths[0].clone(),
        n => format!("{} items (first: {})", n, paths[0]),
    }
}

// --- Listing & metadata ----------------------------------------------------

#[tauri::command]
pub async fn list_directory(path: String, show_hidden: bool) -> Result<DirectoryListing, String> {
    blocking(move || fs_ops::list_directory(&path, show_hidden)).await?
}

#[tauri::command]
pub async fn record_visit(path: String, state: State<'_, AppState>) -> Result<(), String> {
    state.db.add_history(&path)
}

#[tauri::command]
pub async fn get_file_info(path: String) -> Result<DetailedFileInfo, String> {
    blocking(move || fs_ops::get_file_info(&path)).await?
}

#[tauri::command]
pub async fn calculate_dir_size(path: String, job_id: Option<String>, state: State<'_, AppState>) -> Result<DirSizeResult, String> {
    let id = job_id.unwrap_or_else(|| format!("size-{}", path));
    let flag = state.register_job(&id);
    let r = blocking(move || fs_ops::calculate_dir_size(&path, Some(&flag))).await?;
    state.finish_job(&id);
    r
}

#[tauri::command]
pub async fn path_exists(path: String) -> Result<bool, String> {
    Ok(std::fs::symlink_metadata(&path).is_ok())
}

#[tauri::command]
pub async fn unique_name(dir: String, name: String) -> Result<String, String> {
    Ok(crate::util::unique_name(std::path::Path::new(&dir), &name))
}

#[tauri::command]
pub async fn free_space(path: String) -> Result<Option<(u64, u64)>, String> {
    blocking(move || system::free_space_for(&path)).await
}

// --- Create / rename -------------------------------------------------------

#[tauri::command]
pub async fn create_file(path: String, initial_content: Option<String>, state: State<'_, AppState>) -> Result<(), String> {
    let r = fs_ops::create_file(&path, initial_content.as_deref());
    state.log("create_file", &path, None, &r.as_ref().err().map(|e| vec![(path.clone(), e.clone())]).unwrap_or_default());
    r
}

#[tauri::command]
pub async fn create_directory(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let r = fs_ops::create_directory(&path);
    state.log("create_dir", &path, None, &r.as_ref().err().map(|e| vec![(path.clone(), e.clone())]).unwrap_or_default());
    r
}

#[tauri::command]
pub async fn rename_item(old_path: String, new_path: String, state: State<'_, AppState>) -> Result<(), String> {
    let r = fs_ops::rename_item(&old_path, &new_path);
    state.log("rename", &old_path, Some(&new_path), &r.as_ref().err().map(|e| vec![(old_path.clone(), e.clone())]).unwrap_or_default());
    r
}

#[tauri::command]
pub async fn batch_rename(operations: Vec<RenameOperation>, state: State<'_, AppState>) -> Result<BatchRenameResult, String> {
    let n = operations.len();
    let res = blocking(move || fs_ops::batch_rename(operations)).await??;
    state.log("batch_rename", &format!("{} items", n), None, &res.failed);
    Ok(res)
}

#[tauri::command]
pub async fn duplicate_items(paths: Vec<String>, state: State<'_, AppState>) -> Result<Vec<(String, String)>, String> {
    let label = summary(&paths);
    let r = blocking(move || fs_ops::duplicate_items(&paths)).await?;
    state.log("duplicate", &label, None, &r.as_ref().err().map(|e| vec![(label.clone(), e.clone())]).unwrap_or_default());
    r
}

#[tauri::command]
pub async fn create_symlink(target: String, link_path: String, state: State<'_, AppState>) -> Result<(), String> {
    let r = fs_ops::create_symlink(&target, &link_path);
    state.log("symlink", &target, Some(&link_path), &r.as_ref().err().map(|e| vec![(target.clone(), e.clone())]).unwrap_or_default());
    r
}

// --- Transfers ---------------------------------------------------------------

#[tauri::command]
pub async fn plan_transfer(op: TransferOp, sources: Vec<String>, destination: String) -> Result<TransferPlan, String> {
    blocking(move || transfer::plan_transfer(op, &sources, &destination)).await?
}

#[tauri::command]
pub async fn run_transfer(app: AppHandle, request: TransferRequest, state: State<'_, AppState>) -> Result<TransferResult, String> {
    let id = request.job_id.clone();
    let flag = state.register_job(&id);
    let op_name = match request.op {
        TransferOp::Copy => "copy",
        TransferOp::Move => "move",
    };
    let label = summary(&request.sources);
    let dest = request.destination.clone();
    let res = blocking(move || {
        let emit = |p: &JobProgress| {
            let _ = app.emit("job-progress", p.clone());
        };
        transfer::run_transfer(request, ProgressSink { emit: &emit, cancel: &flag })
    })
    .await?;
    state.finish_job(&id);
    match &res {
        Ok(r) => state.log(op_name, &label, Some(&dest), &r.errors),
        Err(e) => state.log(op_name, &label, Some(&dest), &[(label.clone(), e.clone())]),
    }
    res
}

#[tauri::command]
pub async fn cancel_job(job_id: String, state: State<'_, AppState>) -> Result<bool, String> {
    let jobs = state.jobs.lock().map_err(|e| e.to_string())?;
    Ok(match jobs.get(&job_id) {
        Some(f) => {
            f.store(true, Ordering::Relaxed);
            true
        }
        None => false,
    })
}

#[tauri::command]
pub async fn rename_many(pairs: Vec<PathPair>, state: State<'_, AppState>) -> Result<Vec<(String, String)>, String> {
    let n = pairs.len();
    let errs = blocking(move || transfer::rename_many(&pairs)).await?;
    state.log("undo_move", &format!("{} items", n), None, &errs);
    Ok(errs)
}

// --- Trash & delete ------------------------------------------------------------

#[tauri::command]
pub async fn trash_items(paths: Vec<String>, state: State<'_, AppState>) -> Result<TrashResult, String> {
    let label = summary(&paths);
    let r = blocking(move || trash::trash_items(&paths)).await?;
    state.log("trash", &label, None, &r.errors);
    Ok(r)
}

#[tauri::command]
pub async fn restore_trashed(items: Vec<TrashedItem>, state: State<'_, AppState>) -> Result<Vec<(String, String)>, String> {
    let n = items.len();
    let errs = blocking(move || trash::restore_items(&items)).await?;
    state.log("restore", &format!("{} items", n), None, &errs);
    Ok(errs)
}

#[tauri::command]
pub async fn delete_permanently(paths: Vec<String>, state: State<'_, AppState>) -> Result<Vec<(String, String)>, String> {
    let label = summary(&paths);
    let errs = blocking(move || trash::delete_permanently(&paths)).await?;
    state.log("perm_delete", &label, None, &errs);
    Ok(errs)
}

// --- Previews ----------------------------------------------------------------

#[tauri::command]
pub async fn read_text_preview(path: String, max_bytes: Option<usize>) -> Result<TextPreview, String> {
    let limit = max_bytes.unwrap_or(256 * 1024).min(8 * 1024 * 1024);
    blocking(move || fs_ops::read_text_preview(&path, limit)).await?
}

// --- Search --------------------------------------------------------------------

#[derive(Clone, serde::Serialize)]
struct SearchBatch {
    search_id: String,
    results: Vec<SearchResultEntry>,
    scanned: u64,
}

#[tauri::command]
pub async fn search_directory(app: AppHandle, query: SearchQuery, state: State<'_, AppState>) -> Result<SearchSummary, String> {
    let id = query.search_id.clone();
    let flag = state.register_job(&id);
    let id2 = id.clone();
    let r = blocking(move || {
        let on_batch = |batch: &[SearchResultEntry], scanned: u64| {
            let _ = app.emit("search-batch", SearchBatch { search_id: id2.clone(), results: batch.to_vec(), scanned });
        };
        search::search_directory(query, &flag, &on_batch)
    })
    .await?;
    state.finish_job(&id);
    r
}

// --- Archives ------------------------------------------------------------------

#[tauri::command]
pub async fn list_archive_contents(archive_path: String) -> Result<Vec<ArchiveEntry>, String> {
    blocking(move || archive::list_archive_contents(&archive_path)).await?
}

#[tauri::command]
pub async fn create_zip_archive(sources: Vec<String>, destination_dir: String, base_name: String, state: State<'_, AppState>) -> Result<String, String> {
    let label = summary(&sources);
    let dest = destination_dir.clone();
    let r = blocking(move || archive::create_zip_archive(&sources, &destination_dir, &base_name)).await?;
    state.log("create_archive", &label, Some(&dest), &r.as_ref().err().map(|e| vec![(label.clone(), e.clone())]).unwrap_or_default());
    r
}

#[tauri::command]
pub async fn extract_archive(archive_path: String, destination_dir: String, state: State<'_, AppState>) -> Result<String, String> {
    let (a, d) = (archive_path.clone(), destination_dir.clone());
    let r = blocking(move || archive::extract_archive(&archive_path, &destination_dir)).await?;
    state.log("extract_archive", &a, Some(&d), &r.as_ref().err().map(|e| vec![(a.clone(), e.clone())]).unwrap_or_default());
    r
}

#[tauri::command]
pub async fn is_supported_archive(path: String) -> Result<bool, String> {
    Ok(archive::is_supported(&path))
}

// --- System --------------------------------------------------------------------

#[tauri::command]
pub async fn get_system_locations() -> Result<SystemLocations, String> {
    Ok(system::get_system_locations())
}

#[tauri::command]
pub async fn get_mounted_drives() -> Result<Vec<DriveInfo>, String> {
    blocking(system::get_volumes).await
}

#[tauri::command]
pub async fn eject_volume(mount_point: String) -> Result<(), String> {
    blocking(move || system::eject_volume(&mount_point)).await?
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

#[tauri::command]
pub async fn copy_text(text: String) -> Result<(), String> {
    blocking(move || system::copy_text_to_clipboard(&text)).await?
}

#[tauri::command]
pub async fn app_info(app: AppHandle, state: State<'_, AppState>) -> Result<AppInfo, String> {
    Ok(AppInfo {
        version: app.package_info().version.to_string(),
        data_dir: state
            .db
            .path
            .as_ref()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| "(in memory)".into()),
        database_ok: state.db_error.is_none(),
        database_error: state.db_error.clone(),
    })
}

// --- Persistence -----------------------------------------------------------------

#[tauri::command]
pub async fn get_bookmarks(state: State<'_, AppState>) -> Result<Vec<Bookmark>, String> {
    state.db.get_bookmarks()
}

#[tauri::command]
pub async fn add_bookmark(name: String, path: String, icon: String, state: State<'_, AppState>) -> Result<Bookmark, String> {
    state.db.add_bookmark(&name, &path, &icon)
}

#[tauri::command]
pub async fn rename_bookmark(id: i64, name: String, state: State<'_, AppState>) -> Result<(), String> {
    state.db.rename_bookmark(id, &name)
}

#[tauri::command]
pub async fn reorder_bookmarks(ids: Vec<i64>, state: State<'_, AppState>) -> Result<(), String> {
    state.db.reorder_bookmarks(&ids)
}

#[tauri::command]
pub async fn remove_bookmark(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    state.db.remove_bookmark(id)
}

#[tauri::command]
pub async fn get_recent_history(limit: Option<usize>, state: State<'_, AppState>) -> Result<Vec<String>, String> {
    state.db.get_recent_history(limit.unwrap_or(20))
}

#[tauri::command]
pub async fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    state.db.clear_history()
}

#[tauri::command]
pub async fn get_setting(key: String, state: State<'_, AppState>) -> Result<Option<String>, String> {
    state.db.get_setting(&key)
}

#[tauri::command]
pub async fn set_setting(key: String, value: String, state: State<'_, AppState>) -> Result<(), String> {
    state.db.set_setting(&key, &value)
}

#[tauri::command]
pub async fn get_operation_logs(limit: Option<usize>, state: State<'_, AppState>) -> Result<Vec<OperationLog>, String> {
    state.db.get_operation_logs(limit.unwrap_or(100))
}
