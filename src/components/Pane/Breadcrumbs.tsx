import React, { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  RefreshCw,
  Search,
  X,
  ChevronRight as BreadcrumbSeparator,
  TableProperties,
  List,
  LayoutGrid,
} from "lucide-react";
import { PaneId } from "../../types";
import { useFileManagerStore } from "../../store/useFileManagerStore";

interface BreadcrumbsProps {
  paneId: PaneId;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ paneId }) => {
  const {
    leftPane,
    rightPane,
    navigateTo,
    navigateUp,
    navigateBack,
    navigateForward,
    refreshPane,
    setTabFilter,
    setTabViewMode,
    setActivePane,
    columnNavigation,
    layoutMode,
  } = useFileManagerStore();

  const paneState = paneId === "left" ? leftPane : rightPane;
  const currentTab = paneState.tabs.find((t) => t.id === paneState.activeTabId);
  const currentPath = currentTab?.path || "/";
  const filterText = currentTab?.filterText || "";
  const viewMode = currentTab?.viewMode || "detailed";

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState(currentPath);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAddressInput(currentPath);
  }, [currentPath]);

  useEffect(() => {
    if (isEditingAddress && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingAddress]);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      navigateTo(paneId, addressInput.trim(), true);
    }
    setIsEditingAddress(false);
  };

  const canGoBack = (currentTab?.historyIndex || 0) > 0;
  const canGoForward =
    (currentTab?.historyIndex || 0) < (currentTab?.history.length || 0) - 1;

  // Build breadcrumb segments
  const pathParts = currentPath.split("/").filter(Boolean);
  const segments: { name: string; path: string }[] = [{ name: "/", path: "/" }];
  let runningPath = "";
  for (const part of pathParts) {
    runningPath += "/" + part;
    segments.push({ name: part, path: runningPath });
  }

  return (
    <div
      onClick={() => setActivePane(paneId)}
      className="h-8.5 px-2.5 bg-card/90 border-b border-border/60 flex items-center justify-between space-x-2 select-none text-xs shrink-0"
    >
      {/* Navigation Buttons */}
      <div className="flex items-center space-x-0.5">
        <button
          onClick={() => navigateBack(paneId)}
          disabled={!canGoBack}
          title="Back (⌘[ or Alt+Left)"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => navigateForward(paneId)}
          disabled={!canGoForward}
          title="Forward (⌘] or Alt+Right)"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => navigateUp(paneId)}
          title="Up to Parent Directory (Backspace / Alt+Up)"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => refreshPane(paneId)}
          title="Refresh (F5)"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Address Bar / Breadcrumbs */}
      <div className="flex-1 min-w-0 h-6.5 bg-muted/50 hover:bg-muted/80 border border-border/60 rounded-md flex items-center px-2 transition-colors overflow-hidden">
        {isEditingAddress ? (
          <form onSubmit={handleAddressSubmit} className="w-full flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsEditingAddress(false);
                  setAddressInput(currentPath);
                }
              }}
              onBlur={() => setIsEditingAddress(false)}
              className="w-full bg-transparent border-none outline-none text-[11px] text-foreground font-mono"
            />
          </form>
        ) : (
          <div
            onClick={() => setIsEditingAddress(true)}
            className="w-full h-full flex items-center space-x-0.5 overflow-x-auto no-scrollbar cursor-text"
          >
            {segments.map((seg, idx) => (
              <React.Fragment key={seg.path}>
                {idx > 0 && <BreadcrumbSeparator className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateTo(paneId, seg.path, true);
                  }}
                  className="px-1.5 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors truncate max-w-[140px] font-medium text-foreground/80 hover:text-foreground text-[11px]"
                >
                  {seg.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        {columnNavigation && paneId === "right" && layoutMode.startsWith("dual") && (() => {
          const leftActiveTab = leftPane.tabs.find((t) => t.id === leftPane.activeTabId);
          const leftPath = leftActiveTab?.path || leftPane.listing?.current_path || "";
          const isChild = leftPath && currentPath.startsWith(leftPath) && currentPath !== leftPath;
          if (!isChild) return null;
          return (
            <div
              className="hidden lg:flex items-center space-x-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono shrink-0 select-none ml-2"
              title={`Viewing subfolder from Left Pane: ${leftActiveTab?.title || "Folder"}`}
            >
              <span className="opacity-70">←</span>
              <span className="truncate max-w-[85px]">{leftActiveTab?.title || "Left"}</span>
            </div>
          );
        })()}
      </div>

      {/* Inline Filter */}
      <div className="relative flex items-center w-28 md:w-36 h-6.5">
        <Search className="w-3 h-3 absolute left-2 text-muted-foreground/60 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter..."
          value={filterText}
          onChange={(e) => setTabFilter(paneId, e.target.value)}
          className="w-full h-full pl-6 pr-4 bg-muted/50 hover:bg-muted/80 border border-border/60 rounded-md text-[11px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/60 transition-colors"
        />
        {filterText && (
          <button
            onClick={() => setTabFilter(paneId, "")}
            className="absolute right-1.5 p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* View Mode Buttons */}
      <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/50 shrink-0">
        <button
          onClick={() => setTabViewMode(paneId, "detailed")}
          title="Details view"
          className={`p-1 rounded-md text-xs transition-all ${
            viewMode === "detailed"
              ? "bg-card text-primary shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TableProperties className="w-3 h-3" />
        </button>
        <button
          onClick={() => setTabViewMode(paneId, "list")}
          title="List view"
          className={`p-1 rounded-md text-xs transition-all ${
            viewMode === "list"
              ? "bg-card text-primary shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="w-3 h-3" />
        </button>
        <button
          onClick={() => setTabViewMode(paneId, "grid")}
          title="Grid view"
          className={`p-1 rounded-md text-xs transition-all ${
            viewMode === "grid"
              ? "bg-card text-primary shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
