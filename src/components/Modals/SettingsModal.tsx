import React, { useState } from "react";
import {
  X,
  Settings,
  Palette,
  ShieldAlert,
  Layout,
  Keyboard,
  Database,
  Sun,
  Moon,
  Laptop,
  Check,
  Search,
  RotateCcw,
  Sparkles,
  Folder,
  Trash2,
  AlertTriangle,
  Github,
  Heart,
  Coffee,
  ExternalLink,
  User,
  Building2,
  Power,
} from "lucide-react";
import { api } from "../../services/tauriBridge";
import { useFileManagerStore } from "../../store/useFileManagerStore";
import { ConflictPolicy } from "../../types";

type SettingsTab = "appearance" | "safety" | "panes" | "shortcuts" | "about";

export const SettingsModal: React.FC = () => {
  const {
    settingsOpen,
    setSettingsOpen,
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    density,
    setDensity,
    showHiddenFiles,
    setShowHiddenFiles,
    layoutMode,
    setLayoutMode,
    colorfulFolders,
    setColorfulFolders,
    launchOnStartup,
    setLaunchOnStartup,
    confirmTrashPrompt,
    setConfirmTrashPrompt,
    defaultConflictPolicy,
    setDefaultConflictPolicy,
    sidebarCollapsed,
    toggleSidebar,
    columnNavigation,
    setColumnNavigation,
    bookmarks,
  } = useFileManagerStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [shortcutSearch, setShortcutSearch] = useState("");

  if (!settingsOpen) return null;

  const shortcuts = [
    { key: "F2", action: "Inline rename selected item", category: "Operations" },
    { key: "F3 / ⌘F", action: "Search files in active directory", category: "Search" },
    { key: "F5 / ⌘R", action: "Refresh active pane", category: "Navigation" },
    { key: "F6 / Tab", action: "Switch active pane (dual-pane)", category: "Navigation" },
    { key: "Space", action: "Quick Look file preview (images, text, video, archives)", category: "Inspection" },
    { key: "⌥↵ (Option+Enter)", action: "Show detailed file properties & permissions", category: "Inspection" },
    { key: "⌘K", action: "Open Command Palette", category: "General" },
    { key: "⌘,", action: "Open Options / Preferences", category: "General" },
    { key: "⌘T", action: "Create new tab in active pane", category: "Navigation" },
    { key: "⌘W", action: "Close current tab", category: "Navigation" },
    { key: "⌘[ / ⌘]", action: "Navigate backward / forward in history", category: "Navigation" },
    { key: "⌘↑", action: "Navigate up to parent folder", category: "Navigation" },
    { key: "⌘.", action: "Toggle hidden files (dotfiles)", category: "View" },
    { key: "⌘1 / ⌘2 / ⌘3", action: "Switch layout (Dual horizontal, Dual vertical, Single)", category: "View" },
    { key: "⌘⇧N", action: "Create new folder", category: "Operations" },
    { key: "⌘⌥N", action: "Create new empty file", category: "Operations" },
    { key: "⌘C / ⌘X / ⌘V", action: "Copy, Cut, and Paste files", category: "Operations" },
    { key: "⌘D", action: "Duplicate selected item", category: "Operations" },
    { key: "⌘⇧R", action: "Batch rename multiple selected items", category: "Operations" },
    { key: "⌘A", action: "Select all files in active pane", category: "Selection" },
    { key: "⌫ (Backspace/Delete)", action: "Move selected items to Trash (Red warning)", category: "Danger" },
    { key: "⇧⌫ (Shift+Delete)", action: "Permanently delete selected items (Red warning)", category: "Danger" },
    { key: "⌘Z", action: "Undo last file operation (copy, move, trash)", category: "Safety" },
  ];

  const filteredShortcuts = shortcuts.filter(
    (s) =>
      s.key.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
      s.action.toLowerCase().includes(shortcutSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(shortcutSearch.toLowerCase())
  );

  return (
    <div
      onClick={() => setSettingsOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md select-none animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-foreground text-xs h-[540px]"
      >
        {/* Top Header */}
        <div className="h-13 px-5 border-b border-border/70 bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-foreground">Options & Preferences</h2>
              <p className="text-[11px] text-muted-foreground">Customize Foldale to fit your workflow</p>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Body with Sidebar Tabs */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Tabs */}
          <nav className="w-48 border-r border-border/60 bg-muted/20 p-2.5 space-y-1 shrink-0 overflow-y-auto">
            <button
              onClick={() => setActiveTab("appearance")}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left transition-colors font-medium ${
                activeTab === "appearance"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground"
              }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span>Appearance</span>
            </button>

            <button
              onClick={() => setActiveTab("safety")}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left transition-colors font-medium ${
                activeTab === "safety"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Safety & Trash</span>
            </button>

            <button
              onClick={() => setActiveTab("panes")}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left transition-colors font-medium ${
                activeTab === "panes"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground"
              }`}
            >
              <Layout className="w-3.5 h-3.5 shrink-0" />
              <span>Panes & Layout</span>
            </button>

            <button
              onClick={() => setActiveTab("shortcuts")}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left transition-colors font-medium ${
                activeTab === "shortcuts"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground"
              }`}
            >
              <Keyboard className="w-3.5 h-3.5 shrink-0" />
              <span>Shortcuts</span>
            </button>

            <button
              onClick={() => setActiveTab("about")}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left transition-colors font-medium ${
                activeTab === "about"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground/80 hover:bg-muted hover:text-foreground"
              }`}
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span>Database & About</span>
            </button>
          </nav>

          {/* Right Tab Content Panel */}
          <div className="flex-1 p-5 overflow-y-auto space-y-6">
            {/* 1. APPEARANCE TAB */}
            {activeTab === "appearance" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Theme Mode */}
                <div>
                  <label className="font-semibold text-foreground text-xs block mb-2">Theme Mode</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: "light", label: "Light", icon: Sun, desc: "Silver slate desktop" },
                      { id: "dark", label: "Dark Graphite", icon: Moon, desc: "Deep dark contrast" },
                      { id: "system", label: "Auto System", icon: Laptop, desc: "Matches macOS setting" },
                    ].map((t) => {
                      const Icon = t.icon;
                      const isSelected = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id as any)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs"
                              : "border-border/60 hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <div className="font-semibold text-foreground">{t.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="font-semibold text-foreground text-xs block mb-2">Accent Color</label>
                  <div className="flex items-center gap-3">
                    {[
                      { id: "blue", label: "Sapphire Blue", bg: "bg-blue-500" },
                      { id: "amber", label: "Amber Gold", bg: "bg-amber-500" },
                      { id: "violet", label: "Violet Purple", bg: "bg-violet-500" },
                      { id: "emerald", label: "Emerald Green", bg: "bg-emerald-500" },
                      { id: "rose", label: "Coral Rose", bg: "bg-rose-500" },
                    ].map((c) => {
                      const isSelected = accentColor === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setAccentColor(c.id as any)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                            isSelected ? "border-primary bg-primary/10 font-semibold" : "border-border/60 hover:bg-muted/60"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full ${c.bg} shrink-0`} />
                          <span className="text-xs">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Colorful Folders Option */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-pink-500/15 text-pink-500 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-xs">Vibrant Colorful Folders</div>
                      <div className="text-muted-foreground text-[11px] mt-0.5 max-w-sm">
                        Assign semantic and distinct vibrant colors to folders instead of monochromatic icons.
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colorfulFolders}
                      onChange={(e) => setColorfulFolders(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Launch at System Startup (Autostart) */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/15 text-blue-500 mt-0.5">
                      <Power className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                        <span>Launch at System Startup</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-mono font-medium">Auto-start</span>
                      </div>
                      <div className="text-muted-foreground text-[11px] mt-0.5 max-w-sm">
                        Automatically launch Foldale when you boot your system or log in.
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={launchOnStartup}
                      onChange={(e) => setLaunchOnStartup(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Interface Density */}
                <div>
                  <label className="font-semibold text-foreground text-xs block mb-2">Display Density</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: "compact", label: "Compact", desc: "Dense table rows for large folders" },
                      { id: "normal", label: "Normal", desc: "Balanced macOS file browsing" },
                      { id: "relaxed", label: "Relaxed", desc: "Spacious padding with touch comfort" },
                    ].map((d) => {
                      const isSelected = density === d.id;
                      return (
                        <button
                          key={d.id}
                          onClick={() => setDensity(d.id as any)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs font-semibold"
                              : "border-border/60 hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-foreground">{d.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 font-normal">{d.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. SAFETY & TRASH TAB */}
            {activeTab === "safety" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-red-600 dark:text-red-400 text-xs">
                      Destructive Action Safeguards
                    </div>
                    <div className="text-foreground/80 text-[11px] mt-0.5 leading-relaxed">
                      All delete and trash options are styled in bright warning red across context menus, toolbars, and dialogs.
                    </div>
                  </div>
                </div>

                {/* Confirm Trash Option */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-red-500/15 text-red-500 mt-0.5">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-xs">
                        Confirm Before Moving to Trash
                      </div>
                      <div className="text-muted-foreground text-[11px] mt-0.5 max-w-sm">
                        When enabled, pressing Delete or clicking Move to Trash displays a confirmation dialog before proceeding.
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmTrashPrompt}
                      onChange={(e) => setConfirmTrashPrompt(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
                </div>

                {/* Default Conflict Policy */}
                <div>
                  <label className="font-semibold text-foreground text-xs block mb-1.5">
                    Default File Conflict Policy
                  </label>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Action to take when pasting or moving a file with the same name as an existing destination file:
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        id: "ask",
                        label: "Prompt every time (Recommended)",
                        desc: "Displays conflict dialog with size and date comparison",
                      },
                      {
                        id: "keep_both",
                        label: "Always keep both",
                        desc: "Automatically renames incoming file to 'name (1).ext'",
                      },
                      {
                        id: "replace",
                        label: "Replace (moves existing file to Trash)",
                        desc: "Safely moves the conflicting item into ~/.Trash",
                      },
                    ].map((p) => {
                      const isSelected = defaultConflictPolicy === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setDefaultConflictPolicy(p.id as any)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs"
                              : "border-border/60 hover:bg-muted/60"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-foreground">{p.label}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{p.desc}</div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground/40"
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. PANES & LAYOUT TAB */}
            {activeTab === "panes" && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Layout Mode */}
                <div>
                  <label className="font-semibold text-foreground text-xs block mb-2">Default Layout Mode</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: "dual-h", label: "Dual Horizontal", desc: "Left & Right panes side-by-side (⌘1)" },
                      { id: "dual-v", label: "Dual Vertical", desc: "Top & Bottom split panes (⌘2)" },
                      { id: "single-left", label: "Single Pane", desc: "Focused single pane browsing (⌘3)" },
                    ].map((l) => {
                      const isSelected = layoutMode === l.id;
                      return (
                        <button
                          key={l.id}
                          onClick={() => setLayoutMode(l.id as any)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-xs font-semibold"
                              : "border-border/60 hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-foreground">{l.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 font-normal">{l.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Finder-Style Column Navigation */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground text-xs flex items-center space-x-1.5">
                      <span>Finder Column-Style Adjacent Navigation</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold bg-primary/20 text-primary">New</span>
                    </div>
                    <div className="text-muted-foreground text-[11px] mt-0.5 max-w-sm">
                      Clicking or arrow-browsing a folder in the left pane automatically opens its contents in the pane immediately to its right.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={columnNavigation}
                      onChange={(e) => setColumnNavigation(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Show Hidden Files by Default */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground text-xs">Show Hidden Files by Default</div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">
                      Show dotfiles (e.g. .git, .DS_Store, .config) automatically on launch. Toggle anytime with ⌘.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showHiddenFiles}
                      onChange={(e) => setShowHiddenFiles(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Sidebar Navigation */}
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground text-xs">Navigation Sidebar</div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">
                      Show Favorites, Locations, and Mounted Drives sidebar on the left.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!sidebarCollapsed}
                      onChange={toggleSidebar}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            )}

            {/* 4. KEYBOARD SHORTCUTS TAB */}
            {activeTab === "shortcuts" && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search shortcuts (e.g. rename, trash, pane, tab)..."
                    value={shortcutSearch}
                    onChange={(e) => setShortcutSearch(e.target.value)}
                    className="w-full bg-muted/40 border border-border/70 rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                  />
                </div>

                <div className="border border-border/60 rounded-xl overflow-hidden max-h-[310px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground text-[10px] uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Shortcut</th>
                        <th className="py-2 px-3">Action</th>
                        <th className="py-2 px-3 text-right">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono">
                      {filteredShortcuts.map((s, i) => (
                        <tr
                          key={i}
                          className={`hover:bg-muted/40 ${
                            s.category === "Danger" ? "text-red-600 dark:text-red-400 font-semibold" : ""
                          }`}
                        >
                          <td className="py-2 px-3">
                            <kbd
                              className={`px-1.5 py-0.5 rounded border text-[10.5px] ${
                                s.category === "Danger"
                                  ? "bg-red-500/10 border-red-500/30 text-red-500"
                                  : "bg-card border-border text-foreground"
                              }`}
                            >
                              {s.key}
                            </kbd>
                          </td>
                          <td className="py-2 px-3 font-sans text-foreground/90">{s.action}</td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`text-[9.5px] uppercase font-sans tracking-wider px-1.5 py-0.5 rounded ${
                                s.category === "Danger"
                                  ? "bg-red-500/15 text-red-600 dark:text-red-400 font-bold"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {s.category}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. ABOUT & DATABASE TAB */}
            {activeTab === "about" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* 1. Open Source Card */}
                <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-[#007aff] flex items-center justify-center text-white text-[11px] font-bold font-mono shrink-0 shadow-xs">
                      &#123;&#125;
                    </div>
                    <h3 className="font-bold text-[16px] text-foreground tracking-tight">
                      Open Source | Free to Fork &amp; Use
                    </h3>
                  </div>

                  <p className="text-[13px] text-muted-foreground">
                    Feel free to fork, modify, use, and contribute!
                  </p>

                  <div className="space-y-1.5 pt-2 text-[13px]">
                    <div>
                      <span className="text-muted-foreground">Developed by:&nbsp;&nbsp;</span>
                      <span className="text-foreground font-semibold">SoftAI Yazılım</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Developer:&nbsp;&nbsp;</span>
                      <span className="text-foreground font-semibold">Assoc. Prof. Dr. Mehmet Akif Cifci</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">GitHub:&nbsp;&nbsp;</span>
                      <button
                        type="button"
                        onClick={() => api.openWithDefaultApp("https://github.com/themanoftalent")}
                        className="text-[#007aff] font-semibold hover:underline inline-block text-left"
                      >
                        @themanoftalent
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Follow & Support Card */}
                <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg leading-none">❤️</span>
                    <h3 className="font-bold text-[16px] text-foreground tracking-tight">
                      Follow &amp; Support
                    </h3>
                  </div>

                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    If you find this project useful, star the repository, follow me, or buy me a coffee! Your support helps keep future projects free and open-source.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => api.openWithDefaultApp("https://github.com/themanoftalent")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-400/80 bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:border-blue-700 dark:hover:bg-blue-900/50 text-foreground text-[13px] font-semibold transition-all shadow-xs"
                    >
                      <span className="text-[#007aff] font-bold text-xs font-mono">&lt;/&gt;</span>
                      <span>GitHub</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => api.openWithDefaultApp("https://github.com/sponsors/themanoftalent")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-300 bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:border-rose-800 dark:hover:bg-rose-900/50 text-foreground text-[13px] font-semibold transition-all shadow-xs"
                    >
                      <span className="text-sm leading-none">❤️</span>
                      <span>Sponsor Me</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => api.openWithDefaultApp("https://buymeacoffee.com/themanoftalent")}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:border-amber-800 dark:hover:bg-amber-900/50 text-foreground text-[13px] font-semibold transition-all shadow-xs"
                    >
                      <span className="text-sm leading-none">☕</span>
                      <span>Buy Me a Coffee</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Modal Footer */}
        <div className="h-12 px-5 border-t border-border/70 bg-muted/20 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-muted-foreground font-mono">
            Settings are automatically persisted to SQLite
          </span>
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
