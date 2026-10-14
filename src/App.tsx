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

export const App: React.FC = () => {
  const { init, theme, accentColor, layoutMode } = useFileManagerStore();

  // Initialize store and fetch directories
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

  // Bind global keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="w-screen h-screen flex flex-col bg-background text-foreground overflow-hidden font-sans select-none">
      {/* Top Application Header */}
      <Header />

      {/* Main Workspace */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Panes Container */}
        <main className="flex-1 flex min-w-0 min-h-0 overflow-hidden p-1 gap-1 bg-[#141518]">
          {layoutMode === "dual-horizontal" && (
            <>
              <FilePane paneId="left" />
              <FilePane paneId="right" />
            </>
          )}

          {layoutMode === "dual-vertical" && (
            <div className="flex-1 flex flex-col min-h-0 gap-1.5">
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
    </div>
  );
};

export default App;
