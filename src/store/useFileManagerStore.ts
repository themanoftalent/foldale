import { create } from "zustand";
import { api } from "../services/tauriBridge";
import {
  Bookmark,
  ClipboardItem,
  ConflictItem,
  ConflictPolicy,
  DirectoryListing,
  DriveInfo,
  LayoutMode,
  PaneId,
  SortDirection,
  SortField,
  SystemLocations,
  TabItem,
  TransferTask,
  ViewMode,
} from "../types";

export interface PaneState {
  tabs: TabItem[];
  activeTabId: string;
  listing: DirectoryListing | null;
  loading: boolean;
  error: string | null;
}

export interface PendingConflict {
  sources: string[];
  destination: string;
  isMove: boolean;
  conflicts: ConflictItem[];
}

export interface PendingDelete {
  paths: string[];
  permanent: boolean;
}

interface FileManagerStore {
  // Global View Options
  activePane: PaneId;
  layoutMode: LayoutMode;
  showHiddenFiles: boolean;
  theme: "dark" | "light" | "system";
  accentColor: "amber" | "blue" | "violet" | "emerald" | "rose";
  density: "compact" | "normal" | "relaxed";
  sidebarCollapsed: boolean;

  // System & Environment
  systemLocations: SystemLocations | null;
  mountedDrives: DriveInfo[];
  bookmarks: Bookmark[];

  // Panes State
  leftPane: PaneState;
  rightPane: PaneState;

  // Clipboard & Queue
  clipboard: ClipboardItem | null;
  transferQueue: TransferTask[];

  // Modals & Panels
  previewPath: string | null;
  propertiesPath: string | null;
  searchOpen: boolean;
  batchRenameOpen: boolean;
  commandPaletteOpen: boolean;
  newFolderOpen: boolean;
  newFileOpen: boolean;
  settingsOpen: boolean;
  colorfulFolders: boolean;
  confirmTrashPrompt: boolean;
  defaultConflictPolicy: ConflictPolicy | "ask";

  // Safety & Conflict Management
  pendingConflict: PendingConflict | null;
  pendingDelete: PendingDelete | null;
  undoToastMessage: string | null;

  // Actions
  init: () => Promise<void>;
  setActivePane: (pane: PaneId) => void;
  toggleActivePane: () => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setShowHiddenFiles: (show: boolean) => void;
  toggleHiddenFiles: () => void;
  setTheme: (theme: "dark" | "light" | "system") => void;
  setAccentColor: (accent: "amber" | "blue" | "violet" | "emerald" | "rose") => void;
  setDensity: (density: "compact" | "normal" | "relaxed") => void;
  toggleSidebar: () => void;

  // Tab & Navigation Actions
  navigateTo: (pane: PaneId, path: string, addToHistory?: boolean) => Promise<void>;
  navigateUp: (pane: PaneId) => Promise<void>;
  navigateBack: (pane: PaneId) => Promise<void>;
  navigateForward: (pane: PaneId) => Promise<void>;
  refreshPane: (pane: PaneId) => Promise<void>;

  createTab: (pane: PaneId, path?: string) => Promise<void>;
  closeTab: (pane: PaneId, tabId: string) => void;
  setActiveTab: (pane: PaneId, tabId: string) => Promise<void>;

  setTabFilter: (pane: PaneId, text: string) => void;
  setTabViewMode: (pane: PaneId, mode: ViewMode) => void;
  setTabSorting: (pane: PaneId, field: SortField, dir?: SortDirection) => void;

  // Selection
  selectItem: (pane: PaneId, path: string, multi?: boolean, range?: boolean, orderedPaths?: string[]) => void;
  selectAll: (pane: PaneId) => void;
  clearSelection: (pane: PaneId) => void;
  invertSelection: (pane: PaneId) => void;

  // Clipboard & File Actions
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: () => Promise<void>;
  deleteSelection: (permanent?: boolean) => Promise<void>;
  duplicateSelection: () => Promise<void>;

