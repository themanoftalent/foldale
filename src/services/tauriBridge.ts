import { invoke } from "@tauri-apps/api/core";
import {
  ArchiveEntry,
  BatchRenameResult,
  Bookmark,
  ConflictItem,
  ConflictPolicy,
  DetailedFileInfo,
  DirectoryListing,
  DirSizeResult,
  DriveInfo,
  OperationLog,
  RenameOperation,
  SearchQuery,
  SearchResultEntry,
  SystemLocations,
} from "../types";

export const isTauriEnvironment = (): boolean => {
  return typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
};

export const api = {
  // Directory & files
  listDirectory: async (path: string, showHidden: boolean): Promise<DirectoryListing> => {
    if (isTauriEnvironment()) {
      return await invoke<DirectoryListing>("list_directory", {
        path,
        showHidden,
        show_hidden: showHidden,
      });
    }
    // Web fallback for testing
    return {
      current_path: path || "/Users/darwin",
      parent_path: "/Users",
      entries: [
        { name: "Documents", path: `${path}/Documents`, is_dir: true, is_symlink: false, is_hidden: false, size: 0, permissions: "rwxr-xr-x", mime_type: "folder", readonly: false, modified: Date.now() / 1000 },
        { name: "Downloads", path: `${path}/Downloads`, is_dir: true, is_symlink: false, is_hidden: false, size: 0, permissions: "rwxr-xr-x", mime_type: "folder", readonly: false, modified: Date.now() / 1000 },
        { name: "Desktop", path: `${path}/Desktop`, is_dir: true, is_symlink: false, is_hidden: false, size: 0, permissions: "rwxr-xr-x", mime_type: "folder", readonly: false, modified: Date.now() / 1000 },
        { name: "Projects", path: `${path}/Projects`, is_dir: true, is_symlink: false, is_hidden: false, size: 0, permissions: "rwxr-xr-x", mime_type: "folder", readonly: false, modified: Date.now() / 1000 },
        { name: "README.md", path: `${path}/README.md`, is_dir: false, is_symlink: false, is_hidden: false, size: 4096, permissions: "rw-r--r--", mime_type: "text", extension: "md", readonly: false, modified: Date.now() / 1000 },
        { name: "app.ts", path: `${path}/app.ts`, is_dir: false, is_symlink: false, is_hidden: false, size: 1024, permissions: "rw-r--r--", mime_type: "code", extension: "ts", readonly: false, modified: Date.now() / 1000 },
      ],
      total_files: 2,
      total_dirs: 4,
      total_size: 5120,
      is_readable: true,
      is_writable: true,
    };
  },

  getFileInfo: async (path: string): Promise<DetailedFileInfo> => {
    if (isTauriEnvironment()) {
      return await invoke<DetailedFileInfo>("get_file_info", { path });
    }
    return {
      name: path.split("/").pop() || "file",
      path,
      is_dir: false,
      is_symlink: false,
      is_hidden: false,
      size: 4096,
      permissions: "rwxr-xr-x",
      octal_permissions: "755",
      readonly: false,
      mime_type: "text",
    };
  },

  calculateDirSize: async (path: string): Promise<DirSizeResult> => {
    if (isTauriEnvironment()) {
      return await invoke<DirSizeResult>("calculate_dir_size", { path });
    }
    return { path, total_bytes: 10485760, file_count: 42, dir_count: 5 };
  },

  createFile: async (path: string, initialContent?: string): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("create_file", { path, initialContent });
    }
  },

  createDirectory: async (path: string): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("create_directory", { path });
    }
  },

  setNativeFolderIcon: async (path: string, iconData: string | null): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("set_native_folder_icon", { path, iconData, icon_data: iconData });
    }
  },

  renameItem: async (oldPath: string, newPath: string): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("rename_item", { oldPath, newPath });
    }
  },

  batchRename: async (operations: RenameOperation[]): Promise<BatchRenameResult> => {
    if (isTauriEnvironment()) {
      return await invoke<BatchRenameResult>("batch_rename", { operations });
    }
    return { succeeded: operations.map((o) => o.new_path), failed: [] };
  },

  checkConflicts: async (sources: string[], destinationDir: string): Promise<ConflictItem[]> => {
    if (isTauriEnvironment()) {
      return await invoke<ConflictItem[]>("check_conflicts", { sources, destinationDir });
    }
    return [];
  },

  copyItemsWithPolicy: async (
    sources: string[],
    destinationDir: string,
    policy: ConflictPolicy
  ): Promise<[string, string][]> => {
    if (isTauriEnvironment()) {
      return await invoke<[string, string][]>("copy_items_with_policy", {
        sources,
        destinationDir,
        policy,
      });
    }
    return sources.map((s) => [s, `${destinationDir}/${s.split("/").pop()}`]);
  },

  moveItemsWithPolicy: async (
    sources: string[],
    destinationDir: string,
    policy: ConflictPolicy
  ): Promise<[string, string][]> => {
    if (isTauriEnvironment()) {
      return await invoke<[string, string][]>("move_items_with_policy", {
        sources,
        destinationDir,
        policy,
      });
    }
    return sources.map((s) => [s, `${destinationDir}/${s.split("/").pop()}`]);
  },

  undoLastOperation: async (): Promise<string> => {
    if (isTauriEnvironment()) {
      return await invoke<string>("undo_last_operation");
    }
    return "Undone";
  },

  copyItems: async (sources: string[], destinationDir: string, overwrite: boolean): Promise<string[]> => {
    if (isTauriEnvironment()) {
      return await invoke<string[]>("copy_items", { sources, destinationDir, overwrite });
    }
    return sources;
  },

  moveItems: async (sources: string[], destinationDir: string, overwrite: boolean): Promise<string[]> => {
    if (isTauriEnvironment()) {
      return await invoke<string[]>("move_items", { sources, destinationDir, overwrite });
    }
    return sources;
  },

  deleteItems: async (paths: string[], permanent: boolean): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("delete_items", { paths, permanent });
    }
  },

  duplicateItem: async (path: string): Promise<string> => {
    if (isTauriEnvironment()) {
      return await invoke<string>("duplicate_item", { path });
    }
    return `${path} copy`;
  },

  createSymlink: async (target: string, linkPath: string): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("create_symlink", { target, linkPath });
    }
  },

  readTextPreview: async (path: string, maxBytes?: number): Promise<string> => {
    if (isTauriEnvironment()) {
      return await invoke<string>("read_text_preview", { path, maxBytes });
    }
    return `Preview of ${path}\nCreated for Foldale dual-pane file manager.`;
  },

  readFileBase64: async (path: string): Promise<string> => {
    if (isTauriEnvironment()) {
      return await invoke<string>("read_file_base64", { path });
    }
    return "";
  },

  searchDirectory: async (query: SearchQuery): Promise<SearchResultEntry[]> => {
    if (isTauriEnvironment()) {
      return await invoke<SearchResultEntry[]>("search_directory", { query });
    }
    return [];
  },

  listArchiveContents: async (archivePath: string): Promise<ArchiveEntry[]> => {
    if (isTauriEnvironment()) {
      return await invoke<ArchiveEntry[]>("list_archive_contents", { archivePath });
    }
    return [];
  },

  createZipArchive: async (sources: string[], archivePath: string): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("create_zip_archive", { sources, archivePath });
    }
  },

  extractArchive: async (archivePath: string, destinationDir: string): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("extract_archive", { archivePath, destinationDir });
    }
  },

  getSystemLocations: async (): Promise<SystemLocations> => {
    if (isTauriEnvironment()) {
      return await invoke<SystemLocations>("get_system_locations");
    }
    return {
      home: "/Users/darwin",
      desktop: "/Users/darwin/Desktop",
      documents: "/Users/darwin/Documents",
      downloads: "/Users/darwin/Downloads",
      pictures: "/Users/darwin/Pictures",
      music: "/Users/darwin/Music",
      videos: "/Users/darwin/Movies",
      root: "/",
    };
  },

  getMountedDrives: async (): Promise<DriveInfo[]> => {
    if (isTauriEnvironment()) {
      return await invoke<DriveInfo[]>("get_mounted_drives");
    }
    return [
      {
        name: "Macintosh HD",
        mount_point: "/",
        total_bytes: 494384128000,
        available_bytes: 215438412000,
        file_system: "apfs",
        is_removable: false,
      },
    ];
  },

  revealInOs: async (path: string): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("reveal_in_os", { path });
    }
  },

  revealInOS: async (path: string): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("reveal_in_os", { path });
    }
  },

  openWithDefaultApp: async (path: string): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("open_with_default_app", { path });
    } else if (typeof window !== "undefined" && (path.startsWith("http://") || path.startsWith("https://"))) {
      window.open(path, "_blank", "noopener,noreferrer");
    }
  },

  openInTerminal: async (dirPath: string): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("open_in_terminal", { dirPath });
    }
  },

  getBookmarks: async (): Promise<Bookmark[]> => {
    if (isTauriEnvironment()) {
      return await invoke<Bookmark[]>("get_bookmarks");
    }
    return [
      { id: 1, name: "Home", path: "/Users/darwin", icon: "home", order_index: 0 },
      { id: 2, name: "Documents", path: "/Users/darwin/Documents", icon: "file-text", order_index: 1 },
      { id: 3, name: "Downloads", path: "/Users/darwin/Downloads", icon: "download", order_index: 2 },
      { id: 4, name: "Desktop", path: "/Users/darwin/Desktop", icon: "monitor", order_index: 3 },
    ];
  },

  addBookmark: async (name: string, path: string, icon: string): Promise<Bookmark> => {
    if (isTauriEnvironment()) {
      return await invoke<Bookmark>("add_bookmark", { name, path, icon });
    }
    return { id: Date.now(), name, path, icon, order_index: 99 };
  },

  removeBookmark: async (id: number): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("remove_bookmark", { id });
    }
  },

  getRecentHistory: async (limit?: number): Promise<string[]> => {
    if (isTauriEnvironment()) {
      return await invoke<string[]>("get_recent_history", { limit });
    }
    return ["/Users/darwin", "/Users/darwin/Downloads"];
  },

  getSetting: async (key: string): Promise<string | null> => {
    if (isTauriEnvironment()) {
      return await invoke<string | null>("get_setting", { key });
    }
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(`foldale_${key}`);
    }
    return null;
  },

  setSetting: async (key: string, value: string): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("set_setting", { key, value });
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`foldale_${key}`, value);
    }
  },

  getAllSettings: async (): Promise<Record<string, string>> => {
    if (isTauriEnvironment()) {
      return await invoke<Record<string, string>>("get_all_settings");
    }
    const res: Record<string, string> = {};
    if (typeof localStorage !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("foldale_")) {
          res[k.replace("foldale_", "")] = localStorage.getItem(k) || "";
        }
      }
    }
    return res;
  },

  getOperationLogs: async (limit?: number): Promise<OperationLog[]> => {
    if (isTauriEnvironment()) {
      return await invoke<OperationLog[]>("get_operation_logs", { limit });
    }
    return [];
  },

  getAutostart: async (): Promise<boolean> => {
    if (isTauriEnvironment()) {
      return await invoke<boolean>("get_autostart");
    }
    return false;
  },

  setAutostart: async (enabled: boolean): Promise<void> => {
    if (isTauriEnvironment()) {
      await invoke("set_autostart", { enabled });
    }
  },
};
