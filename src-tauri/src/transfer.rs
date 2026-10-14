//! Copy and move with explicit conflict resolution, progress, cancellation and
//! enough bookkeeping for the UI to undo the operation.
//!
//! Safety rules enforced here, independent of the UI:
//! * An existing destination item is never overwritten in place. "Replace" moves it
//!   to the Trash first, so it can be restored.
//! * A folder can never be copied or moved into itself or one of its descendants.
//! * Copying an item into its own folder produces "name copy" instead of touching it.
//! * A partially written target is removed when a copy fails half way.

use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Instant;
use walkdir::WalkDir;

use crate::models::{
    JobProgress, PathPair, Resolution, TransferConflict, TransferOp, TransferPlan,
    TransferRequest, TransferResult, TransferredItem,
};
use crate::trash;
use crate::util::{duplicate_name, entry_exists, is_within, same_file, time_to_timestamp, unique_name};

fn name_of(p: &Path) -> String {
    p.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default()
}

fn parent_matches(src: &Path, dest: &Path) -> bool {
    match src.parent() {
        Some(par) => {
            let a = par.canonicalize().unwrap_or_else(|_| par.to_path_buf());
            let b = dest.canonicalize().unwrap_or_else(|_| dest.to_path_buf());
            a == b
        }
        None => false,
    }
}

/// Recursively copy `src` to `dst` (which must not exist). Symlinks are recreated, not
/// followed. `on_file` receives each copied file's size and returns `false` to cancel.
pub fn copy_tree(
    src: &Path,
    dst: &Path,
    on_file: &mut dyn FnMut(u64) -> bool,
) -> io::Result<()> {
    if entry_exists(dst) {
        return Err(io::Error::new(io::ErrorKind::AlreadyExists, "destination exists"));
    }
    let meta = fs::symlink_metadata(src)?;
    let ft = meta.file_type();
    if ft.is_symlink() {
        let target = fs::read_link(src)?;
        #[cfg(unix)]
        std::os::unix::fs::symlink(&target, dst)?;
        #[cfg(windows)]
        {
            if src.is_dir() {
                std::os::windows::fs::symlink_dir(&target, dst)?;
            } else {
                std::os::windows::fs::symlink_file(&target, dst)?;
            }
        }
        if !on_file(0) {
            return Err(io::Error::new(io::ErrorKind::Interrupted, "cancelled"));
        }
        return Ok(());
    }
    if ft.is_dir() {
        fs::create_dir(dst)?;
        for entry in fs::read_dir(src)? {
            let entry = entry?;
            copy_tree(&entry.path(), &dst.join(entry.file_name()), on_file)?;
        }
        let _ = fs::set_permissions(dst, meta.permissions());
        return Ok(());
    }
    // std::fs::copy uses clonefile/fcopyfile on macOS, which is instant on APFS
    // and keeps extended attributes.
    let n = fs::copy(src, dst)?;
    if !on_file(n) {
        return Err(io::Error::new(io::ErrorKind::Interrupted, "cancelled"));
    }
    Ok(())
}

fn remove_any(p: &Path) -> io::Result<()> {
    let m = fs::symlink_metadata(p)?;
    if m.is_dir() {
        fs::remove_dir_all(p)
    } else {
        fs::remove_file(p)
    }
}

fn is_cross_device(e: &io::Error) -> bool {
    #[cfg(unix)]
    {
        e.raw_os_error() == Some(libc::EXDEV)
    }
    #[cfg(not(unix))]
    {
        let _ = e;
        true
    }
}

fn count_tree(p: &Path) -> (u64, u64) {
    let (mut items, mut bytes) = (0u64, 0u64);
    for e in WalkDir::new(p).follow_links(false).into_iter().filter_map(|e| e.ok()) {
        items += 1;
        if e.file_type().is_file() {
            bytes += e.metadata().map(|m| m.len()).unwrap_or(0);
        }
    }
    (items, bytes)
}

