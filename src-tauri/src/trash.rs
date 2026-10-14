use std::fs;
use std::path::Path;
use crate::util;

/// Move items to the native operating system Trash (Recycle Bin)
pub fn move_to_trash(paths: &[String]) -> Result<(), String> {
    let mut errs = Vec::new();
    for p in paths {
        let path = Path::new(p);
        if !util::path_or_symlink_exists(path) {
            continue;
        }

        // Use trash crate for native macOS / Windows / Linux trash
        if let Err(e) = trash::delete(path) {
            errs.push(format!("{}: {}", p, e));
        }
    }

    if errs.is_empty() {
        Ok(())
    } else {
        Err(errs.join("; "))
    }
}

/// Permanently delete items without going to Trash.
/// Correctly removes broken symlinks which fail `path.exists()`.
pub fn permanently_delete(paths: &[String]) -> Result<(), String> {
    let mut errs = Vec::new();

    for p in paths {
        let path = Path::new(p);
        let meta = match fs::symlink_metadata(path) {
            Ok(m) => m,
            Err(_) => continue, // Does not exist
        };

        let res = if meta.file_type().is_symlink() || meta.is_file() {
            fs::remove_file(path).map_err(|e| e.to_string())
        } else if meta.is_dir() {
            fs::remove_dir_all(path).map_err(|e| e.to_string())
        } else {
            fs::remove_file(path).map_err(|e| e.to_string())
        };

        if let Err(e) = res {
            errs.push(format!("{}: {}", p, e));
        }
    }

    if errs.is_empty() {
        Ok(())
    } else {
        Err(errs.join("; "))
    }
}
