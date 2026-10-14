use std::path::Path;
use std::process::Command;
use sysinfo::Disks;

use crate::models::{DriveInfo, SystemLocations};

/// Retrieve standard user directories
pub fn get_system_locations() -> Result<SystemLocations, String> {
    let home = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "/".to_string());
    let desktop = dirs::desktop_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("{}/Desktop", home));
    let documents = dirs::document_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("{}/Documents", home));
    let downloads = dirs::download_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("{}/Downloads", home));
    let pictures = dirs::picture_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("{}/Pictures", home));
    let music = dirs::audio_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("{}/Music", home));
    let videos = dirs::video_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| format!("{}/Movies", home));

    let root = if cfg!(windows) { "C:\\" } else { "/" }.to_string();

    Ok(SystemLocations {
        home,
        desktop,
        documents,
        downloads,
        pictures,
        music,
        videos,
        root,
    })
}

/// Retrieve all mounted filesystems and volumes
pub fn get_mounted_drives() -> Result<Vec<DriveInfo>, String> {
    let disks = Disks::new_with_refreshed_list();
    let mut drives = Vec::new();

    for disk in &disks {
        let name = disk.name().to_string_lossy().to_string();
        let mount_point = disk.mount_point().to_string_lossy().to_string();
        let file_system = disk.file_system().to_string_lossy().to_string();
        let total_bytes = disk.total_space();
        let available_bytes = disk.available_space();
        let is_removable = disk.is_removable();

        // Friendly name if disk name is empty
        let display_name = if name.is_empty() {
            if mount_point == "/" {
                "Macintosh HD".to_string()
            } else {
                Path::new(&mount_point)
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| mount_point.clone())
            }
        } else {
            name
        };

        drives.push(DriveInfo {
            name: display_name,
            mount_point,
            total_bytes,
            available_bytes,
            file_system,
            is_removable,
        });
    }

    Ok(drives)
}

/// Reveal item in native OS file manager
pub fn reveal_in_os(path_str: &str) -> Result<(), String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err("Path does not exist".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(format!("/select,\"{}\"", path_str))
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        let parent = path.parent().unwrap_or(path);
        Command::new("xdg-open")
            .arg(parent)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Open file or folder with system default app
pub fn open_with_default_app(path: &str) -> Result<(), String> {
    open::that(path).map_err(|e| e.to_string())
}

/// Open terminal session in the given directory
pub fn open_in_terminal(dir_path: &str) -> Result<(), String> {
    let path = Path::new(dir_path);
    if !path.is_dir() {
        return Err("Not a directory".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-a")
            .arg("Terminal")
            .arg(dir_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "cmd", "/K", &format!("cd /d \"{}\"", dir_path)])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("x-terminal-emulator")
            .arg(format!("--working-directory={}", dir_path))
            .spawn()
            .or_else(|_| {
                Command::new("gnome-terminal")
                    .arg(format!("--working-directory={}", dir_path))
                    .spawn()
            })
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
