//! Small, dependency-free helpers shared by the filesystem modules.

use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

pub fn time_to_timestamp(time: std::io::Result<SystemTime>) -> Option<i64> {
    time.ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
}

pub fn now_ts() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Coarse file category used by the UI for icons and preview routing.
pub fn detect_mime_type(ext: Option<&str>) -> String {
    let ext = ext.map(|s| s.to_ascii_lowercase());
    let cat = match ext.as_deref() {
        Some(
            "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "bmp" | "ico" | "tif" | "tiff"
            | "heic" | "heif" | "avif",
        ) => "image",
        Some("mp4" | "mov" | "m4v" | "mkv" | "avi" | "webm") => "video",
        Some("mp3" | "wav" | "flac" | "aac" | "ogg" | "m4a" | "aiff" | "aif" | "opus") => "audio",
        Some("pdf") => "pdf",
        Some("zip" | "tar" | "gz" | "tgz" | "7z" | "rar" | "bz2" | "xz" | "dmg") => "archive",
        Some(
            "rs" | "ts" | "tsx" | "js" | "jsx" | "mjs" | "cjs" | "py" | "go" | "c" | "cc" | "cpp"
            | "h" | "hpp" | "m" | "mm" | "java" | "kt" | "swift" | "rb" | "php" | "sh" | "zsh"
            | "bash" | "fish" | "html" | "htm" | "css" | "scss" | "less" | "json" | "jsonc"
            | "yaml" | "yml" | "toml" | "xml" | "sql" | "lua" | "r" | "jl" | "tex" | "ini"
            | "conf" | "env" | "dockerfile" | "makefile" | "vue" | "svelte",
        ) => "code",
        Some("md" | "markdown" | "txt" | "rtf" | "log" | "csv" | "tsv") => "text",
        Some("doc" | "docx" | "pages" | "odt") => "document",
        Some("xls" | "xlsx" | "numbers" | "ods") => "spreadsheet",
        Some("ppt" | "pptx" | "key" | "odp") => "presentation",
        Some("app" | "pkg" | "exe" | "msi") => "application",
        Some("ttf" | "otf" | "woff" | "woff2") => "font",
        _ => "unknown",
    };
    cat.to_string()
}

/// A real MIME type, for data URIs and the system.
pub fn real_mime_type(ext: Option<&str>) -> &'static str {
    match ext.map(|s| s.to_ascii_lowercase()).as_deref() {
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        Some("bmp") => "image/bmp",
        Some("ico") => "image/x-icon",
        Some("tif" | "tiff") => "image/tiff",
        Some("heic") => "image/heic",
        Some("avif") => "image/avif",
        Some("pdf") => "application/pdf",
        Some("mp4" | "m4v") => "video/mp4",
        Some("mov") => "video/quicktime",
        Some("webm") => "video/webm",
        Some("mp3") => "audio/mpeg",
        Some("wav") => "audio/wav",
        Some("m4a" | "aac") => "audio/mp4",
        Some("ogg" | "opus") => "audio/ogg",
        Some("flac") => "audio/flac",
        _ => "application/octet-stream",
    }
}

/// macOS bundles are directories that behave like files in Finder.
pub fn is_package_extension(ext: Option<&str>) -> bool {
    matches!(
        ext.map(|s| s.to_ascii_lowercase()).as_deref(),
        Some(
            "app" | "bundle" | "framework" | "plugin" | "kext" | "xcodeproj" | "xcworkspace"
                | "playground" | "photoslibrary" | "musiclibrary" | "rtfd" | "scptd" | "pkg"
                | "mpkg" | "prefpane" | "qlgenerator" | "saver" | "appex"
        )
    )
}

