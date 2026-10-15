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

/// Check if launch at system startup is enabled
#[cfg(target_os = "macos")]
fn get_launch_agent_path() -> Result<std::path::PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    Ok(home.join("Library").join("LaunchAgents").join("com.themanoftalent.foldale.plist"))
}

#[cfg(target_os = "macos")]
pub fn get_autostart() -> Result<bool, String> {
    let plist_path = get_launch_agent_path()?;
    Ok(plist_path.exists())
}

#[cfg(target_os = "macos")]
pub fn set_autostart(enabled: bool) -> Result<(), String> {
    let plist_path = get_launch_agent_path()?;
    if enabled {
        if let Some(parent) = plist_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let app_target = if std::path::Path::new("/Applications/Foldale.app").exists() {
            "/Applications/Foldale.app".to_string()
        } else if let Ok(exe) = std::env::current_exe() {
            let s = exe.to_string_lossy();
            if let Some(pos) = s.rfind(".app") {
                s[..pos + 4].to_string()
            } else {
                s.to_string()
            }
        } else {
            "/Applications/Foldale.app".to_string()
        };

        let plist_content = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.themanoftalent.foldale</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/open</string>
        <string>-a</string>
        <string>{}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>ProcessType</key>
    <string>Interactive</string>
</dict>
</plist>
"#,
            app_target
        );

        std::fs::write(&plist_path, plist_content).map_err(|e| e.to_string())?;
    } else {
        if plist_path.exists() {
            let _ = std::fs::remove_file(&plist_path);
        }
    }
    Ok(())
}

#[cfg(target_os = "linux")]
pub fn get_autostart() -> Result<bool, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    let path = home.join(".config").join("autostart").join("foldale.desktop");
    Ok(path.exists())
}

#[cfg(target_os = "linux")]
pub fn set_autostart(enabled: bool) -> Result<(), String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    let dir = home.join(".config").join("autostart");
    let path = dir.join("foldale.desktop");
    if enabled {
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let content = "[Desktop Entry]\nType=Application\nVersion=1.0\nName=Foldale\nComment=Foldale File Manager\nExec=/usr/bin/foldale\nStartupNotify=false\nTerminal=false\n";
        std::fs::write(&path, content).map_err(|e| e.to_string())?;
    } else if path.exists() {
        let _ = std::fs::remove_file(&path);
    }
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn get_autostart() -> Result<bool, String> {
    Ok(false)
}

#[cfg(target_os = "windows")]
pub fn set_autostart(_enabled: bool) -> Result<(), String> {
    Ok(())
}
