//! Directory listing, metadata, creation, renaming and previews.
//! Bulk copy/move/delete lives in `transfer.rs` and `trash.rs`.

use std::collections::HashSet;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::models::{
    BatchRenameResult, DetailedFileInfo, DirSizeResult, DirectoryListing, FileEntry,
    RenameOperation, TextPreview,
};
use crate::util::{
    detect_mime_type, duplicate_name, entry_exists, format_permissions, is_package_extension,
    is_writable_dir, same_file, time_to_timestamp,
};

fn validate_name(name: &str) -> Result<(), String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("The name cannot be empty.".into());
    }
    if trimmed == "." || trimmed == ".." {
        return Err("\".\" and \"..\" are reserved names.".into());
    }
    if name.contains('/') || name.contains('\0') {
        return Err("Names cannot contain \"/\".".into());
    }
    if name.len() > 255 {
        return Err("The name is longer than 255 bytes.".into());
    }
    Ok(())
}

fn file_name_of(p: &Path) -> String {
    p.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| p.to_string_lossy().to_string())
}

fn build_entry(entry_path: &Path, meta: &fs::Metadata) -> FileEntry {
    let file_name = file_name_of(entry_path);
    let is_symlink = meta.file_type().is_symlink();
    let target_meta = if is_symlink { fs::metadata(entry_path).ok() } else { None };
    let broken_symlink = is_symlink && target_meta.is_none();
    let is_dir = if is_symlink {
        target_meta.as_ref().map(|m| m.is_dir()).unwrap_or(false)
    } else {
        meta.is_dir()
    };
    let extension = entry_path
        .extension()
        .map(|e| e.to_string_lossy().to_string());
    let is_package = is_dir && is_package_extension(extension.as_deref());
    let size = if is_dir {
        0
    } else {
        target_meta.as_ref().map(|m| m.len()).unwrap_or(meta.len())
    };
    let (permissions, _) = format_permissions(meta);
    let mime_type = if is_package {
        "application".to_string()
    } else if is_dir {
        "folder".to_string()
    } else {
        detect_mime_type(extension.as_deref())
    };
    FileEntry {
        is_hidden: file_name.starts_with('.'),
        name: file_name,
        path: entry_path.to_string_lossy().to_string(),
        is_dir,
        is_symlink,
        is_package,
        size,
        modified: time_to_timestamp(meta.modified()),
        created: time_to_timestamp(meta.created()),
        readonly: meta.permissions().readonly(),
        extension,
        permissions,
        mime_type,
        symlink_target: if is_symlink {
            fs::read_link(entry_path)
                .ok()
                .map(|p| p.to_string_lossy().to_string())
        } else {
            None
        },
        broken_symlink,
    }
}

pub fn list_directory(dir_path: &str, show_hidden: bool) -> Result<DirectoryListing, String> {
    let path = Path::new(dir_path);
    if !path.exists() {
        return Err(format!("The folder \"{}\" does not exist.", dir_path));
    }
    if !path.is_dir() {
        return Err(format!("\"{}\" is not a folder.", dir_path));
    }
    let canonical = path.canonicalize().unwrap_or_else(|_| PathBuf::from(dir_path));
    let read_dir = fs::read_dir(&canonical).map_err(|e| {
        if e.kind() == std::io::ErrorKind::PermissionDenied {
            format!(
                "Foldale does not have permission to read \"{}\". On macOS, grant access in System Settings › Privacy & Security › Files and Folders (or Full Disk Access).",
                canonical.display()
            )
        } else {
            format!("Could not read \"{}\": {}", canonical.display(), e)
        }
    })?;

    let mut entries = Vec::new();
    let (mut total_files, mut total_dirs, mut total_size, mut unreadable) = (0usize, 0usize, 0u64, 0usize);

    for item in read_dir {
        let entry = match item {
            Ok(e) => e,
            Err(_) => {
                unreadable += 1;
                continue;
            }
        };
        let name = entry.file_name();
        let name_s = name.to_string_lossy();
        if !show_hidden && name_s.starts_with('.') {
            continue;
        }
        let entry_path = entry.path();
        let meta = match fs::symlink_metadata(&entry_path) {
            Ok(m) => m,
            Err(_) => {
                unreadable += 1;
                continue;
            }
        };
        let fe = build_entry(&entry_path, &meta);
        if fe.is_dir && !fe.is_package {
            total_dirs += 1;
        } else {
            total_files += 1;
            total_size += fe.size;
        }
        entries.push(fe);
    }

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(DirectoryListing {
        current_path: canonical.to_string_lossy().to_string(),
        parent_path: canonical.parent().map(|p| p.to_string_lossy().to_string()),
        is_writable: is_writable_dir(&canonical),
        entries,
        total_files,
        total_dirs,
        total_size,
        is_readable: true,
        unreadable_count: unreadable,
    })
}