  // Safe Conflict & Delete Handling
  setPendingConflict: (conflict: PendingConflict | null) => void;
  resolveConflict: (policy: ConflictPolicy, applyToAll: boolean) => Promise<void>;
  setPendingDelete: (del: PendingDelete | null) => void;
  confirmDelete: () => Promise<void>;

  // Undo Management
  setUndoToastMessage: (msg: string | null) => void;
  undoLastOperation: () => Promise<void>;

  // Bookmarks
  addBookmark: (name: string, path: string, icon?: string) => Promise<void>;
  removeBookmark: (id: number) => Promise<void>;

  // Modals
  setPreviewPath: (path: string | null) => void;
  setPropertiesPath: (path: string | null) => void;
  setSearchOpen: (open: boolean) => void;
  setBatchRenameOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setNewFolderOpen: (open: boolean) => void;
  setNewFileOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setColorfulFolders: (enabled: boolean) => void;
  setConfirmTrashPrompt: (enabled: boolean) => void;
  setDefaultConflictPolicy: (policy: ConflictPolicy | "ask") => void;
}

const initialTab = (id: string, path: string): TabItem => ({
  id,
  path,
  title: path.split("/").pop() || "Home",
  history: [path],
  historyIndex: 0,
  filterText: "",
  viewMode: "detailed",
  sortField: "name",
  sortDirection: "asc",
  selectedPaths: [],
});

