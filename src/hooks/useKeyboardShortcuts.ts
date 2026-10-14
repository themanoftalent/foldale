import { useEffect } from "react";
import { useFileManagerStore } from "../store/useFileManagerStore";

export function useKeyboardShortcuts() {
  const {
    activePane,
    toggleActivePane,
    refreshPane,
    navigateUp,
    createTab,
    closeTab,
    selectAll,
    copySelection,
    cutSelection,
    pasteClipboard,
    deleteSelection,
    duplicateSelection,
    toggleHiddenFiles,
    setLayoutMode,
    previewPath,
    setPreviewPath,
    setPropertiesPath,
    setSearchOpen,
    setCommandPaletteOpen,
    setNewFolderOpen,
    setBatchRenameOpen,
    undoLastOperation,
    leftPane,
    rightPane,
  } = useFileManagerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Global shortcuts (even when input might not be focused)

      // Command Palette: ⌘K or ⌘P or Ctrl+K / Ctrl+P
      if (cmdOrCtrl && (e.key === "k" || e.key === "p" || e.key === "K" || e.key === "P")) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Search: F3 or ⌘F
      if (e.key === "F3" || (cmdOrCtrl && (e.key === "f" || e.key === "F"))) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      // If user is currently typing in an input, do not capture file navigation shortcuts
      if (isInput) {
        if (e.key === "Escape") {
          target.blur();
        }
        return;
      }

      const paneState = activePane === "left" ? leftPane : rightPane;
      const currentTab = paneState.tabs.find((t) => t.id === paneState.activeTabId);
      const selectedPaths = currentTab?.selectedPaths || [];
      const currentPath = currentTab?.path || "";

      // Switch active pane: F6 or Tab
      if (e.key === "F6" || e.key === "Tab") {
        e.preventDefault();
        toggleActivePane();
        return;
      }

      // Undo: ⌘Z / Ctrl+Z
      if (cmdOrCtrl && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        undoLastOperation();
        return;
      }

      // Batch Rename shortcut: ⌘⇧R (Check BEFORE ⌘R)
      if (cmdOrCtrl && e.shiftKey && (e.key === "R" || e.key === "r")) {
        e.preventDefault();
        if (selectedPaths.length > 1) {
          setBatchRenameOpen(true);
        }
        return;
      }

      // Refresh: F5 or ⌘R (only if shiftKey is false)
      if (e.key === "F5" || (cmdOrCtrl && !e.shiftKey && (e.key === "r" || e.key === "R"))) {
        e.preventDefault();
        refreshPane(activePane);
        return;
      }

      // Space: Toggle Quick Preview (Quick Look)
      if (e.key === " ") {
        e.preventDefault();
        if (previewPath) {
          setPreviewPath(null);
        } else if (selectedPaths.length > 0) {
          setPreviewPath(selectedPaths[0]);
        }
        return;
      }

      // Properties: Alt+Enter / Option+Enter
      if (e.altKey && e.key === "Enter") {
        e.preventDefault();
        if (selectedPaths.length > 0) {
          setPropertiesPath(selectedPaths[0]);
        } else if (currentPath) {
          setPropertiesPath(currentPath);
        }
        return;
      }

      // New Folder: ⌘⇧N / Ctrl+Shift+N
      if (cmdOrCtrl && e.shiftKey && (e.key === "N" || e.key === "n")) {
        e.preventDefault();
        setNewFolderOpen(true);
        return;
      }

      // New Tab: ⌘T / Ctrl+T
      if (cmdOrCtrl && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        createTab(activePane);
        return;
      }

      // Close Tab: ⌘W / Ctrl+W
      if (cmdOrCtrl && (e.key === "w" || e.key === "W")) {
        e.preventDefault();
        if (currentTab) {
          closeTab(activePane, currentTab.id);
        }
        return;
      }

      // Copy: ⌘C / Ctrl+C
      if (cmdOrCtrl && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        copySelection();
        return;
      }

      // Cut: ⌘X / Ctrl+X
      if (cmdOrCtrl && (e.key === "x" || e.key === "X")) {
        e.preventDefault();
        cutSelection();
        return;
      }

      // Paste: ⌘V / Ctrl+V
      if (cmdOrCtrl && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      // Duplicate: ⌘D / Ctrl+D
      if (cmdOrCtrl && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        duplicateSelection();
        return;
      }

      // Select All: ⌘A / Ctrl+A
      if (cmdOrCtrl && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        selectAll(activePane);
        return;
      }

      // Toggle Hidden Files: ⌘. / Ctrl+.
      if (cmdOrCtrl && e.key === ".") {
        e.preventDefault();
        toggleHiddenFiles();
        return;
      }

      // Layout shortcuts: ⌘1, ⌘2, ⌘3
      if (cmdOrCtrl && e.key === "1") {
        e.preventDefault();
        setLayoutMode("dual-horizontal");
        return;
      }
      if (cmdOrCtrl && e.key === "2") {
        e.preventDefault();
        setLayoutMode("dual-vertical");
        return;
      }
      if (cmdOrCtrl && e.key === "3") {
        e.preventDefault();
        setLayoutMode("single-left");
        return;
      }

      // Delete / Trash (Shift+Delete safely triggers confirmation dialog)
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedPaths.length > 0) {
          e.preventDefault();
          const permanent = e.shiftKey;
          deleteSelection(permanent);
        } else if (e.key === "Backspace") {
          e.preventDefault();
          navigateUp(activePane);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activePane,
    toggleActivePane,
    refreshPane,
    navigateUp,
    createTab,
    closeTab,
    selectAll,
    copySelection,
    cutSelection,
    pasteClipboard,
    deleteSelection,
    duplicateSelection,
    toggleHiddenFiles,
    setLayoutMode,
    previewPath,
    setPreviewPath,
    setPropertiesPath,
    setSearchOpen,
    setCommandPaletteOpen,
    setNewFolderOpen,
    setBatchRenameOpen,
    undoLastOperation,
    leftPane,
    rightPane,
  ]);
}
