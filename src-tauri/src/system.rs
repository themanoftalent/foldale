//! OS integration: standard folders, volumes, Finder/Terminal handoff, clipboard.

use std::collections::HashSet;
use std::io::Write;
use std::path::Path;
use std::process::{Command, Stdio};
use sysinfo::Disks;

use crate::models::{DriveInfo, SystemLocations};

fn dir_or(d: Option<std::path::PathBuf>, home: &str, fallback: &str) -> String {
    d.map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("{}/{}", home, fallback))
}

pub fn get_system_locations() -> SystemLocations {
    let home = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "/".to_string());
    SystemLocations {
        desktop: dir_or(dirs::desktop_dir(), &home, "Desktop"),
        documents: dir_or(dirs::document_dir(), &home, "Documents"),
        downloads: dir_or(dirs::download_dir(), &home, "Downloads"),
        pictures: dir_or(dirs::picture_dir(), &home, "Pictures"),
        music: dir_or(dirs::audio_dir(), &home, "Music"),
        videos: dir_or(dirs::video_dir(), &home, "Movies"),
        applications: if cfg!(target_os = "macos") { "/Applications".into() } else { home.clone() },
        trash: format!("{}/.Trash", home),
        root: if cfg!(windows) { "C:\\".into() } else { "/".into() },
        home,
    }
}

/// Volumes the user cares about. On macOS this is the startup disk plus everything
/// mounted under /Volumes; APFS system, VM, Preboot and Recovery volumes are hidden.
pub fn get_volumes() -> Vec<DriveInfo> {
    let disks = Disks::new_with_refreshed_list();
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for disk in &disks {
        let mount = disk.mount_point().to_string_lossy().to_string();
        if cfg!(target_os = "macos") && !(mount == "/" || mount.starts_with("/Volumes/")) {
            continue;
        }
        if mount.starts_with("/Volumes/") {
            // Hide disk images of installers and system helper mounts.
            let lower = mount.to_lowercase();
            if lower.contains("com.apple") || lower.ends_with("/recovery") {
                continue;
            }
        }
        if !seen.insert(mount.clone()) {
            continue;
        }
        let is_root = mount == "/";
        let raw_name = disk.name().to_string_lossy().to_string();
        let name = if is_root {
            if raw_name.is_empty() { "Macintosh HD".into() } else { raw_name }
        } else {
            Path::new(&mount)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or(raw_name)
        };
        out.push(DriveInfo {
            name,
            total_bytes: disk.total_space(),
            available_bytes: disk.available_space(),
            file_system: disk.file_system().to_string_lossy().to_string(),
            is_removable: disk.is_removable(),
            is_ejectable: !is_root,
            is_root,
            mount_point: mount,
        });
    }
    out.sort_by(|a, b| b.is_root.cmp(&a.is_root).then(a.name.to_lowercase().cmp(&b.name.to_lowercase())));
    out
}

pub fn free_space_for(path: &str) -> Option<(u64, u64)> {
    let disks = Disks::new_with_refreshed_list();
    let p = Path::new(path).canonicalize().ok()?;
    disks
        .iter()
        .filter(|d| p.starts_with(d.mount_point()))
        .max_by_key(|d| d.mount_point().as_os_str().len())
        .map(|d| (d.available_space(), d.total_space()))
}

pub fn eject_volume(mount_point: &str) -> Result<(), String> {
    if mount_point == "/" || !mount_point.starts_with("/Volumes/") {
        return Err("Only external volumes can be ejected.".into());
    }
    #[cfg(target_os = "macos")]
    {
        let out = Command::new("/usr/sbin/diskutil")
            .arg("eject")
            .arg(mount_point)
            .output()
            .map_err(|e| e.to_string())?;
        if !out.status.success() {
            let msg = String::from_utf8_lossy(&out.stderr).trim().to_string();
            let msg = if msg.is_empty() { String::from_utf8_lossy(&out.stdout).trim().to_string() } else { msg };
            return Err(format!("The volume could not be ejected. {}", msg));
        }
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Eject is only supported on macOS.".into())
    }
}

pub fn reveal_in_os(path_str: &str) -> Result<(), String> {
    let path = Path::new(path_str);
    if std::fs::symlink_metadata(path).is_err() {
        return Err("The item no longer exists.".to_string());
    }
    #[cfg(target_os = "macos")]
    Command::new("/usr/bin/open").arg("-R").arg(path).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    Command::new("explorer").arg(format!("/select,{}", path_str)).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    Command::new("xdg-open").arg(path.parent().unwrap_or(path)).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn open_with_default_app(path: &str) -> Result<(), String> {
    open::that_detached(path).map_err(|e| format!("No application could open this item: {}", e))
}

pub fn open_in_terminal(dir_path: &str) -> Result<(), String> {
    if !Path::new(dir_path).is_dir() {
        return Err("Not a folder.".to_string());
    }
    #[cfg(target_os = "macos")]
    Command::new("/usr/bin/open").args(["-a", "Terminal"]).arg(dir_path).spawn().map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    Command::new("cmd")
        .args(["/c", "start", "cmd", "/K", &format!("cd /d \"{}\"", dir_path)])
        .spawn()
        .map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    Command::new("x-terminal-emulator")
        .arg(format!("--working-directory={}", dir_path))
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn copy_text_to_clipboard(text: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let mut child = Command::new("/usr/bin/pbcopy")
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;
        child
            .stdin
            .as_mut()
            .ok_or("clipboard unavailable")?
            .write_all(text.as_bytes())
            .map_err(|e| e.to_string())?;
        child.wait().map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (text, Stdio::null());
        Err("Clipboard is only supported on macOS.".into())
    }
}
