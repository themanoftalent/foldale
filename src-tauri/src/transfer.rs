use std::fs;
use std::path::Path;
use crate::models::{ConflictItem, ConflictPolicy};
use crate::trash;
use crate::util;

/// Inspect sources and destination to detect any existing name collisions
pub fn check_conflicts(sources: &[String], destination_dir: &str) -> Result<Vec<ConflictItem>, String> {
    let dest_dir = Path::new(destination_dir);
    if !dest_dir.is_dir() {
        return Err(format!("Destination directory does not exist: {}", destination_dir));
    }

    let mut conflicts = Vec::new();

    for src_str in sources {
        let src = Path::new(src_str);
        if !util::path_or_symlink_exists(src) {
            continue;
        }

        let name = match src.file_name() {
            Some(n) => n,
            None => continue,
        };

        let target = dest_dir.join(name);

        if util::path_or_symlink_exists(&target) {
            let src_meta = fs::symlink_metadata(src).ok();
            let target_meta = fs::symlink_metadata(&target).ok();

            conflicts.push(ConflictItem {
                source_path: src_str.clone(),
                destination_path: target.to_string_lossy().to_string(),
                is_dir: src_meta.as_ref().map(|m| m.is_dir()).unwrap_or(false),
                source_size: src_meta.as_ref().map(|m| m.len()).unwrap_or(0),
                target_size: target_meta.as_ref().map(|m| m.len()).unwrap_or(0),
                source_modified: src_meta.and_then(|m| m.modified().ok()).and_then(|t| {
                    t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_secs() as i64)
                }),
                target_modified: target_meta.and_then(|m| m.modified().ok()).and_then(|t| {
                    t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| d.as_secs() as i64)
                }),
            });
        }
    }

    Ok(conflicts)
}

/// Recursively copy directory tree with descent protection
pub fn copy_dir_safe(src: &Path, dst: &Path) -> Result<(), String> {
    if util::is_descendant_of(dst, src) {
        return Err(format!(
            "Cannot copy directory '{}' into its own subdirectory '{}'",
            src.to_string_lossy(),
            dst.to_string_lossy()
        ));
    }

    if !dst.exists() {
        fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    }

    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_type = entry.file_type().map_err(|e| e.to_string())?;
        let target_path = dst.join(entry.file_name());

        if entry_type.is_dir() {
            copy_dir_safe(&entry.path(), &target_path)?;
        } else {
            fs::copy(entry.path(), target_path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/// Perform copy operations with conflict resolution policy and safety guards
pub fn copy_items_with_policy(
    sources: &[String],
    destination_dir: &str,
    policy: ConflictPolicy,
) -> Result<Vec<(String, String)>, String> {
    let dest_dir = Path::new(destination_dir);
    if !dest_dir.is_dir() {
        return Err(format!("Destination directory does not exist: {}", destination_dir));
    }

    let mut successful_ops = Vec::new();

    for src_str in sources {
        let src = Path::new(src_str);
        if !util::path_or_symlink_exists(src) {
            continue;
        }

        let name = match src.file_name() {
            Some(n) => n,
            None => continue,
        };

        let mut target = dest_dir.join(name);

        // Check if copying onto itself (e.g. paste into same folder)
        if src == target {
            target = util::generate_non_colliding_path(&target);
        } else if util::path_or_symlink_exists(&target) {
            match policy {
                ConflictPolicy::Skip => continue,
                ConflictPolicy::KeepBoth => {
                    target = util::generate_non_colliding_path(&target);
                }
                ConflictPolicy::Replace => {
                    // Safe replace: move replaced file to Trash instead of silent destroying
                    let _ = trash::move_to_trash(&[target.to_string_lossy().to_string()]);
                }
            }
        }

        let is_dir = fs::symlink_metadata(src).map(|m| m.is_dir()).unwrap_or(false);

        if is_dir {
            copy_dir_safe(src, &target)?;
        } else {
            fs::copy(src, &target).map_err(|e| e.to_string())?;
        }

        successful_ops.push((src_str.clone(), target.to_string_lossy().to_string()));
    }

    Ok(successful_ops)
}

/// Perform move operations with conflict resolution policy and safety guards
pub fn move_items_with_policy(
    sources: &[String],
    destination_dir: &str,
    policy: ConflictPolicy,
) -> Result<Vec<(String, String)>, String> {
    let dest_dir = Path::new(destination_dir);
    if !dest_dir.is_dir() {
        return Err(format!("Destination directory does not exist: {}", destination_dir));
    }

    let mut successful_ops = Vec::new();

    for src_str in sources {
        let src = Path::new(src_str);
        if !util::path_or_symlink_exists(src) {
            continue;
        }

        let name = match src.file_name() {
            Some(n) => n,
            None => continue,
        };

        let mut target = dest_dir.join(name);

        // Same folder move is a no-op
        if src == target {
            continue;
        }

        let is_dir = fs::symlink_metadata(src).map(|m| m.is_dir()).unwrap_or(false);

        // Guard against moving a folder into its own subfolder
        if is_dir && util::is_descendant_of(dest_dir, src) {
            return Err(format!(
                "Cannot move directory '{}' into its own subdirectory '{}'",
                src_str,
                destination_dir
            ));
        }

        if util::path_or_symlink_exists(&target) {
            match policy {
                ConflictPolicy::Skip => continue,
                ConflictPolicy::KeepBoth => {
                    target = util::generate_non_colliding_path(&target);
                }
                ConflictPolicy::Replace => {
                    // Safe replace: move existing item to Trash
                    let _ = trash::move_to_trash(&[target.to_string_lossy().to_string()]);
                }
            }
        }

        // Try fast atomic rename first
        if fs::rename(src, &target).is_err() {
            // Cross-device fallback: copy then remove source
            if is_dir {
                copy_dir_safe(src, &target)?;
                fs::remove_dir_all(src).map_err(|e| e.to_string())?;
            } else {
                fs::copy(src, &target).map_err(|e| e.to_string())?;
                fs::remove_file(src).map_err(|e| e.to_string())?;
            }
        }

        successful_ops.push((src_str.clone(), target.to_string_lossy().to_string()));
    }

    Ok(successful_ops)
}
