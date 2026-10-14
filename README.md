# Foldale 📂
> A Modern, High-Performance, Cross-Platform Dual-Pane Desktop File Manager inspired by Marta for macOS and enhanced with Windows File Explorer functionality.

Foldale combines the keyboard efficiency of Marta with familiar Windows Explorer workflows, real filesystem integration, dual-pane productivity, modern UI/UX, and an asynchronous Rust transfer engine.

---

## 🚀 Key Features

### 1. Dual-Pane Architecture
- **Independent Panes**: Left and right panes operate with independent histories, views, sorting, filtering, and tab sets.
- **Flexible Layouts**:
  - `Dual Horizontal`: Side-by-side split (`⌘1`)
  - `Dual Vertical`: Stacked split (`⌘2`)
  - `Single Pane`: Focus mode (`⌘3`)
- **Active Focus Indicator**: Prominent visual focus ring showing the active pane receiving keyboard commands.
- **Tabbed Browsing**: Multi-tab navigation per pane with custom titles and close triggers (`⌘T`, `⌘W`).

### 2. Windows File Explorer + Marta Efficiency
- **F2 Inline Renaming**: Rename files in place with extension preservation, Enter confirmation, Esc cancellation.
- **Batch Renamer**:
  - Search & Replace (with Regex support)
  - Prefix & Suffix addition
  - Sequential Numbering (`file_001`, `photo_002`, etc.)
  - Case changes (lowercase, UPPERCASE, Title Case)
  - Live side-by-side diff preview (`Old Name` ➔ `New Name`)
  - Duplicate target conflict detection
- **Quick Look (Spacebar)**: Instant preview modal for images, plain text & syntax-highlighted code, audio/video playback, and ZIP archive contents inspection without extraction.
- **Deep Directory Search (`F3` / `⌘F`)**: Multi-threaded recursive search with regex, case sensitivity, extension filters, and jump-to-location.
- **Command Palette (`⌘K` / `⌘P`)**: Searchable action palette for instant access to any command, layout, theme, or folder.

### 3. Native Filesystem & OS Integration
- **Real Filesystem Operations**:
  - Create Files & Folders (`⌘⇧N`)
  - Copy (`⌘C`), Cut (`⌘X`), Paste (`⌘V`), Duplicate (`⌘D`)
  - Trash deletion (`⌫` / `Delete`) via OS native trash / Recycle Bin
  - Permanent deletion (`⇧⌫` / `Shift+Delete`)
  - Symbolic link creation
  - Recursive folder size calculation
  - Native OS Reveal (`open -R` / Windows Explorer reveal)
  - Embedded terminal launcher at current directory
- **Archive Manager**:
  - Create ZIP archives from selections
  - Safe extraction with path traversal protection
  - View contents of archives directly inside the app
- **SQLite Database Persistence**:
  - Bookmarks & pinned places (`~/.foldale/foldale.db`)
  - Directory visit history
  - User settings & preferences
  - File operation audit logs

### 4. Polished Modern UI/UX
- **Themes**: Dark, Light, and System Default.
- **Custom Accent Colors**: Amber (Marta classic), Blue, Violet, Emerald, Rose.
- **Customizable Sidebar**:
  - Quick Places (Home, Desktop, Documents, Downloads, Pictures, Music, Videos, Root)
  - Mounted Drives & SSDs with live capacity usage bars and free space indicators
  - User Custom Bookmarks (add current folder with one click)
  - Recent Locations history
- **Views**: Detailed Table, Compact List, and Icon/Grid thumbnails.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
|---|---|
| `F2` | Rename selected item inline |
| `F3` or `⌘F` | Recursive directory search |
| `F5` or `⌘R` | Refresh active pane |
| `F6` or `Tab` | Switch active pane |
| `Space` | Quick Look / Preview file |
| `⌥↵` (Alt+Enter) | Show detailed file properties & permissions |
| `⌘C` / `Ctrl+C` | Copy selected items |
| `⌘X` / `Ctrl+X` | Cut selected items |
| `⌘V` / `Ctrl+V` | Paste from clipboard |
| `⌘D` / `Ctrl+D` | Duplicate selected items |
| `⌘A` / `Ctrl+A` | Select all items |
| `⌘T` / `Ctrl+T` | Open new tab in current pane |
| `⌘W` / `Ctrl+W` | Close current tab |
| `⌘K` or `⌘P` | Open Command Palette |
| `⌘⇧N` | Create new folder |
| `⌘⇧R` | Batch rename selected files |
| `⌘.` | Toggle hidden files |
| `⌘1` / `⌘2` / `⌘3` | Dual Horizontal / Dual Vertical / Single Pane |
| `⌫` (Delete) | Move selected to Trash (or navigate up if none selected) |
| `⇧⌫` (Shift+Delete) | Permanent delete |

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, Zustand
- **Desktop Framework**: Tauri 2
- **Backend**: Rust 1.80+ (native multithreaded Tokio, walkdir, trash, zip, sysinfo, rusqlite)
- **Database**: SQLite embedded (`rusqlite`)
- **Testing**: Vitest, Rust `cargo test`

---

## 📦 Development & Build

### Prerequisites
- Node.js 18+ and npm
- Rust toolchain (`cargo`, `rustc`)

### Run Development
```bash
# Start frontend and Tauri 2 desktop window
npm run dev
# or
npx tauri dev
```

### Run Tests
```bash
# Frontend Unit Tests (Vitest)
npm test

# Backend Native Unit Tests (Rust)
cd src-tauri && cargo test
```

### Production Build
```bash
# Build web bundle
npm run build

# Build native desktop installer/bundle (.dmg on macOS, .msi on Windows, .AppImage/.deb on Linux)
npx tauri build
```
