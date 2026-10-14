//! ZIP and tar(.gz) support: list, create, extract.
//!
//! Extraction never overwrites anything. Like Archive Utility, an archive with a single
//! top-level folder is extracted as that folder; otherwise its contents go into a new
//! folder named after the archive. Both get a unique name when needed.

use flate2::read::GzDecoder;
use std::collections::HashSet;
use std::fs::{self, File};
use std::io::{self, Read};
use std::path::{Component, Path, PathBuf};
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

use crate::models::ArchiveEntry;
use crate::util::{split_name, unique_name};

#[derive(Debug, Clone, Copy, PartialEq)]
enum Kind {
    Zip,
    Tar,
    TarGz,
}

fn kind_of(path: &Path) -> Option<Kind> {
    let n = path.file_name()?.to_string_lossy().to_ascii_lowercase();
    if n.ends_with(".zip") {
        Some(Kind::Zip)
    } else if n.ends_with(".tar.gz") || n.ends_with(".tgz") {
        Some(Kind::TarGz)
    } else if n.ends_with(".tar") {
        Some(Kind::Tar)
    } else {
        None
    }
}

pub fn is_supported(path: &str) -> bool {
    kind_of(Path::new(path)).is_some()
}

fn open_tar(path: &Path, kind: Kind) -> io::Result<tar::Archive<Box<dyn Read>>> {
    let f = File::open(path)?;
    let reader: Box<dyn Read> = if kind == Kind::TarGz { Box::new(GzDecoder::new(f)) } else { Box::new(f) };
    Ok(tar::Archive::new(reader))
}

pub fn list_archive_contents(archive_path: &str) -> Result<Vec<ArchiveEntry>, String> {
    let path = Path::new(archive_path);
    let kind = kind_of(path).ok_or("Foldale can open .zip, .tar, .tar.gz and .tgz archives.")?;
    match kind {
        Kind::Zip => {
            let mut archive = ZipArchive::new(File::open(path).map_err(|e| e.to_string())?)
                .map_err(|e| format!("Not a valid ZIP archive: {}", e))?;
            let mut out = Vec::with_capacity(archive.len());
            for i in 0..archive.len() {
                let item = archive.by_index_raw(i).map_err(|e| e.to_string())?;
                out.push(ArchiveEntry {
                    name: item.name().to_string(),
                    is_dir: item.is_dir(),
                    size: item.size(),
                    compressed_size: item.compressed_size(),
                    modified: None,
                });
            }
            Ok(out)
        }
        Kind::Tar | Kind::TarGz => {
            let mut ar = open_tar(path, kind).map_err(|e| e.to_string())?;
            let mut out = Vec::new();
            for e in ar.entries().map_err(|e| format!("Not a valid tar archive: {}", e))? {
                let e = e.map_err(|e| e.to_string())?;
                let h = e.header();
                out.push(ArchiveEntry {
                    name: e.path().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
                    is_dir: h.entry_type().is_dir(),
                    size: h.size().unwrap_or(0),
                    compressed_size: 0,
                    modified: h.mtime().ok().map(|m| m as i64),
                });
            }
            Ok(out)
        }
    }
}

/// Create a ZIP archive inside `dest_dir`. Returns the archive path.
/// Symlinks are skipped rather than followed, so archiving cannot escape the selection.
pub fn create_zip_archive(sources: &[String], dest_dir: &str, base_name: &str) -> Result<String, String> {
    let dest = Path::new(dest_dir);
    if !dest.is_dir() {
        return Err("The destination folder does not exist.".into());
    }
    let wanted = if base_name.to_ascii_lowercase().ends_with(".zip") {
        base_name.to_string()
    } else {
        format!("{}.zip", base_name)
    };
    let archive_path = dest.join(unique_name(dest, &wanted));
    let result = (|| -> Result<(), String> {
        let file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&archive_path)
            .map_err(|e| e.to_string())?;
        let mut zip = ZipWriter::new(file);
        let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
        for s in sources {
            let src = Path::new(s);
            if !src.exists() {
                continue;
            }
            let base_dir = src.parent().unwrap_or_else(|| Path::new("/"));
            for entry in WalkDir::new(src).follow_links(false).into_iter() {
                let entry = entry.map_err(|e| e.to_string())?;
                let p = entry.path();
                if p == archive_path {
                    continue;
                }
                let rel = p.strip_prefix(base_dir).map_err(|e| e.to_string())?;
                let name = rel.to_string_lossy().replace('\\', "/");
                let ft = entry.file_type();
                if ft.is_dir() {
                    zip.add_directory(format!("{}/", name), options).map_err(|e| e.to_string())?;
                } else if ft.is_file() {
                    #[cfg(unix)]
                    let opts = {
                        use std::os::unix::fs::PermissionsExt;
                        let mode = entry.metadata().map(|m| m.permissions().mode()).unwrap_or(0o644);
                        options.unix_permissions(mode & 0o777)
                    };
                    #[cfg(not(unix))]
                    let opts = options;
                    zip.start_file(name, opts).map_err(|e| e.to_string())?;
                    let mut f = File::open(p).map_err(|e| e.to_string())?;
                    io::copy(&mut f, &mut zip).map_err(|e| e.to_string())?;
                }
            }
        }
        zip.finish().map_err(|e| e.to_string())?;
        Ok(())
    })();
    if let Err(e) = result {
        let _ = fs::remove_file(&archive_path);
        return Err(format!("Could not create the archive: {}", e));
    }
    Ok(archive_path.to_string_lossy().to_string())
}

