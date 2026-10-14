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
    <div className="h-5.5 bg-[#141518] border-t border-[#24262d] px-2 flex items-center justify-between text-[10.5px] text-muted-foreground select-none shrink-0 font-mono">
      {/* Left: Counts and Selection */}
      <div className="flex items-center space-x-2.5">
        <span
          className={`px-1 py-0.2 rounded text-[9px] uppercase font-bold tracking-wider ${
            isPaneActive ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground/40 bg-white/[0.03]"
          }`}
        >
          {paneId}
        </span>

        <span>
          {listing?.entries.length || 0} items
          {listing ? ` (${listing.total_dirs} folders, ${listing.total_files} files)` : ""}
        </span>

        {selectedPaths.length > 0 && (
          <span className="text-amber-300 font-medium">
            • {selectedPaths.length} selected ({formatBytes(selectedBytes)})
          </span>
        )}
      </div>

      {/* Right: Drive capacity & permissions */}
      <div className="flex items-center space-x-3">
        {listing && !listing.is_writable && (
          <span className="flex items-center text-amber-500 space-x-1" title="Read-only directory">
            <AlertCircle className="w-3 h-3" />
            <span className="text-[9.5px]">Read-only</span>
          </span>
        )}

        {currentDrive && (
          <div className="flex items-center space-x-1" title={`Free space on ${currentDrive.mount_point}`}>
            <HardDrive className="w-3 h-3 text-muted-foreground" />
            <span>
              {formatBytes(currentDrive.available_bytes)} free / {formatBytes(currentDrive.total_bytes)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
