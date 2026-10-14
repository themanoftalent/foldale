use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

use crate::models::{
    BatchRenameResult, DetailedFileInfo, DirSizeResult, DirectoryListing, FileEntry,
    RenameOperation,
};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

/// Convert SystemTime to unix timestamp in seconds
fn time_to_timestamp(time: std::io::Result<std::time::SystemTime>) -> Option<i64> {
    time.ok().and_then(|t| {
        t.duration_since(UNIX_EPOCH)
            .ok()
            .map(|d| d.as_secs() as i64)
    })
}

/// Detect basic MIME category from file extension
pub fn detect_mime_type(ext: Option<&str>) -> String {
    match ext.map(|s| s.to_lowercase()).as_deref() {
        Some("png") | Some("jpg") | Some("jpeg") | Some("gif") | Some("webp") | Some("svg")
        | Some("bmp") | Some("ico") | Some("tiff") => "image".to_string(),
        Some("mp4") | Some("mov") | Some("mkv") | Some("avi") | Some("webm") => "video".to_string(),
        Some("mp3") | Some("wav") | Some("flac") | Some("aac") | Some("ogg") | Some("m4a") => {
            "audio".to_string()
        }
        Some("pdf") => "pdf".to_string(),
        Some("zip") | Some("tar") | Some("gz") | Some("7z") | Some("rar") | Some("bz2") => {
            "archive".to_string()
        }
        Some("rs") | Some("ts") | Some("tsx") | Some("js") | Some("jsx") | Some("py")
        | Some("go") | Some("c") | Some("cpp") | Some("h") | Some("java") | Some("swift")
        | Some("sh") | Some("zsh") | Some("bash") | Some("html") | Some("css") | Some("scss")
        | Some("json") | Some("yaml") | Some("yml") | Some("toml") | Some("xml") | Some("sql") => {
            "code".to_string()
        }
        Some("md") | Some("markdown") | Some("txt") | Some("rtf") | Some("log") => "text".to_string(),
        Some("doc") | Some("docx") | Some("pages") => "document".to_string(),
        Some("xls") | Some("xlsx") | Some("numbers") | Some("csv") => "spreadsheet".to_string(),
        Some("ppt") | Some("pptx") | Some("key") => "presentation".to_string(),
        _ => "unknown".to_string(),
    }
}

/// Format file permissions into readable string like "rwxr-xr-x"
pub fn format_permissions(metadata: &fs::Metadata) -> (String, String) {
    #[cfg(unix)]
    {
        let mode = metadata.permissions().mode();
        let octal = format!("{:o}", mode & 0o777);

        let user = format!(
            "{}{}{}",
            if mode & 0o400 != 0 { "r" } else { "-" },
            if mode & 0o200 != 0 { "w" } else { "-" },
            if mode & 0o100 != 0 { "x" } else { "-" }
        );
        let group = format!(
            "{}{}{}",
            if mode & 0o040 != 0 { "r" } else { "-" },
            if mode & 0o020 != 0 { "w" } else { "-" },
            if mode & 0o010 != 0 { "x" } else { "-" }
        );
        let other = format!(
            "{}{}{}",
            if mode & 0o004 != 0 { "r" } else { "-" },
            if mode & 0o002 != 0 { "w" } else { "-" },
            if mode & 0o001 != 0 { "x" } else { "-" }
        );

        (format!("{}{}{}", user, group, other), octal)
    }

    #[cfg(not(unix))]
    {
        let readonly = metadata.permissions().readonly();
        let perm_str = if readonly { "r--r--r--" } else { "rw-rw-rw-" }.to_string();
        let octal = if readonly { "444" } else { "666" }.to_string();
        (perm_str, octal)
    }
}