pub fn plan_transfer(op: TransferOp, sources: &[String], destination: &str) -> Result<TransferPlan, String> {
    let dest = Path::new(destination);
    if !dest.is_dir() {
        return Err(format!("\"{}\" is not a folder.", destination));
    }
    let mut plan = TransferPlan {
        op,
        destination: destination.to_string(),
        conflicts: vec![],
        blocked: vec![],
        noop: vec![],
        total_items: 0,
        total_bytes: 0,
    };
    for s in sources {
        let src = Path::new(s);
        let src_meta = match fs::symlink_metadata(src) {
            Ok(m) => m,
            Err(_) => {
                plan.blocked.push((s.clone(), "The item no longer exists.".into()));
                continue;
            }
        };
        if src_meta.is_dir() && is_within(dest, src) {
            plan.blocked.push((
                s.clone(),
                format!("\"{}\" cannot be placed inside itself.", name_of(src)),
            ));
            continue;
        }
        if parent_matches(src, dest) {
            if op == TransferOp::Move {
                plan.noop.push(s.clone());
                continue;
            }
            // Copy into the same folder: always a "copy" duplicate, never a conflict.
        } else {
            let target = dest.join(name_of(src));
            if let Ok(tm) = fs::symlink_metadata(&target) {
                plan.conflicts.push(TransferConflict {
                    source: s.clone(),
                    target: target.to_string_lossy().to_string(),
                    source_is_dir: src_meta.is_dir(),
                    target_is_dir: tm.is_dir(),
                    source_size: if src_meta.is_dir() { 0 } else { src_meta.len() },
                    target_size: if tm.is_dir() { 0 } else { tm.len() },
                    source_modified: time_to_timestamp(src_meta.modified()),
                    target_modified: time_to_timestamp(tm.modified()),
                });
            }
        }
        let (i, b) = count_tree(src);
        plan.total_items += i;
        plan.total_bytes += b;
    }
    Ok(plan)
}

pub struct ProgressSink<'a> {
    pub emit: &'a dyn Fn(&JobProgress),
    pub cancel: &'a AtomicBool,
}

pub fn run_transfer(req: TransferRequest, sink: ProgressSink) -> Result<TransferResult, String> {
    let dest = PathBuf::from(&req.destination);
    if !dest.is_dir() {
        return Err(format!("\"{}\" is not a folder.", req.destination));
    }
    let mut result = TransferResult {
        job_id: req.job_id.clone(),
        op: req.op,
        items: vec![],
        replaced: vec![],
        skipped: vec![],
        errors: vec![],
        cancelled: false,
    };

    let (mut total_items, mut total_bytes) = (0u64, 0u64);
    for s in &req.sources {
        let (i, b) = count_tree(Path::new(s));
        total_items += i;
        total_bytes += b;
    }
    let mut progress = JobProgress {
        job_id: req.job_id.clone(),
        done_items: 0,
        total_items,
        done_bytes: 0,
        total_bytes,
        current: String::new(),
    };
    let mut last_emit = Instant::now();
    (sink.emit)(&progress);

    for s in &req.sources {
        if sink.cancel.load(Ordering::Relaxed) {
            result.cancelled = true;
            break;
        }
        let src = PathBuf::from(s);
        let src_meta = match fs::symlink_metadata(&src) {
            Ok(m) => m,
            Err(_) => {
                result.errors.push((s.clone(), "The item no longer exists.".into()));
                continue;
            }
        };
        if src_meta.is_dir() && is_within(&dest, &src) {
            result.errors.push((s.clone(), format!("\"{}\" cannot be placed inside itself.", name_of(&src))));
            continue;
        }
        let same_dir = parent_matches(&src, &dest);
        if same_dir && req.op == TransferOp::Move {
            result.skipped.push(s.clone());
            continue;
        }

        let base = name_of(&src);
        let mut target = dest.join(&base);
        if same_dir {
            target = dest.join(duplicate_name(&dest, &base));
        } else if entry_exists(&target) {
            match req.resolutions.get(s).copied() {
                None | Some(Resolution::Skip) => {
                    result.skipped.push(s.clone());
                    continue;
                }
                Some(Resolution::KeepBoth) => {
                    target = dest.join(unique_name(&dest, &base));
                }
                Some(Resolution::Replace) => {
                    if same_file(&src, &target) {
                        result.skipped.push(s.clone());
                        continue;
                    }
                    match trash::trash_one(&target) {
                        Ok(item) => result.replaced.push(item),
                        Err(e) => {
                            result.errors.push((
                                s.clone(),
                                format!(
                                    "The existing \"{}\" could not be moved to the Trash, so it was left untouched ({}).",
                                    base, e
                                ),
                            ));
                            continue;
                        }
                    }
                }
            }
        }

        progress.current = base.clone();
        let mut on_file = |n: u64| -> bool {
            progress.done_items += 1;
            progress.done_bytes += n;
            if last_emit.elapsed().as_millis() >= 80 {
                (sink.emit)(&progress);
                last_emit = Instant::now();
            }
            !sink.cancel.load(Ordering::Relaxed)
        };

        // `copy_result` covers writing the target; `cleanup_error` covers removing the
        // source after a cross-volume move. They are handled very differently.
        let mut renamed = false;
        let mut cleanup_error: Option<io::Error> = None;
        let copy_result: io::Result<()> = match req.op {
            TransferOp::Copy => copy_tree(&src, &target, &mut on_file),
            TransferOp::Move => match fs::rename(&src, &target) {
                Ok(_) => {
                    renamed = true;
                    Ok(())
                }
                Err(e) if is_cross_device(&e) => {
                    let r = copy_tree(&src, &target, &mut on_file);
                    if r.is_ok() {
                        cleanup_error = remove_any(&src).err();
                    }
                    r
                }
                Err(e) => Err(e),
            },
        };
        if renamed {
            let (i, b) = count_tree(&target);
            progress.done_items += i;
            progress.done_bytes += b;
        }

        match copy_result {
            Ok(_) => {
                if let Some(e) = cleanup_error {
                    // The target is complete; keep it. Report that the original remains.
                    result.errors.push((
                        s.clone(),
                        format!("Copied, but the original could not be fully removed: {}", e),
                    ));
                }
                result.items.push(TransferredItem {
                    source: s.clone(),
                    target: target.to_string_lossy().to_string(),
                });
            }
            Err(e) => {
                // The copy failed part way. The source is untouched (we only delete it
                // after a complete copy), and the target did not exist before this call
                // (or its predecessor went to the Trash), so removing it is safe.
                if entry_exists(&target) && entry_exists(&src) {
                    let _ = remove_any(&target);
                }
                if e.kind() == io::ErrorKind::Interrupted {
                    result.cancelled = true;
                    break;
                }
                result.errors.push((s.clone(), e.to_string()));
            }
        }
    }

    progress.current.clear();
    (sink.emit)(&progress);
    Ok(result)
}