pub fn format_permissions(metadata: &fs::Metadata) -> (String, String) {
    #[cfg(unix)]
    {
        let mode = metadata.permissions().mode();
        let bit = |m: u32, c: char| if mode & m != 0 { c } else { '-' };
        let s: String = [
            bit(0o400, 'r'),
            bit(0o200, 'w'),
            bit(0o100, 'x'),
            bit(0o040, 'r'),
            bit(0o020, 'w'),
            bit(0o010, 'x'),
            bit(0o004, 'r'),
            bit(0o002, 'w'),
            bit(0o001, 'x'),
        ]
        .iter()
        .collect();
        (s, format!("{:o}", mode & 0o777))
    }
    #[cfg(not(unix))]
    {
        let ro = metadata.permissions().readonly();
        (
            if ro { "r--r--r--" } else { "rw-rw-rw-" }.to_string(),
            if ro { "444" } else { "666" }.to_string(),
        )
    }
}

/// True when two paths refer to the same filesystem object (same device and inode).
/// Used for case-only renames on case-insensitive volumes.
pub fn same_file(a: &Path, b: &Path) -> bool {
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        match (fs::symlink_metadata(a), fs::symlink_metadata(b)) {
            (Ok(ma), Ok(mb)) => ma.dev() == mb.dev() && ma.ino() == mb.ino(),
            _ => false,
        }
    }
    #[cfg(not(unix))]
    {
        match (a.canonicalize(), b.canonicalize()) {
            (Ok(x), Ok(y)) => x == y,
            _ => false,
        }
    }
}

/// `lstat`-based existence check. Unlike `Path::exists`, this is true for broken symlinks.
pub fn entry_exists(p: &Path) -> bool {
    fs::symlink_metadata(p).is_ok()
}

pub fn is_writable_dir(p: &Path) -> bool {
    #[cfg(unix)]
    {
        use std::ffi::CString;
        use std::os::unix::ffi::OsStrExt;
        match CString::new(p.as_os_str().as_bytes()) {
            Ok(c) => unsafe { libc::access(c.as_ptr(), libc::W_OK) == 0 },
            Err(_) => false,
        }
    }
    #[cfg(not(unix))]
    {
        p.metadata().map(|m| !m.permissions().readonly()).unwrap_or(false)
    }
}

/// Split "archive.tar.gz" into ("archive", ".tar.gz") and "photo.jpg" into ("photo", ".jpg").
/// Dotfiles such as ".zshrc" keep their full name as the stem.
pub fn split_name(name: &str) -> (String, String) {
    let lower = name.to_ascii_lowercase();
    for compound in [".tar.gz", ".tar.bz2", ".tar.xz"] {
        if lower.ends_with(compound) && name.len() > compound.len() {
            let cut = name.len() - compound.len();
            return (name[..cut].to_string(), name[cut..].to_string());
        }
    }
    match name.rfind('.') {
        Some(i) if i > 0 => (name[..i].to_string(), name[i..].to_string()),
        _ => (name.to_string(), String::new()),
    }
}

/// Finder-style unique name in `dir`: "Report.pdf" -> "Report 2.pdf" -> "Report 3.pdf".
pub fn unique_name(dir: &Path, name: &str) -> String {
    if !entry_exists(&dir.join(name)) {
        return name.to_string();
    }
    let (stem, ext) = split_name(name);
    let mut n = 2;
    loop {
        let candidate = format!("{} {}{}", stem, n, ext);
        if !entry_exists(&dir.join(&candidate)) {
            return candidate;
        }
        n += 1;
    }
}

/// Finder-style duplicate name: "Report.pdf" -> "Report copy.pdf" -> "Report copy 2.pdf".
pub fn duplicate_name(dir: &Path, name: &str) -> String {
    let (stem, ext) = split_name(name);
    let first = format!("{} copy{}", stem, ext);
    if !entry_exists(&dir.join(&first)) {
        return first;
    }
    let mut n = 2;
    loop {
        let candidate = format!("{} copy {}{}", stem, n, ext);
        if !entry_exists(&dir.join(&candidate)) {
            return candidate;
        }
        n += 1;
    }
}

