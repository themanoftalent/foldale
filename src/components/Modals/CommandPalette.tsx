import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Columns2,
  Rows2,
  Square,
  Eye,
  Terminal,
  Home,
  Download,
  FileText,
  Monitor,
  HardDrive,
  Copy,
  Scissors,
  ClipboardPaste,
  Trash2,
  Sun,
  Moon,
  Laptop,
  Palette,
  Edit2,
  FolderArchive,
  Info,
  AlertTriangle,
} from "lucide-react";
import { useFileManagerStore } from "../../store/useFileManagerStore";
import { api } from "../../services/tauriBridge";

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  shortcut?: string;
  action: () => void | Promise<void>;
  isDanger?: boolean;
}

export const CommandPalette: React.FC = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    activePane,
    setLayoutMode,
    toggleHiddenFiles,
    setTheme,
    setAccentColor,
    refreshPane,
    setNewFolderOpen,
    setNewFileOpen,
    setSearchOpen,
    setBatchRenameOpen,
    setPropertiesPath,
    navigateTo,
    systemLocations,
    copySelection,
    cutSelection,
    pasteClipboard,
    deleteSelection,
    duplicateSelection,
    selectAll,
    leftPane,
    rightPane,
  } = useFileManagerStore();

  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const activePaneState = activePane === "left" ? leftPane : rightPane;
  const currentTab = activePaneState.tabs.find((t) => t.id === activePaneState.activeTabId);
  const currentPath = currentTab?.path || "";
  const selectedPaths = currentTab?.selectedPaths || [];

  useEffect(() => {
    if (commandPaletteOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const commands: CommandItem[] = [
    // Navigation
    ...(systemLocations
      ? [
          {
            id: "nav-home",
            title: "Navigate to Home Directory",
            category: "Navigation",
            icon: Home,
            action: () => navigateTo(activePane, systemLocations.home, true),
          },
          {
            id: "nav-downloads",
            title: "Navigate to Downloads",
            category: "Navigation",
            icon: Download,
            action: () => navigateTo(activePane, systemLocations.downloads, true),
          },
          {
            id: "nav-desktop",
            title: "Navigate to Desktop",
            category: "Navigation",
            icon: Monitor,
            action: () => navigateTo(activePane, systemLocations.desktop, true),
          },
          {
            id: "nav-documents",
            title: "Navigate to Documents",
            category: "Navigation",
            icon: FileText,
            action: () => navigateTo(activePane, systemLocations.documents, true),
          },
          {
            id: "nav-root",
            title: "Navigate to Root Directory",
            category: "Navigation",
            icon: HardDrive,
            action: () => navigateTo(activePane, systemLocations.root, true),
          },
        ]
      : []),

    // File Operations
    {
      id: "file-new-folder",
      title: "Create New Folder",
      category: "File Operations",
      icon: FolderPlus,
      shortcut: "⌘⇧N",
      action: () => setNewFolderOpen(true),
    },
    {
      id: "file-new-file",
      title: "Create New File",
      category: "File Operations",
      icon: FilePlus,
      action: () => setNewFileOpen(true),
    },
    {
      id: "file-refresh",
      title: "Refresh Active Directory",
      category: "File Operations",
      icon: RefreshCw,
      shortcut: "F5",
      action: () => refreshPane(activePane),
    },
    {
      id: "file-copy",
      title: "Copy Selected Items",
      category: "File Operations",
      icon: Copy,
      shortcut: "⌘C",
      action: () => copySelection(),
    },
    {
      id: "file-cut",
      title: "Cut Selected Items",
      category: "File Operations",
      icon: Scissors,
      shortcut: "⌘X",
      action: () => cutSelection(),
    },
    {
      id: "file-paste",
      title: "Paste from Clipboard",
      category: "File Operations",
      icon: ClipboardPaste,
      shortcut: "⌘V",
      action: () => pasteClipboard(),
    },
    {
      id: "file-duplicate",
      title: "Duplicate Selected Items",
      category: "File Operations",
      icon: Copy,
      shortcut: "⌘D",
      action: () => duplicateSelection(),
    },
    {
      id: "file-delete",
      title: "Move Selected Items to Trash",
      category: "Warning",
      icon: Trash2,
      shortcut: "⌫",
      action: () => deleteSelection(false),
      isDanger: true,
    },
    {
      id: "file-delete-permanent",
      title: "Permanently Delete Selected Items",
      category: "Warning",
      icon: AlertTriangle,
      shortcut: "⇧⌫",
      action: () => deleteSelection(true),
      isDanger: true,
    },
    {
      id: "file-batch-rename",
      title: "Batch Rename Selected Files",
      category: "File Operations",
      icon: Edit2,
      action: () => setBatchRenameOpen(true),
    },
    {
      id: "file-search",
      title: "Search in Directory",
      category: "File Operations",
      icon: Search,
      shortcut: "F3",
      action: () => setSearchOpen(true),
    },
    {
      id: "file-properties",
      title: "Show Properties / Metadata",
      category: "File Operations",
      icon: Info,
      shortcut: "⌥↵",
      action: () => {
        if (selectedPaths.length > 0) setPropertiesPath(selectedPaths[0]);
        else if (currentPath) setPropertiesPath(currentPath);
      },
    },

    // Layout
    {
      id: "layout-dual-h",
      title: "Dual Pane Horizontal Split",
      category: "Layout",
      icon: Columns2,
      shortcut: "⌘1",
      action: () => setLayoutMode("dual-horizontal"),
    },
    {
      id: "layout-dual-v",
      title: "Dual Pane Vertical Split",
      category: "Layout",
      icon: Rows2,
      shortcut: "⌘2",
      action: () => setLayoutMode("dual-vertical"),
    },
    {
      id: "layout-single",
      title: "Single Pane Mode",
      category: "Layout",
      icon: Square,
      shortcut: "⌘3",
      action: () => setLayoutMode("single-left"),
    },
    {
      id: "view-toggle-hidden",
      title: "Toggle Hidden Files",
      category: "Layout",
      icon: Eye,
      shortcut: "⌘.",
      action: () => toggleHiddenFiles(),
    },

    // System & Tools
    {
      id: "sys-terminal",
      title: "Open Terminal at Current Directory",
      category: "System",
      icon: Terminal,
      action: () => api.openInTerminal(currentPath),
    },
    {
      id: "sys-reveal",
      title: "Reveal Current Directory in Native OS",
      category: "System",
      icon: FolderArchive,
      action: () => api.revealInOS(currentPath),
    },

    // Theme & Appearance
    {
      id: "theme-dark",
      title: "Set Theme: Dark",
      category: "Appearance",
      icon: Moon,
      action: () => setTheme("dark"),
    },
    {
      id: "theme-light",
      title: "Set Theme: Light",
      category: "Appearance",
      icon: Sun,
      action: () => setTheme("light"),
    },
    {
      id: "theme-system",
      title: "Set Theme: System Default",
      category: "Appearance",
      icon: Laptop,
      action: () => setTheme("system"),
    },
    {
      id: "accent-amber",
      title: "Set Accent Color: Amber (Marta Style)",
      category: "Appearance",
      icon: Palette,
      action: () => setAccentColor("amber"),
    },
    {
      id: "accent-blue",
      title: "Set Accent Color: Blue",
      category: "Appearance",
      icon: Palette,
      action: () => setAccentColor("blue"),
    },
    {
      id: "accent-emerald",
      title: "Set Accent Color: Emerald",
      category: "Appearance",
      icon: Palette,
      action: () => setAccentColor("emerald"),
    },
    {
      id: "accent-violet",
      title: "Set Accent Color: Violet",
      category: "Appearance",
      icon: Palette,
      action: () => setAccentColor("violet"),
    },
    {
      id: "accent-rose",
      title: "Set Accent Color: Rose",
      category: "Appearance",
      icon: Palette,
      action: () => setAccentColor("rose"),
    },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(filteredCommands.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(filteredCommands.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        setCommandPaletteOpen(false);
      }
    } else if (e.key === "Escape") {
      setCommandPaletteOpen(false);
    }
  };

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 select-none animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] text-foreground"
      >
        {/* Search input */}
        <div className="h-12 px-3 border-b border-border flex items-center space-x-2 shrink-0 bg-muted/30">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search action..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded border border-border text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No matching commands found</div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`h-9 px-3 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? cmd.isDanger
                        ? "bg-red-600 text-white font-semibold shadow-xs"
                        : "bg-primary text-primary-foreground font-medium"
                      : cmd.isDanger
                      ? "text-red-600 dark:text-red-400 hover:bg-red-500/15 font-medium"
                      : "text-foreground hover:bg-muted/80"
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        cmd.isDanger && !isSelected ? "text-red-500" : "opacity-80"
                      }`}
                    />
                    <span className="truncate">{cmd.title}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${
                        isSelected
                          ? "bg-black/20 text-white"
                          : cmd.isDanger
                          ? "bg-red-500/15 text-red-600 dark:text-red-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {cmd.category}
                    </span>
                  </div>

                  {cmd.shortcut && (
                    <kbd
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        isSelected
                          ? "bg-black/20 border-white/30 text-white"
                          : cmd.isDanger
                          ? "bg-red-500/10 border-red-500/30 text-red-500 font-bold"
                          : "bg-muted border-border text-muted-foreground"
                      }`}
                    >
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
