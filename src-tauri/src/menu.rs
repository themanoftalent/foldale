//! Native macOS menu bar. Custom items emit a `menu` event carrying the item id;
//! the frontend maps ids to commands. Clipboard items use the predefined
//! responder-chain actions so text fields keep native copy and paste.

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Runtime};

fn item<R: Runtime>(app: &AppHandle<R>, id: &str, label: &str, accel: Option<&str>) -> tauri::Result<MenuItem<R>> {
    MenuItem::with_id(app, id, label, true, accel)
}

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let sep = || PredefinedMenuItem::separator(app);

    let app_menu = Submenu::with_items(
        app,
        "Foldale",
        true,
        &[
            &item(app, "about", "About Foldale", None)?,
            &sep()?,
            &item(app, "settings", "Settings…", Some("CmdOrCtrl+Comma"))?,
            &sep()?,
            &PredefinedMenuItem::services(app, None)?,
            &sep()?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::show_all(app, None)?,
            &sep()?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;

    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &item(app, "new_folder", "New Folder", Some("CmdOrCtrl+Shift+N"))?,
            &item(app, "new_file", "New File…", Some("CmdOrCtrl+Alt+N"))?,
            &item(app, "new_tab", "New Tab", Some("CmdOrCtrl+T"))?,
            &sep()?,
            &item(app, "open", "Open", Some("CmdOrCtrl+O"))?,
            &item(app, "quick_look", "Quick Look", Some("CmdOrCtrl+Y"))?,
            &item(app, "get_info", "Get Info", Some("CmdOrCtrl+I"))?,
            &item(app, "rename", "Rename…", None)?,
            &item(app, "batch_rename", "Rename Multiple Items…", Some("CmdOrCtrl+Shift+R"))?,
            &item(app, "duplicate", "Duplicate", Some("CmdOrCtrl+D"))?,
            &item(app, "make_alias", "Make Symbolic Link", None)?,
            &sep()?,
            &item(app, "compress", "Compress", None)?,
            &item(app, "extract", "Extract Here", None)?,
            &sep()?,
            &item(app, "reveal", "Reveal in Finder", Some("CmdOrCtrl+Alt+R"))?,
            &item(app, "terminal", "Open in Terminal", Some("CmdOrCtrl+Alt+T"))?,
            &item(app, "copy_path", "Copy Path", Some("CmdOrCtrl+Alt+C"))?,
            &item(app, "add_bookmark", "Add to Bookmarks", Some("CmdOrCtrl+Shift+B"))?,
            &sep()?,
            &item(app, "trash", "Move to Trash", Some("CmdOrCtrl+Backspace"))?,
            &item(app, "delete_permanently", "Delete Immediately…", Some("CmdOrCtrl+Alt+Backspace"))?,
            &sep()?,
            &item(app, "close_tab", "Close Tab", Some("CmdOrCtrl+W"))?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &item(app, "undo", "Undo", Some("CmdOrCtrl+Z"))?,
            &item(app, "redo", "Redo", Some("CmdOrCtrl+Shift+Z"))?,
            &sep()?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &item(app, "select_all", "Select All", Some("CmdOrCtrl+A"))?,
            &item(app, "invert_selection", "Invert Selection", Some("CmdOrCtrl+Shift+I"))?,
            &sep()?,
            &item(app, "copy_to_other", "Copy to Other Pane", Some("F5"))?,
            &item(app, "move_to_other", "Move to Other Pane", Some("F6"))?,
            &sep()?,
            &item(app, "find", "Find…", Some("CmdOrCtrl+F"))?,
            &item(app, "filter", "Filter This Folder", Some("CmdOrCtrl+L"))?,
            &item(app, "command_palette", "Command Palette…", Some("CmdOrCtrl+K"))?,
        ],
    )?;

    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &item(app, "view_list", "as List", Some("CmdOrCtrl+Alt+1"))?,
            &item(app, "view_compact", "as Compact List", Some("CmdOrCtrl+Alt+2"))?,
            &item(app, "view_grid", "as Icons", Some("CmdOrCtrl+Alt+3"))?,
            &sep()?,
            &item(app, "layout_horizontal", "Side by Side", Some("CmdOrCtrl+1"))?,
            &item(app, "layout_vertical", "Stacked", Some("CmdOrCtrl+2"))?,
            &item(app, "layout_single", "Single Pane", Some("CmdOrCtrl+3"))?,
            &sep()?,
            &item(app, "toggle_hidden", "Show Hidden Files", Some("CmdOrCtrl+Shift+Period"))?,
            &item(app, "toggle_sidebar", "Toggle Sidebar", Some("CmdOrCtrl+Alt+S"))?,
            &item(app, "toggle_inspector", "Toggle Inspector", Some("CmdOrCtrl+Alt+I"))?,
            &sep()?,
            &item(app, "refresh", "Refresh", Some("CmdOrCtrl+R"))?,
            &sep()?,
            &PredefinedMenuItem::fullscreen(app, None)?,
        ],
    )?;

    let go_menu = Submenu::with_items(
        app,
        "Go",
        true,
        &[
            &item(app, "back", "Back", Some("CmdOrCtrl+BracketLeft"))?,
            &item(app, "forward", "Forward", Some("CmdOrCtrl+BracketRight"))?,
            &item(app, "up", "Enclosing Folder", Some("CmdOrCtrl+ArrowUp"))?,
            &sep()?,
            &item(app, "go_home", "Home", Some("CmdOrCtrl+Shift+H"))?,
            &item(app, "go_desktop", "Desktop", Some("CmdOrCtrl+Shift+D"))?,
            &item(app, "go_documents", "Documents", Some("CmdOrCtrl+Shift+O"))?,
            &item(app, "go_downloads", "Downloads", Some("CmdOrCtrl+Alt+L"))?,
            &item(app, "go_applications", "Applications", Some("CmdOrCtrl+Shift+A"))?,
            &sep()?,
            &item(app, "go_to_folder", "Go to Folder…", Some("CmdOrCtrl+Shift+G"))?,
            &sep()?,
            &item(app, "switch_pane", "Switch Pane", None)?,
            &item(app, "swap_panes", "Swap Panes", Some("CmdOrCtrl+U"))?,
            &item(app, "mirror_pane", "Show This Folder in Other Pane", Some("CmdOrCtrl+Shift+M"))?,
        ],
    )?;

    let window_menu = Submenu::with_items(
        app,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            &sep()?,
            &PredefinedMenuItem::close_window(app, Some("Close Window"))?,
        ],
    )?;

    let help_menu = Submenu::with_items(
        app,
        "Help",
        true,
        &[
            &item(app, "shortcuts", "Keyboard Shortcuts", Some("CmdOrCtrl+Slash"))?,
            &item(app, "activity", "Activity Log", None)?,
            &item(app, "github", "Foldale on GitHub", None)?,
        ],
    )?;

    Menu::with_items(app, &[&app_menu, &file_menu, &edit_menu, &view_menu, &go_menu, &window_menu, &help_menu])
}
