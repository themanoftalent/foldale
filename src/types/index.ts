export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_symlink: boolean;
  is_hidden: boolean;
  size: number;
  modified?: number; // Unix timestamp in seconds
  created?: number;
  readonly: boolean;
  extension?: string;
  permissions: string;
  mime_type: string;
  symlink_target?: string;
}

export interface DirectoryListing {
  current_path: string;
  parent_path?: string;
  entries: FileEntry[];
  total_files: number;
  total_dirs: number;
  total_size: number;
  is_readable: boolean;
  is_writable: boolean;
}

export interface DetailedFileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  is_symlink: boolean;
  is_hidden: boolean;
  size: number;
  modified?: number;
  created?: number;
  accessed?: number;
  permissions: string;
  octal_permissions: string;
  readonly: boolean;
  extension?: string;
  mime_type: string;
  symlink_target?: string;
  line_count?: number;
}

export interface DriveInfo {
  name: string;
  mount_point: string;
  total_bytes: number;
  available_bytes: number;
  file_system: string;
  is_removable: boolean;
}

export interface SystemLocations {
  home: string;
  desktop: string;
  documents: string;
  downloads: string;
  pictures: string;
  music: string;
  videos: string;
  root: string;
}

export interface SearchQuery {
  directory: string;
  term: string;
  is_regex: boolean;
  case_sensitive: boolean;
  extension_filter?: string;
  min_size?: number;
  max_size?: number;
  min_modified?: number;
  max_results: number;
}

export interface SearchResultEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified?: number;
  extension?: string;
}

export interface ArchiveEntry {
  name: string;
  is_dir: boolean;
  size: number;
  compressed_size: number;
  modified?: number;
}

export interface RenameOperation {
  old_path: string;
  new_path: string;
}

export interface BatchRenameResult {
  succeeded: string[];
  failed: [string, string][];
}

export interface Bookmark {
  id: number;
  name: string;
  path: string;
  icon: string;
  order_index: number;
}

export interface OperationLog {
  id: number;
  op_type: string;
  source: string;
  destination?: string;
  timestamp: number;
  status: string;
  error_message?: string;
}

export interface DirSizeResult {
  path: string;
  total_bytes: number;
  file_count: number;
  dir_count: number;
}

export type PaneId = "left" | "right";
export type ViewMode = "list" | "detailed" | "grid";
export type SortField = "name" | "size" | "modified" | "extension" | "mime_type";
export type SortDirection = "asc" | "desc";
export type LayoutMode = "dual-horizontal" | "dual-vertical" | "single-left" | "single-right";

export interface TabItem {
  id: string;
  path: string;
  title: string;
  history: string[];
  historyIndex: number;
  filterText: string;
  viewMode: ViewMode;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedPaths: string[];
  cursorPath?: string;
}

export interface ClipboardItem {
  paths: string[];
  operation: "copy" | "cut";
}

export interface TransferTask {
  id: string;
  type: "copy" | "move" | "delete" | "archive" | "extract";
  sources: string[];
  destination?: string;
  progress: number; // 0 - 100
  status: "queued" | "running" | "paused" | "completed" | "failed";
  speed?: string;
  error?: string;
}
