import React, { useEffect } from "react";
import { useFileManagerStore } from "./store/useFileManagerStore";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { FilePane } from "./components/Pane/FilePane";
import { PreviewModal } from "./components/Modals/PreviewModal";
import { CommandPalette } from "./components/Modals/CommandPalette";
import { BatchRenameModal } from "./components/Modals/BatchRenameModal";
import { PropertiesModal } from "./components/Modals/PropertiesModal";
import { SearchModal } from "./components/Modals/SearchModal";
import { NewItemModal } from "./components/Modals/NewItemModal";
import { ConflictModal } from "./components/Modals/ConflictModal";
import { ConfirmDeleteModal } from "./components/Modals/ConfirmDeleteModal";
import { UndoToast } from "./components/Modals/UndoToast";
import { SettingsModal } from "./components/Modals/SettingsModal";
import { FolderCustomizerModal } from "./components/Modals/FolderCustomizerModal";
import { AboutModal } from "./components/Modals/AboutModal";
import { listen } from "@tauri-apps/api/event";
import { isTauriEnvironment } from "./services/tauriBridge";

export const App: React.FC = () => {
  const {
    init,
    theme,
    accentColor,
    layoutMode,
    setAboutOpen,
    pendingConflict,
    setPendingConflict,
    resolveConflict,
    pendingDelete,
    setPendingDelete,
    confirmDelete,
    undoToastMessage,
    setUndoToastMessage,
    undoLastOperation,
  } = useFileManagerStore();

  // Initialize store and fetch directories & settings
  useEffect(() => {
    init();
  }, [init]);

  // Apply theme and accent color
  useEffect(() => {
    const root = document.documentElement;

    // Theme (dark / light / system)
    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", isDark);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }

    // Accent attribute
    root.setAttribute("data-accent", accentColor);
  }, [theme, accentColor]);

  // Auto-dismiss undo toast after 6 seconds
  useEffect(() => {
    if (undoToastMessage) {
      const timer = setTimeout(() => {
        setUndoToastMessage(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [undoToastMessage, setUndoToastMessage]);

  // Listen for native macOS menu "About Foldale" event
  useEffect(() => {
    if (!isTauriEnvironment()) return;
    let unlistenFn: (() => void) | undefined;
    listen("open-about", () => {
      setAboutOpen(true);
    }).then((unlisten) => {
      unlistenFn = unlisten;
    }).catch(console.error);

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [setAboutOpen]);

  // Bind global keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="w-screen h-screen flex flex-col bg-background text-foreground overflow-hidden font-sans select-none antialiased">
      {/* Top Application Header */}
      <Header />

      {/* Main Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Panes Container */}
        <main className="flex-1 flex min-w-0 min-h-0 overflow-hidden p-2 gap-2 bg-background">
          {layoutMode === "dual-horizontal" && (
            <>
              <FilePane paneId="left" />
              <FilePane paneId="right" />
            </>
          )}

          {layoutMode === "dual-vertical" && (
            <div className="flex-1 flex flex-col min-h-0 gap-2">
              <FilePane paneId="left" />
              <FilePane paneId="right" />
            </div>
          )}

          {layoutMode === "single-left" && <FilePane paneId="left" />}

          {layoutMode === "single-right" && <FilePane paneId="right" />}
        </main>
      </div>

      {/* Modals & Overlays */}
      <PreviewModal />
      <CommandPalette />
      <BatchRenameModal />
      <PropertiesModal />
      <SearchModal />
      <NewItemModal />
      <SettingsModal />
      <FolderCustomizerModal />
      <AboutModal />

      {/* File Conflict Resolution Dialog */}
      {pendingConflict && (
        <ConflictModal
          conflicts={pendingConflict.conflicts}
          isMove={pendingConflict.isMove}
          onResolve={(policy, applyToAll) => resolveConflict(policy, applyToAll)}
          onCancel={() => setPendingConflict(null)}
        />
      )}

      {/* Permanent Delete Confirmation Dialog */}
      {pendingDelete && (
        <ConfirmDeleteModal
          paths={pendingDelete.paths}
          permanent={pendingDelete.permanent}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {/* Undo Toast Notification */}
      {undoToastMessage && (
        <UndoToast
          message={undoToastMessage}
          onUndo={undoLastOperation}
          onDismiss={() => setUndoToastMessage(null)}
        />
      )}
    </div>
  );
};

export default App;
