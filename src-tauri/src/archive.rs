use std::fs::{self, File};
use std::io;
use std::path::Path;
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

use crate::models::ArchiveEntry;

/// Inspect contents of an archive file without extracting
pub fn list_archive_contents(archive_path: &str) -> Result<Vec<ArchiveEntry>, String> {
    let path = Path::new(archive_path);
    if !path.exists() {
        return Err("Archive file not found".to_string());
    }

    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    if file_name.ends_with(".zip") {
        let file = File::open(path).map_err(|e| e.to_string())?;
        let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
        let mut entries = Vec::new();

        for i in 0..archive.len() {
            let item = archive.by_index(i).map_err(|e| e.to_string())?;
            entries.push(ArchiveEntry {
                name: item.name().to_string(),
                is_dir: item.is_dir(),
                size: item.size(),
                compressed_size: item.compressed_size(),
                modified: None,
            });
        }

        Ok(entries)
    } else if file_name.ends_with(".tar.gz") || file_name.ends_with(".tgz") {
        let file = File::open(path).map_err(|e| e.to_string())?;
        let gz = flate2::read::GzDecoder::new(file);
        let mut tar = tar::Archive::new(gz);
        let mut entries = Vec::new();

        for entry in tar.entries().map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let header = entry.header();
            let is_dir = header.entry_type().is_dir();
            let size = header.size().unwrap_or(0);
            let path_bytes = entry.path_bytes();
            let name = String::from_utf8_lossy(&path_bytes).to_string();

            entries.push(ArchiveEntry {
                name,
                is_dir,
                size,
                compressed_size: 0,
                modified: header.mtime().ok().map(|m| m as i64),
            });
        }

        Ok(entries)
    } else if file_name.ends_with(".tar") {
        let file = File::open(path).map_err(|e| e.to_string())?;
        let mut tar = tar::Archive::new(file);
        let mut entries = Vec::new();

        for entry in tar.entries().map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let header = entry.header();
            let is_dir = header.entry_type().is_dir();
            let size = header.size().unwrap_or(0);
            let path_bytes = entry.path_bytes();
            let name = String::from_utf8_lossy(&path_bytes).to_string();

            entries.push(ArchiveEntry {
                name,
                is_dir,
                size,
                compressed_size: size,
                modified: header.mtime().ok().map(|m| m as i64),
            });
        }

        Ok(entries)
    } else {
        Err(format!("Unsupported archive preview format: {}", file_name))
    }
}

/// Create a ZIP archive from a list of files and directories
pub fn create_zip_archive(sources: Vec<String>, archive_path: &str) -> Result<(), String> {
    let file = File::create(archive_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    for src_str in sources {
        let src = Path::new(&src_str);
        if !src.exists() {
            continue;
        }

        let base_dir = src.parent().unwrap_or_else(|| Path::new("."));

        if src.is_file() {
            let file_name = src
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "file".to_string());

            zip.start_file(file_name, options)
                .map_err(|e| e.to_string())?;
            let mut f = File::open(src).map_err(|e| e.to_string())?;
            io::copy(&mut f, &mut zip).map_err(|e| e.to_string())?;
        } else if src.is_dir() {
            for entry in WalkDir::new(src).into_iter().filter_map(|e| e.ok()) {
                let entry_path = entry.path();
                let relative_path = entry_path
                    .strip_prefix(base_dir)
                    .map_err(|e| e.to_string())?;

                let name = relative_path.to_string_lossy().replace('\\', "/");

                if entry.file_type().is_dir() {
                    zip.add_directory(format!("{}/", name), options)
                        .map_err(|e| e.to_string())?;
                } else if entry.file_type().is_file() {
                    zip.start_file(name, options).map_err(|e| e.to_string())?;
                    let mut f = File::open(entry_path).map_err(|e| e.to_string())?;
                    io::copy(&mut f, &mut zip).map_err(|e| e.to_string())?;
                }
            }
        }
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

/// Extract an archive (.zip, .tar, .tar.gz, .tgz) with security against path traversal attacks
pub fn extract_archive(archive_path: &str, destination_dir: &str) -> Result<(), String> {
    let path = Path::new(archive_path);
    let dest = Path::new(destination_dir);

    if !path.exists() {
        return Err("Archive does not exist".to_string());
    }

    if !dest.exists() {
        fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    }

    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    if file_name.ends_with(".zip") {
        let file = File::open(path).map_err(|e| e.to_string())?;
        let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
            let outpath = match file.enclosed_name() {
                Some(path) => dest.join(path),
                None => continue, // Discard unsafe path traversal files
            };

            if file.is_dir() {
                fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        fs::create_dir_all(p).map_err(|e| e.to_string())?;
                    }
                }
                let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
                io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    } else if file_name.ends_with(".tar.gz") || file_name.ends_with(".tgz") {
        let file = File::open(path).map_err(|e| e.to_string())?;
        let gz = flate2::read::GzDecoder::new(file);
        let mut tar = tar::Archive::new(gz);
        tar.unpack(dest).map_err(|e| e.to_string())?;
        Ok(())
    } else if file_name.ends_with(".tar") {
        let file = File::open(path).map_err(|e| e.to_string())?;
        let mut tar = tar::Archive::new(file);
        tar.unpack(dest).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Unsupported archive format: {}", file_name))
    }
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
    fn test_zip_create_list_extract() {
        let temp_dir = get_unique_temp_dir("foldale_test_archive");

        let doc1 = temp_dir.join("test1.txt");
        let doc2 = temp_dir.join("test2.txt");
        fs::write(&doc1, "First test doc").unwrap();
        fs::write(&doc2, "Second test doc").unwrap();

        let zip_path = temp_dir.join("archive.zip");
        create_zip_archive(
            vec![
                doc1.to_string_lossy().to_string(),
                doc2.to_string_lossy().to_string(),
            ],
            &zip_path.to_string_lossy(),
        )
        .expect("Create zip archive failed");
        assert!(zip_path.exists());

        // Test list contents without extraction
        let entries = list_archive_contents(&zip_path.to_string_lossy())
            .expect("List archive failed");
        assert_eq!(entries.len(), 2);

        // Test extraction
        let extract_dir = temp_dir.join("extracted");
        extract_archive(&zip_path.to_string_lossy(), &extract_dir.to_string_lossy())
            .expect("Extract archive failed");
        assert!(extract_dir.join("test1.txt").exists());
        assert!(extract_dir.join("test2.txt").exists());

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