pub fn get_file_info(file_path: &str) -> Result<DetailedFileInfo, String> {
    let path = Path::new(file_path);
    let meta = fs::symlink_metadata(path).map_err(|e| format!("Cannot read \"{}\": {}", file_path, e))?;
    let fe = build_entry(path, &meta);
    let (_, octal) = format_permissions(&meta);
    let line_count = if !fe.is_dir
        && fe.size < 4 * 1024 * 1024
        && (fe.mime_type == "text" || fe.mime_type == "code")
    {
        fs::read(path)
            .ok()
            .map(|b| String::from_utf8_lossy(&b).lines().count())
    } else {
        None
    };
    #[cfg(unix)]
    let (uid, gid) = {
        use std::os::unix::fs::MetadataExt;
        (Some(meta.uid()), Some(meta.gid()))
    };
    #[cfg(not(unix))]
    let (uid, gid) = (None, None);

    Ok(DetailedFileInfo {
        name: fe.name,
        path: file_path.to_string(),
        is_dir: fe.is_dir,
        is_symlink: fe.is_symlink,
        is_hidden: fe.is_hidden,
        is_package: fe.is_package,
        size: fe.size,
        modified: fe.modified,
        created: fe.created,
        accessed: time_to_timestamp(meta.accessed()),
        permissions: fe.permissions,
        octal_permissions: octal,
        readonly: fe.readonly,
        extension: fe.extension,
        mime_type: fe.mime_type,
        symlink_target: fe.symlink_target,
        line_count,
        owner_uid: uid,
        group_gid: gid,
    })
}

