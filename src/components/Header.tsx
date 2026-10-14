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
    setSearchOpen,
    setCommandPaletteOpen,
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
    <header className="h-10 border-b border-[#24262d] bg-[#141518] px-3 flex items-center justify-between select-none shrink-0 z-20">
      {/* Left: App Branding & Layout Switcher */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
            <span className="text-white font-black text-sm tracking-wider">F</span>
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground hidden sm:inline">
            Foldale <span className="text-xs font-normal text-muted-foreground ml-1">v1.0</span>
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
                ? "bg-background text-foreground shadow-sm font-medium"
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
                ? "bg-background text-foreground shadow-sm font-medium"
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
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: File Actions & Operations */}
      <div className="flex items-center space-x-1 sm:space-x-2">
        <button
          onClick={() => setNewFolderOpen(true)}
          title="New Folder (⌘⇧N)"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
        </button>

        <button
          onClick={() => setNewFileOpen(true)}
          title="New File"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
        >
          <FilePlus className="w-4 h-4" />
        </button>

        <button
          onClick={() => refreshPane(activePane)}
          title="Refresh Active Pane (F5)"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={toggleHiddenFiles}
          title={showHiddenFiles ? "Hide Hidden Files (⌘.)" : "Show Hidden Files (⌘.)"}
          className={`p-1.5 rounded-md transition-colors ${
            showHiddenFiles
              ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
          }`}
        >
          {showHiddenFiles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        <div className="h-4 w-[1px] bg-border mx-1" />

        <button
          onClick={handleOpenTerminal}
          title="Open in Terminal"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
        >
          <Terminal className="w-4 h-4" />
        </button>

        <button
          onClick={handleRevealInOS}
          title="Reveal in Native File Manager"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors hidden sm:block"
        >
          <FolderSync className="w-4 h-4" />
        </button>

        {/* Transfer indicator badge */}
        {activeTransfers.length > 0 && (
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-xs animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{activeTransfers.length} transferring</span>
          </div>
        )}
      </div>

      {/* Right: Search, Command Palette, Theme & Accents */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setSearchOpen(true)}
          title="Search in Directory (F3 / ⌘F)"
          className="flex items-center space-x-1 px-2 py-1 text-xs text-muted-foreground bg-muted/60 hover:bg-muted hover:text-foreground border border-border/50 rounded-lg transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden md:inline text-[10px] font-mono px-1 py-0.2 bg-background/80 rounded border border-border">F3</kbd>
        </button>

        <button
          onClick={() => setCommandPaletteOpen(true)}
          title="Command Palette (⌘K)"
          className="flex items-center space-x-1 px-2 py-1 text-xs text-muted-foreground bg-muted/60 hover:bg-muted hover:text-foreground border border-border/50 rounded-lg transition-colors"
        >
          <Command className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Commands</span>
          <kbd className="hidden md:inline text-[10px] font-mono px-1 py-0.2 bg-background/80 rounded border border-border">⌘K</kbd>
        </button>

        <div className="h-4 w-[1px] bg-border mx-1" />

        {/* Accent Color Picker */}
        <div className="flex items-center space-x-1">
          {(["amber", "blue", "violet", "emerald", "rose"] as const).map((color) => {
            const bgClass =
              color === "amber"
                ? "bg-amber-500"
                : color === "blue"
                ? "bg-blue-500"
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
                  accentColor === color ? "scale-125 ring-2 ring-foreground/20 ring-offset-1 ring-offset-background" : "opacity-60 hover:opacity-100"
                }`}
                title={`Accent: ${color}`}
              />
            );
          })}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => {
            const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";
            setTheme(next);
          }}
          title={`Theme: ${theme}`}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
        >
          {theme === "dark" && <Moon className="w-4 h-4" />}
          {theme === "light" && <Sun className="w-4 h-4" />}
          {theme === "system" && <Laptop className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
