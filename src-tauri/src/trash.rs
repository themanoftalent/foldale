//! Move items to the system Trash and put them back.
//!
//! On macOS this calls `-[NSFileManager trashItemAtURL:resultingItemURL:error:]`,
//! which returns the item's location inside the Trash. Keeping that location is
//! what makes "Undo Move to Trash" possible. Other platforms fall back to the
//! `trash` crate, where restore is left to the OS file manager.

use std::fs;
use std::path::Path;

use crate::models::{TrashResult, TrashedItem};
use crate::util::{entry_exists, is_protected_path};

#[cfg(target_os = "macos")]
fn trash_native(path: &Path) -> Result<Option<String>, String> {
    use objc2_foundation::{NSFileManager, NSString, NSURL};

    let path_str = path.to_string_lossy();
    let ns_path = NSString::from_str(&path_str);
    let url = NSURL::fileURLWithPath(&ns_path);
    let manager = NSFileManager::defaultManager();
    let mut resulting: Option<objc2::rc::Retained<NSURL>> = None;
    #[allow(unused_unsafe)]
    let res = unsafe { manager.trashItemAtURL_resultingItemURL_error(&url, Some(&mut resulting)) };
    match res {
        Ok(()) => Ok(resulting
            .and_then(|u| unsafe { u.path() })
            .map(|p| p.to_string())),
        Err(err) => Err(err.localizedDescription().to_string()),
    }
}

#[cfg(not(target_os = "macos"))]
fn trash_native(path: &Path) -> Result<Option<String>, String> {
    trash::delete(path).map(|_| None).map_err(|e| e.to_string())
}

pub fn trash_one(path: &Path) -> Result<TrashedItem, String> {
    if is_protected_path(path) {
        return Err(format!("\"{}\" is a protected system location.", path.display()));
    }
    if !entry_exists(path) {
        return Err("The item no longer exists.".into());
    }
    let trashed = trash_native(path)?;
    Ok(TrashedItem {
        original: path.to_string_lossy().to_string(),
        trashed,
    })
}

pub fn trash_items(paths: &[String]) -> TrashResult {
    let mut res = TrashResult { items: vec![], errors: vec![] };
    for p in paths {
        match trash_one(Path::new(p)) {
            Ok(item) => res.items.push(item),
            Err(e) => res.errors.push((p.clone(), e)),
        }
    }
    res
}

/// Put trashed items back where they came from. Refuses to overwrite anything.
pub fn restore_items(items: &[TrashedItem]) -> Vec<(String, String)> {
    let mut errors = Vec::new();
    for it in items {
        let Some(trashed) = &it.trashed else {
            errors.push((
                it.original.clone(),
                "This item can only be restored from the Trash in Finder (Put Back).".into(),
            ));
            continue;
        };
        let from = Path::new(trashed);
        let to = Path::new(&it.original);
        if !entry_exists(from) {
            errors.push((it.original.clone(), "The item is no longer in the Trash.".into()));
            continue;
        }
        if entry_exists(to) {
            errors.push((
                it.original.clone(),
                "Another item now has the same name in the original location.".into(),
            ));
            continue;
        }
        if let Some(parent) = to.parent() {
            if let Err(e) = fs::create_dir_all(parent) {
                errors.push((it.original.clone(), e.to_string()));
                continue;
            }
        }
        if let Err(e) = fs::rename(from, to) {
            errors.push((it.original.clone(), e.to_string()));
        }
    }
    errors
}

/// Irreversible deletion. The UI asks for confirmation before calling this.
pub fn delete_permanently(paths: &[String]) -> Vec<(String, String)> {
    let mut errors = Vec::new();
    for p in paths {
        let path = Path::new(p);
        if is_protected_path(path) {
            errors.push((p.clone(), "Protected system location.".into()));
            continue;
        }
        let meta = match fs::symlink_metadata(path) {
            Ok(m) => m,
            Err(_) => continue, // already gone
        };
        // symlink_metadata: a symlink to a folder is removed as a link, never followed.
        let r = if meta.is_dir() { fs::remove_dir_all(path) } else { fs::remove_file(path) };
        if let Err(e) = r {
            errors.push((p.clone(), e.to_string()));
        }
    }
    errors
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn permanent_delete_removes_broken_symlink_and_dirs() {
        let t = tempfile::tempdir().unwrap();
        let d = t.path().join("d");
        fs::create_dir_all(d.join("x")).unwrap();
        #[cfg(unix)]
        std::os::unix::fs::symlink(t.path().join("missing"), t.path().join("l")).unwrap();
        let errs = delete_permanently(&[
            d.to_string_lossy().into(),
            t.path().join("l").to_string_lossy().into(),
        ]);
        assert!(errs.is_empty(), "{errs:?}");
        assert!(!d.exists());
        assert!(!entry_exists(&t.path().join("l")));
    }

    #[test]
    fn permanent_delete_of_symlink_keeps_target() {
        #[cfg(unix)]
        {
            let t = tempfile::tempdir().unwrap();
            let real = t.path().join("real");
            fs::create_dir_all(&real).unwrap();
            fs::write(real.join("keep.txt"), "k").unwrap();
            let link = t.path().join("link");
            std::os::unix::fs::symlink(&real, &link).unwrap();
            assert!(delete_permanently(&[link.to_string_lossy().into()]).is_empty());
            assert!(real.join("keep.txt").exists());
        }
    }

    #[test]
    fn refuses_protected_locations() {
        let home = dirs::home_dir().unwrap().to_string_lossy().to_string();
        assert_eq!(delete_permanently(&[home.clone()]).len(), 1);
        assert!(trash_one(Path::new(&home)).is_err());
        assert!(trash_one(Path::new("/")).is_err());
    }

    #[test]
    fn restore_refuses_to_overwrite() {
        let t = tempfile::tempdir().unwrap();
        let fake_trash = t.path().join("trashed.txt");
        let original = t.path().join("orig.txt");
        fs::write(&fake_trash, "old").unwrap();
        fs::write(&original, "new").unwrap();
        let errs = restore_items(&[TrashedItem {
            original: original.to_string_lossy().into(),
            trashed: Some(fake_trash.to_string_lossy().into()),
        }]);
        assert_eq!(errs.len(), 1);
        assert_eq!(fs::read_to_string(&original).unwrap(), "new");
    }

    /// Exercises the real macOS Trash. Ignored by default because it puts a file in
    /// the user's Trash for a moment; run with `cargo test -- --ignored`.
    #[test]
    #[ignore]
    fn real_trash_round_trip() {
        let dir = dirs::home_dir().unwrap().join(".foldale").join("trash-test");
        fs::create_dir_all(&dir).unwrap();
        let f = dir.join(format!("foldale-trash-test-{}.txt", std::process::id()));
        fs::write(&f, "restore me").unwrap();
        let item = trash_one(&f).unwrap();
        assert!(!f.exists());
        if item.trashed.is_some() {
            assert!(restore_items(&[item]).is_empty());
            assert_eq!(fs::read_to_string(&f).unwrap(), "restore me");
        }
        let _ = fs::remove_dir_all(&dir);
    }
}