export const useFileManagerStore = create<FileManagerStore>((set, get) => ({
  activePane: "left",
  layoutMode: "dual-horizontal",
  showHiddenFiles: false,
  theme: "light",
  accentColor: "blue",
  density: "normal",
  sidebarCollapsed: false,

  systemLocations: null,
  mountedDrives: [],
  bookmarks: [],

  leftPane: {
    tabs: [initialTab("tab-left-1", "")],
    activeTabId: "tab-left-1",
    listing: null,
    loading: false,
    error: null,
  },
  rightPane: {
    tabs: [initialTab("tab-right-1", "")],
    activeTabId: "tab-right-1",
    listing: null,
    loading: false,
    error: null,
  },

  clipboard: null,
  transferQueue: [],

  previewPath: null,
  propertiesPath: null,
  searchOpen: false,
  batchRenameOpen: false,
  commandPaletteOpen: false,
  newFolderOpen: false,
  newFileOpen: false,
  settingsOpen: false,
  colorfulFolders: true,
  confirmTrashPrompt: false,
  defaultConflictPolicy: "ask",

  pendingConflict: null,
  pendingDelete: null,
  undoToastMessage: null,

  init: async () => {
    try {
      // Load persistent settings
      const settings = await api.getAllSettings();
      if (settings.theme && (settings.theme === "dark" || settings.theme === "light" || settings.theme === "system")) {
        set({ theme: settings.theme });
      }
      if (settings.accentColor) {
        set({ accentColor: settings.accentColor as any });
      }
      if (settings.layoutMode) {
        set({ layoutMode: settings.layoutMode as any });
      }
      if (settings.showHiddenFiles !== undefined) {
        set({ showHiddenFiles: settings.showHiddenFiles === "true" });
      }
      if (settings.density) {
        set({ density: settings.density as any });
      }
      if (settings.colorfulFolders !== undefined) {
        set({ colorfulFolders: settings.colorfulFolders === "true" });
      }
      if (settings.confirmTrashPrompt !== undefined) {
        set({ confirmTrashPrompt: settings.confirmTrashPrompt === "true" });
      }
      if (settings.defaultConflictPolicy) {
        set({ defaultConflictPolicy: settings.defaultConflictPolicy as any });
      }

      const locations = await api.getSystemLocations();
      const drives = await api.getMountedDrives();
      const bookmarks = await api.getBookmarks();
      const initialPath = locations.home;

      set((state) => ({
        systemLocations: locations,
        mountedDrives: drives,
        bookmarks,
        leftPane: {
          ...state.leftPane,
          tabs: [initialTab("tab-left-1", initialPath)],
          activeTabId: "tab-left-1",
        },
        rightPane: {
          ...state.rightPane,
          tabs: [initialTab("tab-right-1", locations.downloads || initialPath)],
          activeTabId: "tab-right-1",
        },
      }));

      // Load both initial panes
      await Promise.all([
        get().navigateTo("left", initialPath, false),
        get().navigateTo("right", locations.downloads || initialPath, false),
      ]);
    } catch (e) {
      console.error("Failed to initialize Foldale store:", e);
    }
  },

  setActivePane: (pane) => set({ activePane: pane }),
  toggleActivePane: () => set((state) => ({ activePane: state.activePane === "left" ? "right" : "left" })),
  setLayoutMode: (mode) => {
    set({ layoutMode: mode });
    api.setSetting("layoutMode", mode);
  },
  setShowHiddenFiles: (show) => {
    set({ showHiddenFiles: show });
    api.setSetting("showHiddenFiles", String(show));
    get().refreshPane("left");
    get().refreshPane("right");
  },
  toggleHiddenFiles: () => {
    const show = !get().showHiddenFiles;
    get().setShowHiddenFiles(show);
  },
  setTheme: (theme) => {
    set({ theme });
    api.setSetting("theme", theme);
  },
  setAccentColor: (accentColor) => {
    set({ accentColor });
    api.setSetting("accentColor", accentColor);
  },
  setDensity: (density) => {
    set({ density });
    api.setSetting("density", density);
  },
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  navigateTo: async (pane, path, addToHistory = true) => {
    const state = get();
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    const currentPane = state[paneKey];
    const activeTab = currentPane.tabs.find((t) => t.id === currentPane.activeTabId);
    if (!activeTab) return;

    set({
      [paneKey]: {
        ...currentPane,
        loading: true,
        error: null,
      },
    });

    try {
      const listing = await api.listDirectory(path, state.showHiddenFiles);
      const canonicalPath = listing.current_path;
      const title = canonicalPath.split("/").pop() || "Root";

      let newHistory = [...activeTab.history];
      let newIndex = activeTab.historyIndex;

      if (addToHistory && canonicalPath !== activeTab.path) {
        newHistory = newHistory.slice(0, newIndex + 1);
        newHistory.push(canonicalPath);
        newIndex = newHistory.length - 1;
      }

      set((s) => {
        const p = s[paneKey];
        return {
          [paneKey]: {
            ...p,
            listing,
            loading: false,
            error: null,
            tabs: p.tabs.map((tab) =>
              tab.id === p.activeTabId
                ? {
                    ...tab,
                    path: canonicalPath,
                    title,
                    history: newHistory,
                    historyIndex: newIndex,
                    selectedPaths: [],
                    cursorPath: listing.entries[0]?.path,
                  }
                : tab
            ),
          },
        };
      });
    } catch (err: any) {
      set({
        [paneKey]: {
          ...currentPane,
          loading: false,
          error: err?.message || String(err),
        },
      });
    }
  },

  navigateUp: async (pane) => {
    const state = get();
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    const parentPath = state[paneKey].listing?.parent_path;
    if (parentPath) {
      await get().navigateTo(pane, parentPath);
    }
  },

  navigateBack: async (pane) => {
    const state = get();
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    const p = state[paneKey];
    const tab = p.tabs.find((t) => t.id === p.activeTabId);
    if (tab && tab.historyIndex > 0) {
      const targetPath = tab.history[tab.historyIndex - 1];
      await get().navigateTo(pane, targetPath, false);
      set((s) => ({
        [paneKey]: {
          ...s[paneKey],
          tabs: s[paneKey].tabs.map((t) =>
            t.id === p.activeTabId ? { ...t, historyIndex: tab.historyIndex - 1 } : t
          ),
        },
      }));
    }
  },

  navigateForward: async (pane) => {
    const state = get();
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    const p = state[paneKey];
    const tab = p.tabs.find((t) => t.id === p.activeTabId);
    if (tab && tab.historyIndex < tab.history.length - 1) {
      const targetPath = tab.history[tab.historyIndex + 1];
      await get().navigateTo(pane, targetPath, false);
      set((s) => ({
        [paneKey]: {
          ...s[paneKey],
          tabs: s[paneKey].tabs.map((t) =>
            t.id === p.activeTabId ? { ...t, historyIndex: tab.historyIndex + 1 } : t
          ),
        },
      }));
    }
  },

  refreshPane: async (pane) => {
    const state = get();
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    const currentPath = state[paneKey].listing?.current_path;
    if (currentPath) {
      await get().navigateTo(pane, currentPath, false);
    }
  },

  createTab: async (pane, path) => {
    const state = get();
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    const p = state[paneKey];
    const defaultPath = path || p.listing?.current_path || state.systemLocations?.home || "/";
    const newId = `tab-${pane}-${Date.now()}`;
    const newTab = initialTab(newId, defaultPath);

    set({
      [paneKey]: {
        ...p,
        tabs: [...p.tabs, newTab],
        activeTabId: newId,
      },
    });

    await get().navigateTo(pane, defaultPath, false);
  },

  closeTab: (pane, tabId) => {
    const state = get();
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    const p = state[paneKey];
    if (p.tabs.length <= 1) return; // Keep at least one tab

    const remainingTabs = p.tabs.filter((t) => t.id !== tabId);
    const newActiveId =
      p.activeTabId === tabId ? remainingTabs[remainingTabs.length - 1].id : p.activeTabId;

    set({
      [paneKey]: {
        ...p,
        tabs: remainingTabs,
        activeTabId: newActiveId,
      },
    });

    const activeTab = remainingTabs.find((t) => t.id === newActiveId);
    if (activeTab) {
      get().navigateTo(pane, activeTab.path, false);
    }
  },

  setActiveTab: async (pane, tabId) => {
    const state = get();
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    const p = state[paneKey];
    const tab = p.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    set({
      [paneKey]: {
        ...p,
        activeTabId: tabId,
      },
    });

    await get().navigateTo(pane, tab.path, false);
  },

  setTabFilter: (pane, text) => {
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    set((s) => ({
      [paneKey]: {
        ...s[paneKey],
        tabs: s[paneKey].tabs.map((t) => (t.id === s[paneKey].activeTabId ? { ...t, filterText: text } : t)),
      },
    }));
  },

  setTabViewMode: (pane, mode) => {
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    set((s) => ({
      [paneKey]: {
        ...s[paneKey],
        tabs: s[paneKey].tabs.map((t) => (t.id === s[paneKey].activeTabId ? { ...t, viewMode: mode } : t)),
      },
    }));
  },

  setTabSorting: (pane, field, dir) => {
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    set((s) => {
      const p = s[paneKey];
      return {
        [paneKey]: {
          ...p,
          tabs: p.tabs.map((t) => {
            if (t.id !== p.activeTabId) return t;
            const newDir = dir ?? (t.sortField === field && t.sortDirection === "asc" ? "desc" : "asc");
            return {
              ...t,
              sortField: field,
              sortDirection: newDir,
            };
          }),
        },
      };
    });
  },

  // Selection
  selectItem: (pane, path, multi = false, range = false, orderedPaths?: string[]) => {
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    set((s) => {
      const p = s[paneKey];
      return {
        [paneKey]: {
          ...p,
          tabs: p.tabs.map((t) => {
            if (t.id !== p.activeTabId) return t;
            let newSelection = [...t.selectedPaths];

            if (range && t.cursorPath) {
              const pathsList = orderedPaths || p.listing?.entries.map((e) => e.path) || [];
              const fromIdx = pathsList.indexOf(t.cursorPath);
              const toIdx = pathsList.indexOf(path);
              if (fromIdx !== -1 && toIdx !== -1) {
                const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
                newSelection = pathsList.slice(start, end + 1);
              }
            } else if (multi) {
              if (newSelection.includes(path)) {
                newSelection = newSelection.filter((p) => p !== path);
              } else {
                newSelection.push(path);
              }
            } else {
              newSelection = [path];
            }

            return {
              ...t,
              selectedPaths: newSelection,
              cursorPath: path,
            };
          }),
        },
      };
    });
  },

  selectAll: (pane) => {
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    set((s) => {
      const p = s[paneKey];
      const allPaths = p.listing?.entries.map((e) => e.path) || [];
      return {
        [paneKey]: {
          ...p,
          tabs: p.tabs.map((t) => (t.id === p.activeTabId ? { ...t, selectedPaths: allPaths } : t)),
        },
      };
    });
  },

  clearSelection: (pane) => {
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    set((s) => ({
      [paneKey]: {
        ...s[paneKey],
        tabs: s[paneKey].tabs.map((t) => (t.id === s[paneKey].activeTabId ? { ...t, selectedPaths: [] } : t)),
      },
    }));
  },

  invertSelection: (pane) => {
    const paneKey = pane === "left" ? "leftPane" : "rightPane";
    set((s) => {
      const p = s[paneKey];
      const allEntries = p.listing?.entries || [];
      return {
        [paneKey]: {
          ...p,
          tabs: p.tabs.map((t) => {
            if (t.id !== p.activeTabId) return t;
            const currentSelected = new Set(t.selectedPaths);
            const inverted = allEntries
              .filter((e) => !currentSelected.has(e.path))
              .map((e) => e.path);
            return {
              ...t,
              selectedPaths: inverted,
            };
          }),
        },
      };
    });
  },

  // Clipboard & File Actions
  copySelection: () => {
    const state = get();
    const activePane = state.activePane === "left" ? state.leftPane : state.rightPane;
    const tab = activePane.tabs.find((t) => t.id === activePane.activeTabId);
    if (!tab || tab.selectedPaths.length === 0) return;

    set({
      clipboard: {
        paths: tab.selectedPaths,
        operation: "copy",
      },
    });
  },

  cutSelection: () => {
    const state = get();
    const activePane = state.activePane === "left" ? state.leftPane : state.rightPane;
    const tab = activePane.tabs.find((t) => t.id === activePane.activeTabId);
    if (!tab || tab.selectedPaths.length === 0) return;

    set({
      clipboard: {
        paths: tab.selectedPaths,
        operation: "cut",
      },
    });
  },

  pasteClipboard: async () => {
    const state = get();
    if (!state.clipboard || state.clipboard.paths.length === 0) return;

    const activePane = state.activePane === "left" ? state.leftPane : state.rightPane;
    const destDir = activePane.listing?.current_path;
    if (!destDir) return;

    const sources = state.clipboard.paths;
    const isMove = state.clipboard.operation === "cut";

    try {
      // Check for conflicts first
      const conflicts = await api.checkConflicts(sources, destDir);
      if (conflicts.length > 0) {
        set({
          pendingConflict: {
            sources,
            destination: destDir,
            isMove,
            conflicts,
          },
        });
        return;
      }

      if (isMove) {
        await api.moveItemsWithPolicy(sources, destDir, "replace");
        set({
          clipboard: null,
          undoToastMessage: `Moved ${sources.length} item(s)`,
        });
      } else {
        await api.copyItemsWithPolicy(sources, destDir, "keep_both");
        set({
          undoToastMessage: `Copied ${sources.length} item(s)`,
        });
      }

      await get().refreshPane("left");
      await get().refreshPane("right");
    } catch (err) {
      console.error("Paste operation failed:", err);
    }
  },

  deleteSelection: async (permanent = false) => {
    const state = get();
    const activePane = state.activePane === "left" ? state.leftPane : state.rightPane;
    const tab = activePane.tabs.find((t) => t.id === activePane.activeTabId);
    if (!tab || tab.selectedPaths.length === 0) return;

    if (permanent) {
      // Show confirmation dialog before permanently deleting
      set({ pendingDelete: { paths: tab.selectedPaths, permanent: true } });
      return;
    }

    if (state.confirmTrashPrompt) {
      // Show confirmation dialog before moving to Trash if setting is enabled
      set({ pendingDelete: { paths: tab.selectedPaths, permanent: false } });
      return;
    }

    try {
      await api.deleteItems(tab.selectedPaths, false);
      set({ undoToastMessage: `Moved ${tab.selectedPaths.length} item(s) to Trash` });
      await get().refreshPane("left");
      await get().refreshPane("right");
    } catch (err) {
      console.error("Delete operation failed:", err);
    }
  },

  duplicateSelection: async () => {
    const state = get();
    const activePane = state.activePane === "left" ? state.leftPane : state.rightPane;
    const tab = activePane.tabs.find((t) => t.id === activePane.activeTabId);
    if (!tab || tab.selectedPaths.length === 0) return;

    try {
      for (const p of tab.selectedPaths) {
        await api.duplicateItem(p);
      }
      await get().refreshPane(state.activePane);
    } catch (err) {
      console.error("Duplicate failed:", err);
    }
  },

  // Safe Conflict & Delete Handling
  setPendingConflict: (conflict) => set({ pendingConflict: conflict }),
  resolveConflict: async (policy: ConflictPolicy, _applyToAll: boolean) => {
    const state = get();
    const pending = state.pendingConflict;
    if (!pending) return;

    try {
      if (pending.isMove) {
        await api.moveItemsWithPolicy(pending.sources, pending.destination, policy);
        set({
          clipboard: null,
          undoToastMessage: `Moved ${pending.sources.length} item(s)`,
        });
      } else {
        await api.copyItemsWithPolicy(pending.sources, pending.destination, policy);
        set({
          undoToastMessage: `Copied ${pending.sources.length} item(s)`,
        });
      }

      set({ pendingConflict: null });
      await get().refreshPane("left");
      await get().refreshPane("right");
    } catch (err) {
      console.error("Failed to resolve conflict:", err);
    }
  },

  setPendingDelete: (del) => set({ pendingDelete: del }),
  confirmDelete: async () => {
    const state = get();
    const pending = state.pendingDelete;
    if (!pending) return;

    try {
      await api.deleteItems(pending.paths, pending.permanent);
      set({ pendingDelete: null });
      await get().refreshPane("left");
      await get().refreshPane("right");
    } catch (err) {
      console.error("Permanent delete failed:", err);
    }
  },

  // Undo Management
  setUndoToastMessage: (msg) => set({ undoToastMessage: msg }),
  undoLastOperation: async () => {
    try {
      const msg = await api.undoLastOperation();
      set({ undoToastMessage: msg });
      await get().refreshPane("left");
      await get().refreshPane("right");
    } catch (err: any) {
      console.error("Undo failed:", err);
    }
  },

  // Bookmarks
  addBookmark: async (name, path, icon = "folder") => {
    try {
      const b = await api.addBookmark(name, path, icon);
      set((s) => ({ bookmarks: [...s.bookmarks, b] }));
    } catch (err) {
      console.error("Add bookmark failed:", err);
    }
  },

  removeBookmark: async (id) => {
    try {
      await api.removeBookmark(id);
      set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) }));
    } catch (err) {
      console.error("Remove bookmark failed:", err);
    }
  },

  // Modals
  setPreviewPath: (path) => set({ previewPath: path }),
  setPropertiesPath: (path) => set({ propertiesPath: path }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setBatchRenameOpen: (open) => set({ batchRenameOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setNewFolderOpen: (open) => set({ newFolderOpen: open }),
  setNewFileOpen: (open) => set({ newFileOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setColorfulFolders: (enabled) => {
    set({ colorfulFolders: enabled });
    api.setSetting("colorfulFolders", String(enabled));
  },
  setConfirmTrashPrompt: (enabled) => {
    set({ confirmTrashPrompt: enabled });
    api.setSetting("confirmTrashPrompt", String(enabled));
  },
  setDefaultConflictPolicy: (policy) => {
    set({ defaultConflictPolicy: policy });
    api.setSetting("defaultConflictPolicy", policy);
  },
}));