/// Lexically normalise a path (resolve `.` and `..` without touching the disk).
pub fn normalize(p: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for comp in p.components() {
        match comp {
            Component::ParentDir => {
                out.pop();
            }
            Component::CurDir => {}
            other => out.push(other.as_os_str()),
        }
    }
    out
}

/// Best-effort canonical form: canonicalize when the path exists, otherwise normalise.
pub fn canonical_or_normal(p: &Path) -> PathBuf {
    p.canonicalize().unwrap_or_else(|_| normalize(p))
}

/// True when `child` is `ancestor` or lies inside it.
pub fn is_within(child: &Path, ancestor: &Path) -> bool {
    let c = canonical_or_normal(child);
    let a = canonical_or_normal(ancestor);
    c.starts_with(&a)
}

/// Paths whose deletion would damage the system or the user's account.
/// This is a last-line safety net; the UI never offers these as targets on purpose.
pub fn is_protected_path(p: &Path) -> bool {
    let c = canonical_or_normal(p);
    if c.parent().is_none() {
        return true; // filesystem root
    }
    if let Some(home) = dirs::home_dir() {
        let home_c = canonical_or_normal(&home);
        if c == home_c {
            return true;
        }
        if let Some(users) = home_c.parent() {
            if c == users {
                return true;
            }
        }
    }
    const SYSTEM: &[&str] = &[
        "/System", "/Library", "/Applications", "/Users", "/bin", "/sbin", "/usr", "/etc",
        "/var", "/private", "/opt", "/Volumes", "/cores", "/dev", "/tmp",
    ];
    SYSTEM.iter().any(|s| c == Path::new(s))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_handles_compound_and_dotfiles() {
        assert_eq!(split_name("a.tar.gz"), ("a".into(), ".tar.gz".into()));
        assert_eq!(split_name("photo.JPG"), ("photo".into(), ".JPG".into()));
        assert_eq!(split_name(".zshrc"), (".zshrc".into(), "".into()));
        assert_eq!(split_name("Makefile"), ("Makefile".into(), "".into()));
    }

    #[test]
    fn unique_and_duplicate_names() {
        let t = tempfile::tempdir().unwrap();
        fs::write(t.path().join("r.pdf"), b"x").unwrap();
        assert_eq!(unique_name(t.path(), "new.pdf"), "new.pdf");
        assert_eq!(unique_name(t.path(), "r.pdf"), "r 2.pdf");
        fs::write(t.path().join("r 2.pdf"), b"x").unwrap();
        assert_eq!(unique_name(t.path(), "r.pdf"), "r 3.pdf");
        assert_eq!(duplicate_name(t.path(), "r.pdf"), "r copy.pdf");
        fs::write(t.path().join("r copy.pdf"), b"x").unwrap();
        assert_eq!(duplicate_name(t.path(), "r.pdf"), "r copy 2.pdf");
    }

    #[test]
    fn protected_paths() {
        assert!(is_protected_path(Path::new("/")));
        assert!(is_protected_path(&dirs::home_dir().unwrap()));
        assert!(is_protected_path(Path::new("/System")));
        let t = tempfile::tempdir().unwrap();
        assert!(!is_protected_path(&t.path().join("x")));
    }

    #[test]
    fn within_detects_nesting() {
        let t = tempfile::tempdir().unwrap();
        let a = t.path().join("a");
        let b = a.join("b");
        fs::create_dir_all(&b).unwrap();
        assert!(is_within(&b, &a));
        assert!(is_within(&a, &a));
        assert!(!is_within(&a, &b));
    }

    #[test]
    fn broken_symlink_exists() {
        #[cfg(unix)]
        {
            let t = tempfile::tempdir().unwrap();
            let l = t.path().join("dangling");
            std::os::unix::fs::symlink(t.path().join("missing"), &l).unwrap();
            assert!(!l.exists());
            assert!(entry_exists(&l));
        }
    }
}
