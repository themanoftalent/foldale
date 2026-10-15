use std::fs;
use std::path::{Path, PathBuf};

/// Check if a path exists, whether it is a regular file, directory, or a broken symlink.
/// Crucial for preventing broken symlink deletion bugs.
pub fn path_or_symlink_exists(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok()
}

/// Check if `child` is equal to or a subpath of `parent`.
/// Prevents recursive directory moving bugs (e.g. moving a folder into its own subfolder).
pub fn is_descendant_of(child: &Path, parent: &Path) -> bool {
    if let (Ok(child_canonical), Ok(parent_canonical)) = (child.canonicalize(), parent.canonicalize()) {
        child_canonical.starts_with(parent_canonical)
    } else {
        // Fallback for paths that might not exist yet
        child.starts_with(parent)
    }
}

/// Generate a safe, non-colliding filename when Keep Both or duplicate is chosen.
/// Example: `report.pdf` -> `report (1).pdf` -> `report (2).pdf`
pub fn generate_non_colliding_path(target_path: &Path) -> PathBuf {
    if !path_or_symlink_exists(target_path) {
        return target_path.to_path_buf();
    }

    let parent = target_path.parent().unwrap_or_else(|| Path::new("."));
    let stem = target_path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "file".to_string());
    let ext = target_path
        .extension()
        .map(|e| format!(".{}", e.to_string_lossy()))
        .unwrap_or_default();

    let mut counter = 1;
    loop {
        let new_name = format!("{} ({}){}", stem, counter, ext);
        let candidate = parent.join(new_name);
        if !path_or_symlink_exists(&candidate) {
            return candidate;
        }
        counter += 1;
    }
}

/// MIME type detection with proper standards
pub fn detect_mime_type(extension: Option<&str>) -> String {
    let ext = match extension {
        Some(e) => e.to_lowercase(),
        None => return "application/octet-stream".to_string(),
    };

    match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "pdf" => "application/pdf",
        "zip" => "application/zip",
        "tar" => "application/x-tar",
        "gz" | "tgz" => "application/gzip",
        "7z" => "application/x-7z-compressed",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "flac" => "audio/flac",
        "aac" => "audio/aac",
        "ogg" => "audio/ogg",
        "m4a" => "audio/mp4",
        "mp4" => "video/mp4",
        "mkv" => "video/x-matroska",
        "mov" => "video/quicktime",
        "webm" => "video/webm",
        "txt" => "text/plain",
        "md" | "markdown" => "text/markdown",
        "json" => "application/json",
        "xml" => "application/xml",
        "csv" => "text/csv",
        "rs" => "text/rust",
        "ts" | "tsx" => "text/typescript",
        "js" | "jsx" => "text/javascript",
        "html" => "text/html",
        "css" => "text/css",
        "py" => "text/x-python",
        "sh" | "bash" | "zsh" => "text/x-shellscript",
        "yaml" | "yml" => "text/yaml",
        "toml" => "text/toml",
        _ => "application/octet-stream",
    }
    .to_string()
}

/// Convert Metadata to symbolic and octal permissions
pub fn format_permissions(meta: &fs::Metadata) -> (String, String) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mode = meta.permissions().mode();
        let octal = format!("{:04o}", mode & 0o7777);

        let is_dir = meta.is_dir();
        let is_symlink = meta.file_type().is_symlink();
        let type_char = if is_symlink {
            'l'
        } else if is_dir {
            'd'
        } else {
            '-'
        };

        let chars = [
            type_char,
            if mode & 0o400 != 0 { 'r' } else { '-' },
            if mode & 0o200 != 0 { 'w' } else { '-' },
            if mode & 0o100 != 0 { 'x' } else { '-' },
            if mode & 0o040 != 0 { 'r' } else { '-' },
            if mode & 0o020 != 0 { 'w' } else { '-' },
            if mode & 0o010 != 0 { 'x' } else { '-' },
            if mode & 0o004 != 0 { 'r' } else { '-' },
            if mode & 0o002 != 0 { 'w' } else { '-' },
            if mode & 0o001 != 0 { 'x' } else { '-' },
        ];

        (chars.iter().collect(), octal)
    }

    #[cfg(not(unix))]
    {
        let readonly = meta.permissions().readonly();
        let perm = if readonly {
            "r--r--r--".to_string()
        } else {
            "rw-rw-rw-".to_string()
        };
        let octal = if readonly { "0444" } else { "0666" }.to_string();
        (perm, octal)
    }
}