pub fn calculate_dir_size(
    dir_path: &str,
    cancel: Option<&std::sync::atomic::AtomicBool>,
) -> Result<DirSizeResult, String> {
    let path = Path::new(dir_path);
    if !path.is_dir() {
        return Err("Not a folder.".to_string());
    }
    let (mut total_bytes, mut file_count, mut dir_count) = (0u64, 0u64, 0u64);
    for entry in WalkDir::new(path).follow_links(false).into_iter().filter_map(|e| e.ok()) {
        if let Some(c) = cancel {
            if c.load(std::sync::atomic::Ordering::Relaxed) {
                return Err("Cancelled".into());
            }
        }
        if entry.depth() == 0 {
            continue;
        }
        let ft = entry.file_type();
        if ft.is_dir() {
            dir_count += 1;
        } else {
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

pub fn create_file(file_path: &str, initial_content: Option<&str>) -> Result<(), String> {
    let path = Path::new(file_path);
    validate_name(&file_name_of(path))?;
    if entry_exists(path) {
        return Err(format!("An item named \"{}\" already exists.", file_name_of(path)));
    }
    let parent = path.parent().ok_or("Invalid location.")?;
    if !parent.is_dir() {
        return Err("The destination folder does not exist.".into());
    }
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .and_then(|mut f| std::io::Write::write_all(&mut f, initial_content.unwrap_or("").as_bytes()))
        .map_err(|e| format!("Could not create the file: {}", e))
}

pub fn create_directory(dir_path: &str) -> Result<(), String> {
    let path = Path::new(dir_path);
    validate_name(&file_name_of(path))?;
    if entry_exists(path) {
        return Err(format!("An item named \"{}\" already exists.", file_name_of(path)));
    }
    let parent = path.parent().ok_or("Invalid location.")?;
    if !parent.is_dir() {
        return Err("The destination folder does not exist.".into());
    }
    fs::create_dir(path).map_err(|e| format!("Could not create the folder: {}", e))
}

pub fn rename_item(old_path: &str, new_path: &str) -> Result<(), String> {
    let old = Path::new(old_path);
    let new = Path::new(new_path);
    if !entry_exists(old) {
        return Err(format!("\"{}\" no longer exists.", file_name_of(old)));
    }
    validate_name(&file_name_of(new))?;
    if old == new {
        return Ok(());
    }
    // A case-only rename ("photo.jpg" -> "Photo.jpg") on a case-insensitive volume
    // reports the target as existing because it is the same file.
    if entry_exists(new) && !same_file(old, new) {
        return Err(format!("An item named \"{}\" already exists.", file_name_of(new)));
    }
    fs::rename(old, new).map_err(|e| format!("Could not rename: {}", e))
}

/// Renames many items atomically per item, safely handling swaps and chains
/// (a -> b, b -> a) by staging through temporary names in the same folder.
pub fn batch_rename(operations: Vec<RenameOperation>) -> Result<BatchRenameResult, String> {
    let ops: Vec<RenameOperation> = operations
        .into_iter()
        .filter(|o| o.old_path != o.new_path)
        .collect();

    let mut failed = Vec::new();
    let sources: HashSet<PathBuf> = ops.iter().map(|o| PathBuf::from(&o.old_path)).collect();
    let mut targets_seen = HashSet::new();
    let mut valid = Vec::new();

    for op in ops {
        let old = PathBuf::from(&op.old_path);
        let new = PathBuf::from(&op.new_path);
        if let Err(e) = validate_name(&file_name_of(&new)) {
            failed.push((op.old_path.clone(), e));
            continue;
        }
        if !entry_exists(&old) {
            failed.push((op.old_path.clone(), "The item no longer exists.".into()));
            continue;
        }
        if !targets_seen.insert(new.to_string_lossy().to_lowercase()) {
            failed.push((op.old_path.clone(), "Two items would receive the same name.".into()));
            continue;
        }
        let collides = entry_exists(&new) && !sources.contains(&new) && !same_file(&old, &new);
        if collides {
            failed.push((
                op.old_path.clone(),
                format!("\"{}\" already exists.", file_name_of(&new)),
            ));
            continue;
        }
        valid.push(op);
    }

    // Phase 1: move every source to a unique temporary name.
    let pid = std::process::id();
    let mut staged: Vec<(RenameOperation, PathBuf)> = Vec::new();
    for (i, op) in valid.into_iter().enumerate() {
        let old = PathBuf::from(&op.old_path);
        let parent = old.parent().map(Path::to_path_buf).unwrap_or_default();
        let tmp = parent.join(format!(".foldale-rename-{}-{}", pid, i));
        match fs::rename(&old, &tmp) {
            Ok(_) => staged.push((op, tmp)),
            Err(e) => failed.push((op.old_path.clone(), e.to_string())),
        }
    }

    // Phase 2: move temporaries to their final names; roll back on failure.
    let mut succeeded = Vec::new();
    for (op, tmp) in staged {
        // Every batch source has been moved aside by now, so anything still at the
        // target is a real, unrelated item. rename(2) would silently replace it.
        if entry_exists(Path::new(&op.new_path)) {
            let _ = fs::rename(&tmp, &op.old_path);
            failed.push((op.old_path.clone(), "The target name is already taken.".into()));
            continue;
        }
        match fs::rename(&tmp, &op.new_path) {
            Ok(_) => succeeded.push(op),
            Err(e) => {
                let _ = fs::rename(&tmp, &op.old_path);
                failed.push((op.old_path.clone(), e.to_string()));
            }
        }
    }

    Ok(BatchRenameResult { succeeded, failed })
}

/// Duplicate each item next to itself ("name copy.ext"). Returns the new paths.
pub fn duplicate_items(paths: &[String]) -> Result<Vec<(String, String)>, String> {
    let mut out = Vec::new();
    for p in paths {
        let src = Path::new(p);
        if !entry_exists(src) {
            continue;
        }
        let parent = src.parent().ok_or("Invalid path")?;
        let target = parent.join(duplicate_name(parent, &file_name_of(src)));
        crate::transfer::copy_tree(src, &target, &mut |_| true)
            .map_err(|e| format!("Could not duplicate \"{}\": {}", file_name_of(src), e))?;
        out.push((p.clone(), target.to_string_lossy().to_string()));
    }
    Ok(out)
}

pub fn create_symlink(target: &str, link_path: &str) -> Result<(), String> {
    if entry_exists(Path::new(link_path)) {
        return Err("An item with that name already exists.".into());
    }
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(target, link_path).map_err(|e| e.to_string())
    }
    #[cfg(windows)]
    {
        if Path::new(target).is_dir() {
            std::os::windows::fs::symlink_dir(target, link_path).map_err(|e| e.to_string())
        } else {
            std::os::windows::fs::symlink_file(target, link_path).map_err(|e| e.to_string())
        }
    }
}

/// Read at most `max_bytes` from the start of a file. Never loads the whole file.
pub fn read_text_preview(file_path: &str, max_bytes: usize) -> Result<TextPreview, String> {
    let path = Path::new(file_path);
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    if !meta.is_file() {
        return Err("Not a regular file.".into());
    }
    let total = meta.len();
    let mut buf = Vec::with_capacity(max_bytes.min(total as usize));
    fs::File::open(path)
        .map_err(|e| e.to_string())?
        .take(max_bytes as u64)
        .read_to_end(&mut buf)
        .map_err(|e| e.to_string())?;
    let sniff = &buf[..buf.len().min(8192)];
    let is_binary = sniff.contains(&0);
    Ok(TextPreview {
        text: if is_binary { String::new() } else { String::from_utf8_lossy(&buf).to_string() },
        truncated: total > buf.len() as u64,
        is_binary,
        total_bytes: total,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_list_and_hidden_filter() {
        let t = tempfile::tempdir().unwrap();
        let dir = t.path().join("box");
        create_directory(&dir.to_string_lossy()).unwrap();
        create_file(&dir.join("hello.txt").to_string_lossy(), Some("hi")).unwrap();
        create_file(&dir.join(".secret").to_string_lossy(), None).unwrap();
        create_directory(&dir.join("sub").to_string_lossy()).unwrap();

        let l = list_directory(&dir.to_string_lossy(), false).unwrap();
        assert_eq!(l.total_files, 1);
        assert_eq!(l.total_dirs, 1);
        assert_eq!(l.entries[0].name, "sub", "folders sort first");
        let l = list_directory(&dir.to_string_lossy(), true).unwrap();
        assert_eq!(l.entries.len(), 3);
        assert!(l.is_writable);
    }

    #[test]
    fn create_refuses_existing_and_bad_names() {
        let t = tempfile::tempdir().unwrap();
        let f = t.path().join("a.txt");
        create_file(&f.to_string_lossy(), Some("1")).unwrap();
        assert!(create_file(&f.to_string_lossy(), Some("2")).is_err());
        assert_eq!(fs::read_to_string(&f).unwrap(), "1", "existing content must survive");
        assert!(create_directory(&t.path().join("..").to_string_lossy()).is_err());
    }

    #[test]
    fn rename_blocks_overwrite_but_allows_case_change() {
        let t = tempfile::tempdir().unwrap();
        let a = t.path().join("a.txt");
        let b = t.path().join("b.txt");
        fs::write(&a, "A").unwrap();
        fs::write(&b, "B").unwrap();
        assert!(rename_item(&a.to_string_lossy(), &b.to_string_lossy()).is_err());
        assert_eq!(fs::read_to_string(&b).unwrap(), "B");
        let upper = t.path().join("A.txt");
        rename_item(&a.to_string_lossy(), &upper.to_string_lossy()).unwrap();
        let names: Vec<String> = fs::read_dir(t.path())
            .unwrap()
            .map(|e| e.unwrap().file_name().to_string_lossy().to_string())
            .collect();
        assert!(names.contains(&"A.txt".to_string()));
    }

    #[test]
    fn batch_rename_handles_swaps() {
        let t = tempfile::tempdir().unwrap();
        let a = t.path().join("1.txt");
        let b = t.path().join("2.txt");
        fs::write(&a, "one").unwrap();
        fs::write(&b, "two").unwrap();
        let r = batch_rename(vec![
            RenameOperation { old_path: a.to_string_lossy().into(), new_path: b.to_string_lossy().into() },
            RenameOperation { old_path: b.to_string_lossy().into(), new_path: a.to_string_lossy().into() },
        ])
        .unwrap();
        assert_eq!(r.succeeded.len(), 2, "{:?}", r.failed);
        assert_eq!(fs::read_to_string(&a).unwrap(), "two");
        assert_eq!(fs::read_to_string(&b).unwrap(), "one");
    }

    #[test]
    fn batch_rename_rejects_collisions_and_duplicates() {
        let t = tempfile::tempdir().unwrap();
        for n in ["a", "b", "keep"] {
            fs::write(t.path().join(n), n).unwrap();
        }
        let p = |n: &str| t.path().join(n).to_string_lossy().to_string();
        let r = batch_rename(vec![
            RenameOperation { old_path: p("a"), new_path: p("keep") },
            RenameOperation { old_path: p("b"), new_path: p("z") },
        ])
        .unwrap();
        assert_eq!(r.failed.len(), 1);
        assert_eq!(fs::read_to_string(t.path().join("keep")).unwrap(), "keep");
        assert!(t.path().join("z").exists());
    }

    #[test]
    fn duplicate_names_like_finder() {
        let t = tempfile::tempdir().unwrap();
        let f = t.path().join("sample.txt");
        fs::write(&f, "x").unwrap();
        let d = duplicate_items(&[f.to_string_lossy().into()]).unwrap();
        assert!(d[0].1.ends_with("sample copy.txt"));
        let d = duplicate_items(&[f.to_string_lossy().into()]).unwrap();
        assert!(d[0].1.ends_with("sample copy 2.txt"));
    }

    #[test]
    fn preview_is_bounded_and_detects_binary() {
        let t = tempfile::tempdir().unwrap();
        let f = t.path().join("big.txt");
        fs::write(&f, "a".repeat(10_000)).unwrap();
        let p = read_text_preview(&f.to_string_lossy(), 100).unwrap();
        assert_eq!(p.text.len(), 100);
        assert!(p.truncated);
        let b = t.path().join("bin");
        fs::write(&b, [0u8, 1, 2, 3]).unwrap();
        assert!(read_text_preview(&b.to_string_lossy(), 100).unwrap().is_binary);
    }

    #[test]
    fn dir_size_counts_recursively() {
        let t = tempfile::tempdir().unwrap();
        fs::write(t.path().join("f1"), vec![0u8; 1024]).unwrap();
        fs::create_dir(t.path().join("sub")).unwrap();
        fs::write(t.path().join("sub/f2"), vec![0u8; 2048]).unwrap();
        let r = calculate_dir_size(&t.path().to_string_lossy(), None).unwrap();
        assert_eq!((r.file_count, r.dir_count, r.total_bytes), (2, 1, 3072));
    }

    #[test]
    fn broken_symlink_is_listed() {
        #[cfg(unix)]
        {
            let t = tempfile::tempdir().unwrap();
            std::os::unix::fs::symlink(t.path().join("nowhere"), t.path().join("link")).unwrap();
            let l = list_directory(&t.path().to_string_lossy(), true).unwrap();
            assert!(l.entries[0].broken_symlink);
        }
    }
}