/// Read directory contents and return DirectoryListing
pub fn list_directory(dir_path: &str, show_hidden: bool) -> Result<DirectoryListing, String> {
    let path = Path::new(dir_path);
    if !path.exists() {
        return Err(format!("Directory does not exist: {}", dir_path));
    }
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", dir_path));
    }

    let canonical = path
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(dir_path));
    let canonical_str = canonical.to_string_lossy().to_string();

    let parent_path = path.parent().map(|p| p.to_string_lossy().to_string());

    let mut entries = Vec::new();
    let mut total_files = 0;
    let mut total_dirs = 0;
    let mut total_size = 0;

    let read_dir = match fs::read_dir(path) {
        Ok(rd) => rd,
        Err(e) => return Err(format!("Permission denied or failed to read: {}", e)),
    };

    for item in read_dir {
        if let Ok(entry) = item {
            let file_name = entry.file_name().to_string_lossy().to_string();
            let is_hidden = file_name.starts_with('.');

            if !show_hidden && is_hidden {
                continue;
            }

            let entry_path = entry.path();
            let entry_path_str = entry_path.to_string_lossy().to_string();

            // Use symlink_metadata to avoid following broken links
            let meta = match fs::symlink_metadata(&entry_path) {
                Ok(m) => m,
                Err(_) => continue,
            };

            let is_symlink = meta.file_type().is_symlink();
            let is_dir = if is_symlink {
                fs::metadata(&entry_path)
                    .map(|m| m.is_dir())
                    .unwrap_or(false)
            } else {
                meta.is_dir()
            };

            let size = if is_dir { 0 } else { meta.len() };
            if is_dir {
                total_dirs += 1;
            } else {
                total_files += 1;
                total_size += size;
            }

            let modified = time_to_timestamp(meta.modified());
            let created = time_to_timestamp(meta.created());
            let readonly = meta.permissions().readonly();
            let (permissions, _) = format_permissions(&meta);

            let extension = entry_path
                .extension()
                .map(|e| e.to_string_lossy().to_string());
            let mime_type = if is_dir {
                "folder".to_string()
            } else {
                detect_mime_type(extension.as_deref())
            };

            let symlink_target = if is_symlink {
                fs::read_link(&entry_path)
                    .ok()
                    .map(|p| p.to_string_lossy().to_string())
            } else {
                None
            };

            entries.push(FileEntry {
                name: file_name,
                path: entry_path_str,
                is_dir,
                is_symlink,
                is_hidden,
                size,
                modified,
                created,
                readonly,
                extension,
                permissions,
                mime_type,
                symlink_target,
            });
        }
    }

    // Default sort: directories first, then alphabetical case-insensitive
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    // Check write permission
    let is_writable = path
        .metadata()
        .map(|m| !m.permissions().readonly())
        .unwrap_or(false);

    Ok(DirectoryListing {
        current_path: canonical_str,
        parent_path,
        entries,
        total_files,
        total_dirs,
        total_size,
        is_readable: true,
        is_writable,
    })
}

/// Get detailed file information
pub fn get_file_info(file_path: &str) -> Result<DetailedFileInfo, String> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", file_path));
    }

    let meta = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    let is_symlink = meta.file_type().is_symlink();
    let is_dir = if is_symlink {
        fs::metadata(path).map(|m| m.is_dir()).unwrap_or(false)
    } else {
        meta.is_dir()
    };

    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| file_path.to_string());
    let is_hidden = name.starts_with('.');
    let size = if is_dir { 0 } else { meta.len() };
    let modified = time_to_timestamp(meta.modified());
    let created = time_to_timestamp(meta.created());
    let accessed = time_to_timestamp(meta.accessed());
    let (permissions, octal_permissions) = format_permissions(&meta);
    let readonly = meta.permissions().readonly();

    let extension = path.extension().map(|e| e.to_string_lossy().to_string());
    let mime_type = if is_dir {
        "folder".to_string()
    } else {
        detect_mime_type(extension.as_deref())
    };

    let symlink_target = if is_symlink {
        fs::read_link(path)
            .ok()
            .map(|p| p.to_string_lossy().to_string())
    } else {
        None
    };

    // Count lines for text files under 2 MB
    let line_count = if !is_dir && size < 2 * 1024 * 1024 && (mime_type == "text" || mime_type == "code") {
        fs::read_to_string(path).ok().map(|s| s.lines().count())
    } else {
        None
    };

    Ok(DetailedFileInfo {
        name,
        path: file_path.to_string(),
        is_dir,
        is_symlink,
        is_hidden,
        size,
        modified,
        created,
        accessed,
        permissions,
        octal_permissions,
        readonly,
        extension,
        mime_type,
        symlink_target,
        line_count,
    })
}

/// Recursively calculate folder size
pub fn calculate_dir_size(dir_path: &str) -> Result<DirSizeResult, String> {
    let path = Path::new(dir_path);
    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut total_bytes = 0;
    let mut file_count = 0;
    let mut dir_count = 0;

    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        if entry.depth() == 0 {
            continue;
        }
        if entry.file_type().is_dir() {
            dir_count += 1;
        } else if entry.file_type().is_file() {
            file_count += 1;
            if let Ok(m) = entry.metadata() {
                total_bytes += m.len();
            }
        }
    }

    Ok(DirSizeResult {
        path: dir_path.to_string(),
        total_bytes,
        file_count,
        dir_count,
    })
}

/// Create an empty or initialized file
pub fn create_file(file_path: &str, initial_content: Option<&str>) -> Result<(), String> {
    let path = Path::new(file_path);
    if path.exists() {
        return Err(format!("File already exists: {}", file_path));
    }

    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }

    fs::write(path, initial_content.unwrap_or("")).map_err(|e| e.to_string())
}