/// Rename/move many items back and forth. Used by undo. Never overwrites.
pub fn rename_many(pairs: &[PathPair]) -> Vec<(String, String)> {
    let mut errors = Vec::new();
    for p in pairs {
        let from = Path::new(&p.from);
        let to = Path::new(&p.to);
        if !entry_exists(from) {
            errors.push((p.from.clone(), "The item no longer exists.".into()));
            continue;
        }
        if entry_exists(to) && !same_file(from, to) {
            errors.push((p.from.clone(), format!("\"{}\" already exists.", name_of(to))));
            continue;
        }
        if let Some(parent) = to.parent() {
            if !parent.exists() {
                if let Err(e) = fs::create_dir_all(parent) {
                    errors.push((p.from.clone(), e.to_string()));
                    continue;
                }
            }
        }
        let res = match fs::rename(from, to) {
            Ok(_) => Ok(()),
            Err(e) if is_cross_device(&e) => copy_tree(from, to, &mut |_| true).and_then(|_| remove_any(from)),
            Err(e) => Err(e),
        };
        if let Err(e) = res {
            errors.push((p.from.clone(), e.to_string()));
        }
    }
    errors
}

/// Map of source -> resolution, convenience for tests.
#[allow(dead_code)]
pub fn resolutions(pairs: &[(&str, Resolution)]) -> HashMap<String, Resolution> {
    pairs.iter().map(|(k, v)| (k.to_string(), *v)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(op: TransferOp, sources: Vec<String>, dest: &Path, res: HashMap<String, Resolution>) -> TransferResult {
        let cancel = AtomicBool::new(false);
        let emit = |_: &JobProgress| {};
        run_transfer(
            TransferRequest {
                job_id: "t".into(),
                op,
                sources,
                destination: dest.to_string_lossy().into(),
                resolutions: res,
            },
            ProgressSink { emit: &emit, cancel: &cancel },
        )
        .unwrap()
    }

    fn s(p: &Path) -> String {
        p.to_string_lossy().to_string()
    }

    #[test]
    fn copy_into_same_folder_makes_copy_and_keeps_original() {
        let t = tempfile::tempdir().unwrap();
        let f = t.path().join("doc.txt");
        fs::write(&f, "original").unwrap();
        let r = run(TransferOp::Copy, vec![s(&f)], t.path(), HashMap::new());
        assert_eq!(r.items.len(), 1);
        assert!(r.items[0].target.ends_with("doc copy.txt"));
        assert_eq!(fs::read_to_string(&f).unwrap(), "original");
    }

    #[test]
    fn conflicts_are_reported_and_default_to_skip() {
        let t = tempfile::tempdir().unwrap();
        let a = t.path().join("a");
        let b = t.path().join("b");
        fs::create_dir_all(&a).unwrap();
        fs::create_dir_all(&b).unwrap();
        fs::write(a.join("x.txt"), "new").unwrap();
        fs::write(b.join("x.txt"), "old").unwrap();
        let plan = plan_transfer(TransferOp::Copy, &[s(&a.join("x.txt"))], &s(&b)).unwrap();
        assert_eq!(plan.conflicts.len(), 1);
        let r = run(TransferOp::Copy, vec![s(&a.join("x.txt"))], &b, HashMap::new());
        assert_eq!(r.skipped.len(), 1);
        assert_eq!(fs::read_to_string(b.join("x.txt")).unwrap(), "old");
    }

    #[test]
    fn keep_both_creates_numbered_name() {
        let t = tempfile::tempdir().unwrap();
        let a = t.path().join("a");
        let b = t.path().join("b");
        fs::create_dir_all(&a).unwrap();
        fs::create_dir_all(&b).unwrap();
        fs::write(a.join("x.txt"), "new").unwrap();
        fs::write(b.join("x.txt"), "old").unwrap();
        let src = s(&a.join("x.txt"));
        let r = run(TransferOp::Copy, vec![src.clone()], &b, resolutions(&[(&src, Resolution::KeepBoth)]));
        assert!(r.items[0].target.ends_with("x 2.txt"));
        assert_eq!(fs::read_to_string(b.join("x.txt")).unwrap(), "old");
        assert_eq!(fs::read_to_string(b.join("x 2.txt")).unwrap(), "new");
    }

    #[test]
    fn folder_into_itself_is_blocked() {
        let t = tempfile::tempdir().unwrap();
        let a = t.path().join("a");
        let inner = a.join("inner");
        fs::create_dir_all(&inner).unwrap();
        let plan = plan_transfer(TransferOp::Move, &[s(&a)], &s(&inner)).unwrap();
        assert_eq!(plan.blocked.len(), 1);
        let r = run(TransferOp::Move, vec![s(&a)], &inner, HashMap::new());
        assert_eq!(r.errors.len(), 1);
        assert!(a.exists() && inner.exists());
        let r = run(TransferOp::Copy, vec![s(&a)], &inner, HashMap::new());
        assert_eq!(r.errors.len(), 1);
        assert_eq!(fs::read_dir(&inner).unwrap().count(), 0);
    }

    #[test]
    fn move_and_undo_round_trip() {
        let t = tempfile::tempdir().unwrap();
        let a = t.path().join("a");
        let b = t.path().join("b");
        fs::create_dir_all(a.join("deep")).unwrap();
        fs::create_dir_all(&b).unwrap();
        fs::write(a.join("deep/f.txt"), "z").unwrap();
        let r = run(TransferOp::Move, vec![s(&a)], &b, HashMap::new());
        assert!(!a.exists());
        assert!(b.join("a/deep/f.txt").exists());
        let back: Vec<PathPair> = r.items.iter().map(|i| PathPair { from: i.target.clone(), to: i.source.clone() }).collect();
        assert!(rename_many(&back).is_empty());
        assert!(a.join("deep/f.txt").exists());
    }

    #[test]
    fn copy_preserves_symlinks_without_following() {
        #[cfg(unix)]
        {
            let t = tempfile::tempdir().unwrap();
            let src = t.path().join("src");
            fs::create_dir_all(&src).unwrap();
            std::os::unix::fs::symlink("/does/not/exist", src.join("dangling")).unwrap();
            let dst = t.path().join("dst");
            copy_tree(&src, &dst, &mut |_| true).unwrap();
            assert!(fs::symlink_metadata(dst.join("dangling")).unwrap().file_type().is_symlink());
        }
    }

    #[test]
    fn cancel_stops_and_cleans_up() {
        let t = tempfile::tempdir().unwrap();
        let src = t.path().join("src");
        fs::create_dir_all(&src).unwrap();
        for i in 0..20 {
            fs::write(src.join(format!("{i}.bin")), vec![1u8; 10]).unwrap();
        }
        let dst_dir = t.path().join("out");
        fs::create_dir_all(&dst_dir).unwrap();
        let cancel = AtomicBool::new(true);
        let emit = |_: &JobProgress| {};
        let r = run_transfer(
            TransferRequest { job_id: "c".into(), op: TransferOp::Copy, sources: vec![s(&src)], destination: s(&dst_dir), resolutions: HashMap::new() },
            ProgressSink { emit: &emit, cancel: &cancel },
        )
        .unwrap();
        assert!(r.cancelled);
        assert!(!dst_dir.join("src").exists());
    }

    #[test]
    fn rename_many_never_overwrites() {
        let t = tempfile::tempdir().unwrap();
        fs::write(t.path().join("a"), "A").unwrap();
        fs::write(t.path().join("b"), "B").unwrap();
        let errs = rename_many(&[PathPair { from: s(&t.path().join("a")), to: s(&t.path().join("b")) }]);
        assert_eq!(errs.len(), 1);
        assert_eq!(fs::read_to_string(t.path().join("b")).unwrap(), "B");
    }
}