fn safe_relative(p: &Path) -> Option<PathBuf> {
    let mut out = PathBuf::new();
    for c in p.components() {
        match c {
            Component::Normal(s) => out.push(s),
            Component::CurDir => {}
            _ => return None, // absolute paths and ".." are rejected
        }
    }
    if out.as_os_str().is_empty() {
        None
    } else {
        Some(out)
    }
}

fn top_level_names(entries: &[PathBuf]) -> HashSet<String> {
    entries
        .iter()
        .filter_map(|p| p.components().next())
        .map(|c| c.as_os_str().to_string_lossy().to_string())
        .filter(|n| n != "__MACOSX")
        .collect()
}

/// Extract into `destination_dir`. Returns the path of the folder that was created.
pub fn extract_archive(archive_path: &str, destination_dir: &str) -> Result<String, String> {
    let path = Path::new(archive_path);
    let dest = Path::new(destination_dir);
    let kind = kind_of(path).ok_or("Foldale can extract .zip, .tar, .tar.gz and .tgz archives.")?;
    if !dest.is_dir() {
        return Err("The destination folder does not exist.".into());
    }

    // Collect safe entry names first to decide the layout.
    let names: Vec<PathBuf> = list_archive_contents(archive_path)?
        .into_iter()
        .filter_map(|e| safe_relative(Path::new(&e.name)))
        .collect();
    if names.is_empty() {
        return Err("The archive is empty.".into());
    }
    let tops = top_level_names(&names);
    let archive_name = path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    let (stem, _) = split_name(&archive_name);

    // `root` is the folder we create; `strip` is the archive prefix mapped onto it.
    let (root, strip): (PathBuf, Option<String>) = if tops.len() == 1 && names.iter().any(|n| n.components().count() > 1) {
        let top = tops.into_iter().next().unwrap();
        (dest.join(unique_name(dest, &top)), Some(top))
    } else {
        (dest.join(unique_name(dest, &stem)), None)
    };
    fs::create_dir(&root).map_err(|e| e.to_string())?;

    let map = |rel: &Path| -> Option<PathBuf> {
        let rel = safe_relative(rel)?;
        if rel.starts_with("__MACOSX") {
            return None;
        }
        match &strip {
            Some(top) => rel.strip_prefix(top).ok().map(|r| root.join(r)),
            None => Some(root.join(rel)),
        }
    };

    let res: Result<(), String> = match kind {
        Kind::Zip => (|| {
            let mut archive = ZipArchive::new(File::open(path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
            for i in 0..archive.len() {
                let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
                let Some(enclosed) = file.enclosed_name() else { continue };
                let Some(out) = map(&enclosed) else { continue };
                if file.is_dir() {
                    fs::create_dir_all(&out).map_err(|e| e.to_string())?;
                    continue;
                }
                if let Some(p) = out.parent() {
                    fs::create_dir_all(p).map_err(|e| e.to_string())?;
                }
                let mut f = fs::OpenOptions::new().write(true).create_new(true).open(&out).map_err(|e| e.to_string())?;
                io::copy(&mut file, &mut f).map_err(|e| e.to_string())?;
                #[cfg(unix)]
                if let Some(mode) = file.unix_mode() {
                    use std::os::unix::fs::PermissionsExt;
                    let _ = fs::set_permissions(&out, fs::Permissions::from_mode(mode & 0o777));
                }
            }
            Ok(())
        })(),
        Kind::Tar | Kind::TarGz => (|| {
            let mut ar = open_tar(path, kind).map_err(|e| e.to_string())?;
            for e in ar.entries().map_err(|e| e.to_string())? {
                let mut e = e.map_err(|e| e.to_string())?;
                let rel = e.path().map_err(|e| e.to_string())?.to_path_buf();
                let et = e.header().entry_type();
                if !(et.is_file() || et.is_dir()) {
                    continue; // skip links, devices and other special entries
                }
                let Some(out) = map(&rel) else { continue };
                if et.is_dir() {
                    fs::create_dir_all(&out).map_err(|e| e.to_string())?;
                    continue;
                }
                if let Some(p) = out.parent() {
                    fs::create_dir_all(p).map_err(|e| e.to_string())?;
                }
                let mut f = fs::OpenOptions::new().write(true).create_new(true).open(&out).map_err(|e| e.to_string())?;
                io::copy(&mut e, &mut f).map_err(|e| e.to_string())?;
            }
            Ok(())
        })(),
    };
    if let Err(e) = res {
        let _ = fs::remove_dir_all(&root);
        return Err(format!("Could not extract the archive: {}", e));
    }
    Ok(root.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zip_round_trip_with_flat_files() {
        let t = tempfile::tempdir().unwrap();
        fs::write(t.path().join("a.txt"), "A").unwrap();
        fs::write(t.path().join("b.txt"), "B").unwrap();
        let s = |n: &str| t.path().join(n).to_string_lossy().to_string();
        let zip = create_zip_archive(&[s("a.txt"), s("b.txt")], &t.path().to_string_lossy(), "Archive").unwrap();
        assert!(zip.ends_with("Archive.zip"));
        assert_eq!(list_archive_contents(&zip).unwrap().len(), 2);
        let out = extract_archive(&zip, &t.path().to_string_lossy()).unwrap();
        assert!(out.ends_with("Archive"));
        assert_eq!(fs::read_to_string(Path::new(&out).join("a.txt")).unwrap(), "A");
        // A second archive with the same name gets a unique name, never overwrites.
        let zip2 = create_zip_archive(&[s("a.txt")], &t.path().to_string_lossy(), "Archive").unwrap();
        assert!(zip2.ends_with("Archive 2.zip"));
    }

    #[test]
    fn single_root_folder_is_not_double_nested() {
        let t = tempfile::tempdir().unwrap();
        let proj = t.path().join("proj");
        fs::create_dir_all(proj.join("src")).unwrap();
        fs::write(proj.join("src/main.rs"), "fn main(){}").unwrap();
        let zip = create_zip_archive(&[proj.to_string_lossy().into()], &t.path().to_string_lossy(), "proj").unwrap();
        let out_dir = t.path().join("out");
        fs::create_dir(&out_dir).unwrap();
        let out = extract_archive(&zip, &out_dir.to_string_lossy()).unwrap();
        assert!(Path::new(&out).join("src/main.rs").exists(), "{out}");
        // Extracting again creates "proj 2", leaving the first untouched.
        let out2 = extract_archive(&zip, &out_dir.to_string_lossy()).unwrap();
        assert!(out2.ends_with("proj 2"));
    }

    #[test]
    fn tar_gz_list_and_extract() {
        let t = tempfile::tempdir().unwrap();
        let tgz = t.path().join("data.tar.gz");
        {
            let f = File::create(&tgz).unwrap();
            let enc = flate2::write::GzEncoder::new(f, flate2::Compression::default());
            let mut b = tar::Builder::new(enc);
            let mut h = tar::Header::new_gnu();
            let content = b"hello tar";
            h.set_size(content.len() as u64);
            h.set_mode(0o644);
            h.set_cksum();
            b.append_data(&mut h, "x.txt", &content[..]).unwrap();
            b.append_data(&mut h, "y.txt", &content[..]).unwrap();
            b.into_inner().unwrap().finish().unwrap();
        }
        let s = tgz.to_string_lossy().to_string();
        assert_eq!(list_archive_contents(&s).unwrap().len(), 2);
        let out = extract_archive(&s, &t.path().to_string_lossy()).unwrap();
        assert!(out.ends_with("data"));
        assert_eq!(fs::read_to_string(Path::new(&out).join("x.txt")).unwrap(), "hello tar");
    }

    #[test]
    fn traversal_entries_are_ignored() {
        assert!(safe_relative(Path::new("../evil")).is_none());
        assert!(safe_relative(Path::new("/etc/passwd")).is_none());
        assert_eq!(safe_relative(Path::new("./a/b")).unwrap(), PathBuf::from("a/b"));
    }
}
