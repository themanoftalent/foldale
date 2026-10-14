import React from "react";
import {
  Columns2,
  Rows2,
  Square,
  Search,
  Terminal,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Laptop,
  Command,
  FolderSync,
  Trash2,
  Settings,
} from "lucide-react";
import { useFileManagerStore } from "../store/useFileManagerStore";
import { api } from "../services/tauriBridge";

export const Header: React.FC = () => {
  const {
    activePane,
    layoutMode,
    setLayoutMode,
    showHiddenFiles,
    toggleHiddenFiles,
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    leftPane,
    rightPane,
    refreshPane,
    deleteSelection,
    setSearchOpen,
    setCommandPaletteOpen,
    setSettingsOpen,
    setNewFolderOpen,
    setNewFileOpen,
    transferQueue,
  } = useFileManagerStore();

  const currentPaneState = activePane === "left" ? leftPane : rightPane;
  const currentTab = currentPaneState.tabs.find((t) => t.id === currentPaneState.activeTabId);
  const currentPath = currentTab?.path || "";

  const handleOpenTerminal = async () => {
    if (currentPath) {
      await api.openInTerminal(currentPath);
    }
  };

  const handleRevealInOS = async () => {
    if (currentPath) {
      await api.revealInOS(currentPath);
    }
  };

  const activeTransfers = transferQueue.filter((t) => t.status === "running" || t.status === "queued");

  return (
    <header className="h-11 border-b border-border/70 bg-card/85 backdrop-blur-xl px-3 flex items-center justify-between select-none shrink-0 z-20 shadow-xs">
      {/* Left: App Branding & Layout Switcher */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-sm tracking-wider">F</span>
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground hidden sm:inline">
            Foldale <span className="text-[11px] font-medium text-muted-foreground/70 ml-1">v2.0</span>
          </span>
        </div>

        <div className="h-4 w-[1px] bg-border mx-1" />

        {/* Layout Mode Switcher */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40">
          <button
            onClick={() => setLayoutMode("dual-horizontal")}
            title="Dual Horizontal Pane (⌘1)"
            className={`p-1.5 rounded-md text-xs transition-all ${
              layoutMode === "dual-horizontal"
                ? "bg-card text-foreground shadow-xs font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLayoutMode("dual-vertical")}
            title="Dual Vertical Pane (⌘2)"
            className={`p-1.5 rounded-md text-xs transition-all ${
              layoutMode === "dual-vertical"
                ? "bg-card text-foreground shadow-xs font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Rows2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLayoutMode(layoutMode === "single-left" ? "single-right" : "single-left")}
            title="Single Pane Mode (⌘3)"
            className={`p-1.5 rounded-md text-xs transition-all ${
              layoutMode.startsWith("single")
                ? "bg-card text-foreground shadow-xs font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: File Actions & Operations */}
      <div className="flex items-center space-x-1 sm:space-x-1.5">
        <button
          onClick={() => setNewFolderOpen(true)}
          title="New Folder (⌘⇧N)"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
        </button>

        <button
          onClick={() => setNewFileOpen(true)}
          title="New File"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-colors"
        >
          <FilePlus className="w-4 h-4" />
        </button>

        <button
          onClick={() => refreshPane(activePane)}
          title="Refresh Active Pane (F5)"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={toggleHiddenFiles}
          title={showHiddenFiles ? "Hide Hidden Files (⌘.)" : "Show Hidden Files (⌘.)"}
          className={`h-7 px-2.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all border ${
            showHiddenFiles
              ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
              : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
          }`}
        >
          {showHiddenFiles ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="text-[11px]">{showHiddenFiles ? "Hidden: On" : "Hidden: Off"}</span>
        </button>

        <button
          onClick={() => deleteSelection(false)}
          title="Move Selected Items to Trash (⌫)"
          className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/15 rounded-lg transition-colors group"
        >
          <Trash2 className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
        </button>

        <div className="h-4 w-[1px] bg-border mx-1" />

        <button
          onClick={handleOpenTerminal}
          title="Open in Terminal"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-colors"
        >
          <Terminal className="w-4 h-4" />
        </button>

        <button
          onClick={handleRevealInOS}
          title="Reveal in Native File Manager"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-colors hidden sm:block"
        >
          <FolderSync className="w-4 h-4" />
        </button>

        {/* Transfer indicator badge */}
        {activeTransfers.length > 0 && (
          <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-medium animate-pulse">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>{activeTransfers.length} transferring</span>
          </div>
        )}
      </div>

      {/* Right: Search, Command Palette, Theme & Accents */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setSearchOpen(true)}
          title="Search in Directory (F3 / ⌘F)"
          className="flex items-center space-x-1.5 px-2.5 py-1 text-xs text-muted-foreground bg-muted/60 hover:bg-muted hover:text-foreground border border-border/50 rounded-lg transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden md:inline text-[10px] font-mono px-1 py-0.2 bg-card rounded border border-border/60">F3</kbd>
        </button>

        <button
          onClick={() => setCommandPaletteOpen(true)}
          title="Command Palette (⌘K)"
          className="flex items-center space-x-1.5 px-2.5 py-1 text-xs text-muted-foreground bg-muted/60 hover:bg-muted hover:text-foreground border border-border/50 rounded-lg transition-colors"
        >
          <Command className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Commands</span>
          <kbd className="hidden md:inline text-[10px] font-mono px-1 py-0.2 bg-card rounded border border-border/60">⌘K</kbd>
        </button>

        <div className="h-4 w-[1px] bg-border mx-1" />

        {/* Accent Color Picker */}
        <div className="flex items-center space-x-1 bg-muted/40 p-1 rounded-lg border border-border/40">
          {(["blue", "amber", "violet", "emerald", "rose"] as const).map((color) => {
            const bgClass =
              color === "blue"
                ? "bg-blue-500"
                : color === "amber"
                ? "bg-amber-500"
                : color === "violet"
                ? "bg-violet-500"
                : color === "emerald"
                ? "bg-emerald-500"
                : "bg-rose-500";
            return (
              <button
                key={color}
                onClick={() => setAccentColor(color)}
                className={`w-3.5 h-3.5 rounded-full ${bgClass} transition-transform ${
                  accentColor === color
                    ? "scale-125 ring-2 ring-foreground/20 ring-offset-1 ring-offset-card"
                    : "opacity-60 hover:opacity-100"
                }`}
                title={`Accent: ${color}`}
              />
            );
          })}
        </div>

        {/* Theme Toggle (Light / Dark / System) */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40">
          <button
            onClick={() => setTheme("light")}
            title="Light Theme"
            className={`p-1 rounded-md transition-colors ${
              theme === "light"
                ? "bg-card text-amber-500 shadow-xs font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme("dark")}
            title="Dark Theme"
            className={`p-1 rounded-md transition-colors ${
              theme === "dark"
                ? "bg-card text-blue-400 shadow-xs font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme("system")}
            title="System Theme"
            className={`p-1 rounded-md transition-colors ${
              theme === "system"
                ? "bg-card text-foreground shadow-xs font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-border mx-1" />

        {/* Options / Settings button */}
        <button
          onClick={() => setSettingsOpen(true)}
          title="Options & Preferences (⌘,)"
          className="flex items-center space-x-1.5 px-2.5 py-1 text-xs text-muted-foreground bg-muted/60 hover:bg-muted hover:text-foreground border border-border/50 rounded-lg transition-colors group"
        >
          <Settings className="w-3.5 h-3.5 text-primary group-hover:rotate-45 transition-transform" />
          <span className="font-semibold text-foreground">Options</span>
          <kbd className="hidden sm:inline text-[10px] font-mono px-1 py-0.2 bg-card rounded border border-border/60">⌘,</kbd>
        </button>
      </div>
    </header>
  );
};
