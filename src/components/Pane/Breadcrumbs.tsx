import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  RefreshCw,
  Search,
  X,
  List,
  TableProperties,
  LayoutGrid,
  ChevronRight as BreadcrumbSeparator,
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
    setIsEditingAddress(false);
  }, [currentPath]);

  useEffect(() => {
    if (isEditingAddress && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingAddress]);

  const canGoBack = currentTab ? currentTab.historyIndex > 0 : false;
  const canGoForward = currentTab
    ? currentTab.historyIndex < currentTab.history.length - 1
    : false;

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      navigateTo(paneId, addressInput.trim(), true);
    }
    setIsEditingAddress(false);
  };

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
      className="h-8 px-2 bg-[#18191e] border-b border-[#25272e] flex items-center justify-between space-x-2 select-none text-xs shrink-0"
    >
      {/* Navigation Buttons */}
      <div className="flex items-center space-x-0.5">
        <button
          onClick={() => navigateBack(paneId)}
          disabled={!canGoBack}
          title="Back (⌘[ or Alt+Left)"
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => navigateForward(paneId)}
          disabled={!canGoForward}
          title="Forward (⌘] or Alt+Right)"
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/[0.06] disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => navigateUp(paneId)}
          title="Up to Parent Directory (Backspace / Alt+Up)"
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => refreshPane(paneId)}
          title="Refresh (F5)"
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Address Bar / Breadcrumbs */}
      <div className="flex-1 min-w-0 h-6 bg-[#131417] hover:bg-[#15161a] border border-[#2b2d36] rounded flex items-center px-1.5 transition-colors overflow-hidden">
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
                  className="px-1 py-0.2 rounded hover:bg-amber-500/15 hover:text-amber-300 transition-colors truncate max-w-[130px] font-medium text-foreground/80 hover:text-foreground text-[10.5px]"
                >
                  {seg.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Inline Filter */}
      <div className="relative flex items-center w-28 md:w-36 h-6">
        <Search className="w-3 h-3 absolute left-1.5 text-muted-foreground/60 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter..."
          value={filterText}
          onChange={(e) => setTabFilter(paneId, e.target.value)}
          className="w-full h-full pl-5 pr-4 bg-[#131417] border border-[#2b2d36] rounded text-[10.5px] text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-amber-500/60"
        />
        {filterText && (
          <button
            onClick={() => setTabFilter(paneId, "")}
            className="absolute right-1 p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* View Mode Buttons */}
      <div className="flex items-center bg-[#131417] p-0.5 rounded border border-[#2b2d36] shrink-0">
        <button
          onClick={() => setTabViewMode(paneId, "detailed")}
          title="Details view"
          className={`p-1 rounded text-xs transition-colors ${
            viewMode === "detailed"
              ? "bg-[#252730] text-amber-400 shadow-xs font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TableProperties className="w-3 h-3" />
        </button>
        <button
          onClick={() => setTabViewMode(paneId, "list")}
          title="List view"
          className={`p-1 rounded text-xs transition-colors ${
            viewMode === "list"
              ? "bg-[#252730] text-amber-400 shadow-xs font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="w-3 h-3" />
        </button>
        <button
          onClick={() => setTabViewMode(paneId, "grid")}
          title="Grid view"
          className={`p-1 rounded text-xs transition-colors ${
            viewMode === "grid"
              ? "bg-[#252730] text-amber-400 shadow-xs font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