/// Create a new directory
pub fn create_directory(dir_path: &str) -> Result<(), String> {
    let path = Path::new(dir_path);
    if path.exists() {
        return Err(format!("Directory already exists: {}", dir_path));
    }

    fs::create_dir_all(path).map_err(|e| e.to_string())
}

/// Rename a file or directory
pub fn rename_item(old_path: &str, new_path: &str) -> Result<(), String> {
    let old = Path::new(old_path);
    let new = Path::new(new_path);

    if !old.exists() {
        return Err(format!("Source does not exist: {}", old_path));
    }
    if new.exists() && old_path != new_path {
        return Err(format!("Target already exists: {}", new_path));
    }

    fs::rename(old, new).map_err(|e| e.to_string())
}

/// Execute batch renaming
pub fn batch_rename(operations: Vec<RenameOperation>) -> Result<BatchRenameResult, String> {
    let mut succeeded = Vec::new();
    let mut failed = Vec::new();

    for op in operations {
        let old = Path::new(&op.old_path);
        let new = Path::new(&op.new_path);

        if !old.exists() {
            failed.push((op.old_path.clone(), "Source not found".to_string()));
            continue;
        }

        if new.exists() && op.old_path != op.new_path {
            failed.push((op.old_path.clone(), "Destination already exists".to_string()));
            continue;
        }

        match fs::rename(old, new) {
            Ok(_) => succeeded.push(op.new_path),
            Err(e) => failed.push((op.old_path, e.to_string())),
        }
    }

    Ok(BatchRenameResult { succeeded, failed })
}

/// Delete items to native OS Trash or permanently
pub fn delete_items(paths: Vec<String>, permanent: bool) -> Result<(), String> {
    if permanent {
        crate::trash::permanently_delete(&paths)
    } else {
        crate::trash::move_to_trash(&paths)
    }
}

/// Duplicate a file or directory with automatic naming
pub fn duplicate_item(source_path: &str) -> Result<String, String> {
    let src = Path::new(source_path);
    if !src.exists() {
        return Err(format!("Source does not exist: {}", source_path));
    }

    let parent = src.parent().unwrap_or_else(|| Path::new("."));
    let stem = src
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "copy".to_string());
    let ext = src.extension().map(|e| e.to_string_lossy().to_string());

    let mut counter = 1;
    let new_path = loop {
        let new_name = match &ext {
            Some(e) => {
                if counter == 1 {
                    format!("{} copy.{}", stem, e)
                } else {
                    format!("{} copy {}.{}", stem, counter, e)
                }
            }
            None => {
                if counter == 1 {
                    format!("{} copy", stem)
                } else {
                    format!("{} copy {}", stem, counter)
                }
            }
        };

        let target = parent.join(new_name);
        if !target.exists() {
            break target;
        }
        counter += 1;
    };

    if src.is_dir() {
        copy_dir_recursive(src, &new_path)?;
    } else {
        fs::copy(src, &new_path).map_err(|e| e.to_string())?;
    }

    Ok(new_path.to_string_lossy().to_string())
}

