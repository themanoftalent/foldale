use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_symlink: bool,
    pub is_hidden: bool,
    /// macOS bundle directories (.app, .bundle, ...) that should open, not navigate.
    pub is_package: bool,
    pub size: u64,
    /// Unix timestamp in seconds.
    pub modified: Option<i64>,
    pub created: Option<i64>,
    pub readonly: bool,
    pub extension: Option<String>,
    pub permissions: String,
    pub mime_type: String,
    pub symlink_target: Option<String>,
    pub broken_symlink: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryListing {
    pub current_path: String,
    pub parent_path: Option<String>,
    pub entries: Vec<FileEntry>,
    pub total_files: usize,
    pub total_dirs: usize,
    pub total_size: u64,
    pub is_readable: bool,
    pub is_writable: bool,
    /// Entries that could not be read (permission errors on individual items).
    pub unreadable_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailedFileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_symlink: bool,
    pub is_hidden: bool,
    pub is_package: bool,
    pub size: u64,
    pub modified: Option<i64>,
    pub created: Option<i64>,
    pub accessed: Option<i64>,
    pub permissions: String,
    pub octal_permissions: String,
    pub readonly: bool,
    pub extension: Option<String>,
    pub mime_type: String,
    pub symlink_target: Option<String>,
    pub line_count: Option<usize>,
    pub owner_uid: Option<u32>,
    pub group_gid: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriveInfo {
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub file_system: String,
    pub is_removable: bool,
    pub is_root: bool,
    pub is_ejectable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemLocations {
    pub home: String,
    pub desktop: String,
    pub documents: String,
    pub downloads: String,
    pub pictures: String,
    pub music: String,
    pub videos: String,
    pub applications: String,
    pub root: String,
    pub trash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub search_id: String,
    pub directory: String,
    pub term: String,
    pub is_regex: bool,
    pub case_sensitive: bool,
    #[serde(default)]
    pub include_hidden: bool,
    #[serde(default)]
    pub search_contents: bool,
    pub extension_filter: Option<String>,
    pub min_size: Option<u64>,
    pub max_size: Option<u64>,
    pub min_modified: Option<i64>,
    pub max_results: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResultEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<i64>,
    pub extension: Option<String>,
    /// For content searches, the first matching line (trimmed).
    pub snippet: Option<String>,
    pub line_number: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchSummary {
    pub search_id: String,
    pub results: Vec<SearchResultEntry>,
    pub scanned: u64,
    pub truncated: bool,
    pub cancelled: bool,
    pub elapsed_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveEntry {
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub compressed_size: u64,
    pub modified: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenameOperation {
    pub old_path: String,
    pub new_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchRenameResult {
    pub succeeded: Vec<RenameOperation>,
    pub failed: Vec<(String, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bookmark {
    pub id: i64,
    pub name: String,
    pub path: String,
    pub icon: String,
    pub order_index: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationLog {
    pub id: i64,
    pub op_type: String,
    pub source: String,
    pub destination: Option<String>,
    pub timestamp: i64,
    pub status: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirSizeResult {
    pub path: String,
    pub total_bytes: u64,
    pub file_count: u64,
    pub dir_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextPreview {
    pub text: String,
    pub truncated: bool,
    pub is_binary: bool,
    pub total_bytes: u64,
}

// ---------------------------------------------------------------------------
// Transfers (copy / move) with conflict resolution
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TransferOp {
    Copy,
    Move,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Resolution {
    /// Move the existing destination item to the Trash, then transfer.
    Replace,
    /// Transfer under a new, unique name.
    KeepBoth,
    /// Leave this source alone.
    Skip,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferConflict {
    pub source: String,
    pub target: String,
    pub source_is_dir: bool,
    pub target_is_dir: bool,
    pub source_size: u64,
    pub target_size: u64,
    pub source_modified: Option<i64>,
    pub target_modified: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferPlan {
    pub op: TransferOp,
    pub destination: String,
    pub conflicts: Vec<TransferConflict>,
    /// Sources that cannot be transferred at all, with a reason.
    pub blocked: Vec<(String, String)>,
    /// Sources that are already in the destination (moves) and will be ignored.
    pub noop: Vec<String>,
    pub total_items: u64,
    pub total_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferRequest {
    pub job_id: String,
    pub op: TransferOp,
    pub sources: Vec<String>,
    pub destination: String,
    #[serde(default)]
    pub resolutions: HashMap<String, Resolution>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferredItem {
    pub source: String,
    pub target: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashedItem {
    pub original: String,
    /// Where the item ended up inside the Trash. `None` when the platform does
    /// not report it, which means the item can only be restored from Finder.
    pub trashed: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferResult {
    pub job_id: String,
    pub op: TransferOp,
    pub items: Vec<TransferredItem>,
    pub replaced: Vec<TrashedItem>,
    pub skipped: Vec<String>,
    pub errors: Vec<(String, String)>,
    pub cancelled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobProgress {
    pub job_id: String,
    pub done_items: u64,
    pub total_items: u64,
    pub done_bytes: u64,
    pub total_bytes: u64,
    pub current: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrashResult {
    pub items: Vec<TrashedItem>,
    pub errors: Vec<(String, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathPair {
    pub from: String,
    pub to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub version: String,
    pub data_dir: String,
    pub database_ok: bool,
    pub database_error: Option<String>,
}
