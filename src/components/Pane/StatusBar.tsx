import React from "react";
import { HardDrive, AlertCircle } from "lucide-react";
import { PaneId } from "../../types";
import { useFileManagerStore } from "../../store/useFileManagerStore";
import { formatBytes } from "../../utils/formatters";

interface StatusBarProps {
  paneId: PaneId;
}

export const StatusBar: React.FC<StatusBarProps> = ({ paneId }) => {
  const { leftPane, rightPane, activePane, mountedDrives } = useFileManagerStore();
  const paneState = paneId === "left" ? leftPane : rightPane;
  const { listing, tabs, activeTabId } = paneState;
  const currentTab = tabs.find((t) => t.id === activeTabId);
  const selectedPaths = currentTab?.selectedPaths || [];
  const isPaneActive = activePane === paneId;

  // Calculate size of selected files
  const selectedEntries = (listing?.entries || []).filter((e) =>
    selectedPaths.includes(e.path)
  );
  const selectedBytes = selectedEntries.reduce((acc, cur) => acc + (cur.is_dir ? 0 : cur.size), 0);

  // Find mounted drive for current directory
  const currentPath = currentTab?.path || "";
  const currentDrive = mountedDrives.find((d) => currentPath.startsWith(d.mount_point));

  return (
    <div className="h-7 bg-muted/40 border-t border-border/60 px-3 flex items-center justify-between text-[11px] text-muted-foreground select-none shrink-0 font-sans">
      {/* Left: Counts and Selection */}
      <div className="flex items-center space-x-2.5">
        <span
          className={`px-1.5 py-0.5 rounded text-[9.5px] uppercase font-bold tracking-wider transition-colors ${
            isPaneActive ? "bg-primary/20 text-primary shadow-xs" : "text-muted-foreground/60 bg-muted/80"
          }`}
        >
          {paneId}
        </span>

        <span>
          {listing?.entries.length || 0} items
          {listing ? ` (${listing.total_dirs} folders, ${listing.total_files} files)` : ""}
        </span>

        {selectedPaths.length > 0 && (
          <span className="text-primary font-semibold">
            • {selectedPaths.length} selected ({formatBytes(selectedBytes)})
          </span>
        )}
      </div>

      {/* Right: Drive capacity & permissions */}
      <div className="flex items-center space-x-3">
        {listing && !listing.is_writable && (
          <span className="flex items-center text-amber-500 space-x-1" title="Read-only directory">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-[10px]">Read-only</span>
          </span>
        )}

        {currentDrive && (
          <div className="flex items-center space-x-1 text-muted-foreground font-mono text-[10.5px]" title={`Free space on ${currentDrive.mount_point}`}>
            <HardDrive className="w-3.5 h-3.5" />
            <span>
              {formatBytes(currentDrive.available_bytes)} free of {formatBytes(currentDrive.total_bytes)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