/// Recursive directory copy helper
pub fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    if !dst.exists() {
        fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    }

    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_type = entry.file_type().map_err(|e| e.to_string())?;
        let target_path = dst.join(entry.file_name());

        if entry_type.is_dir() {
            copy_dir_recursive(&entry.path(), &target_path)?;
        } else {
            fs::copy(entry.path(), target_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/// Copy files or directories to destination directory
pub fn copy_items(sources: Vec<String>, destination_dir: String, overwrite: bool) -> Result<Vec<String>, String> {
    let dest_path = Path::new(&destination_dir);
    if !dest_path.is_dir() {
        return Err(format!("Destination is not a directory: {}", destination_dir));
    }

    let mut copied = Vec::new();

    for src_str in sources {
        let src = Path::new(&src_str);
        if !src.exists() {
            continue;
        }

        let file_name = match src.file_name() {
            Some(n) => n,
            None => continue,
        };

        let target = dest_path.join(file_name);

        if target.exists() && !overwrite {
            return Err(format!("File already exists: {}", target.to_string_lossy()));
        }

        if src.is_dir() {
            copy_dir_recursive(src, &target)?;
        } else {
            fs::copy(src, &target).map_err(|e| e.to_string())?;
        }

        copied.push(target.to_string_lossy().to_string());
    }

    Ok(copied)
}

/// Move files or directories to destination directory
pub fn move_items(sources: Vec<String>, destination_dir: String, overwrite: bool) -> Result<Vec<String>, String> {
    let dest_path = Path::new(&destination_dir);
    if !dest_path.is_dir() {
        return Err(format!("Destination is not a directory: {}", destination_dir));
    }

    let mut moved = Vec::new();

    for src_str in sources {
        let src = Path::new(&src_str);
        if !src.exists() {
            continue;
        }

        let file_name = match src.file_name() {
            Some(n) => n,
            None => continue,
        };

        let target = dest_path.join(file_name);

        if target.exists() && !overwrite && src != target {
            return Err(format!("File already exists: {}", target.to_string_lossy()));
        }

        // Try direct rename first (fast on same filesystem)
        if fs::rename(src, &target).is_err() {
            // Fallback for cross-device moves: copy then delete
            if src.is_dir() {
                copy_dir_recursive(src, &target)?;
                fs::remove_dir_all(src).map_err(|e| e.to_string())?;
            } else {
                fs::copy(src, &target).map_err(|e| e.to_string())?;
                fs::remove_file(src).map_err(|e| e.to_string())?;
            }
        }

        moved.push(target.to_string_lossy().to_string());
    }

    Ok(moved)
}

/// Create a symbolic link
pub fn create_symlink(target: &str, link_path: &str) -> Result<(), String> {
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(target, link_path).map_err(|e| e.to_string())
    }
    #[cfg(windows)]
    {
        let t = Path::new(target);
        if t.is_dir() {
            std::os::windows::fs::symlink_dir(target, link_path).map_err(|e| e.to_string())
        } else {
            std::os::windows::fs::symlink_file(target, link_path).map_err(|e| e.to_string())
        }
    }
}

/// Read text preview up to max_bytes
pub fn read_text_preview(file_path: &str, max_bytes: usize) -> Result<String, String> {
    let path = Path::new(file_path);
    if !path.is_file() {
        return Err("Not a regular file".to_string());
    }

    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let slice_len = std::cmp::min(bytes.len(), max_bytes);
    let slice = &bytes[..slice_len];

    String::from_utf8(slice.to_vec())
        .or_else(|_| Ok(String::from_utf8_lossy(slice).to_string()))
}

/// Read file as base64 data URI (capped at 25MB to prevent memory exhaustion)
pub fn read_file_base64(file_path: &str) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64_STANDARD};
    let path = Path::new(file_path);
    if !path.is_file() {
        return Err("Not a regular file".to_string());
    }

    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    if meta.len() > 25 * 1024 * 1024 {
        return Err("File is too large for inline preview (max 25 MB)".to_string());
    }

    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let b64 = BASE64_STANDARD.encode(&bytes);
    let ext = path.extension().map(|e| e.to_string_lossy().to_string());
    let mime = crate::util::detect_mime_type(ext.as_deref());
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn get_unique_temp_dir(prefix: &str) -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let pid = std::process::id();
        let name = format!("{}_{}_{}", prefix, pid, nanos);
        let dir = std::env::temp_dir().join(name);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn test_create_and_list_dir() {
        let temp_dir = get_unique_temp_dir("foldale_test_dir");

        let test_file = temp_dir.join("hello.txt");
        create_file(&test_file.to_string_lossy(), Some("Hello Foldale!"))
            .expect("Failed to create file");
        assert!(test_file.exists());

        let listing = list_directory(&temp_dir.to_string_lossy(), true)
            .expect("Failed to list directory");
        assert_eq!(listing.total_files, 1);
        assert_eq!(listing.entries[0].name, "hello.txt");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_duplicate_and_rename() {
        let temp_dir = get_unique_temp_dir("foldale_test_dup");

        let orig_file = temp_dir.join("sample.txt");
        create_file(&orig_file.to_string_lossy(), Some("Sample content")).unwrap();

        let dup_path = duplicate_item(&orig_file.to_string_lossy()).unwrap();
        assert!(Path::new(&dup_path).exists());
        assert!(dup_path.contains("sample copy.txt"));

        let renamed_file = temp_dir.join("renamed.txt");
        rename_item(&orig_file.to_string_lossy(), &renamed_file.to_string_lossy()).unwrap();
        assert!(renamed_file.exists());
        assert!(!orig_file.exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_calculate_dir_size() {
        let temp_dir = get_unique_temp_dir("foldale_test_size");

        let f1 = temp_dir.join("f1.bin");
        fs::write(&f1, vec![0u8; 1024]).unwrap();

        let sub_dir = temp_dir.join("sub");
        create_directory(&sub_dir.to_string_lossy()).unwrap();
        let f2 = sub_dir.join("f2.bin");
        fs::write(&f2, vec![0u8; 2048]).unwrap();

        let res = calculate_dir_size(&temp_dir.to_string_lossy()).unwrap();
        assert_eq!(res.file_count, 2);
        assert_eq!(res.dir_count, 1);
        assert_eq!(res.total_bytes, 3072);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
