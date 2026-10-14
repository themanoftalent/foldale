import React, { useState, useEffect } from "react";
import {
  Home,
  Monitor,
  FileText,
  Download,
  Image as ImageIcon,
  Music,
  Video,
  HardDrive,
  Bookmark as BookmarkIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Folder,
} from "lucide-react";
import { useFileManagerStore } from "../store/useFileManagerStore";
import { formatBytes } from "../utils/formatters";
import { api } from "../services/tauriBridge";

export const Sidebar: React.FC = () => {
  const {
    sidebarCollapsed,
    toggleSidebar,
    systemLocations,
    mountedDrives,
    bookmarks,
    addBookmark,
    removeBookmark,
    activePane,
    navigateTo,
    leftPane,
    rightPane,
  } = useFileManagerStore();

  const [recentPaths, setRecentPaths] = useState<string[]>([]);

  useEffect(() => {
    api.getRecentHistory(10).then((history) => {
      setRecentPaths(history);
    }).catch(console.error);
  }, [leftPane.listing?.current_path, rightPane.listing?.current_path]);

  const activePaneState = activePane === "left" ? leftPane : rightPane;
  const currentTab = activePaneState.tabs.find((t) => t.id === activePaneState.activeTabId);
  const currentPath = currentTab?.path || "";

  const handleNavigate = (path: string) => {
    navigateTo(activePane, path, true);
  };

  const handleAddCurrentAsBookmark = async () => {
    if (currentPath) {
      const name = currentPath.split("/").filter(Boolean).pop() || "Folder";
      await addBookmark(name, currentPath, "folder");
    }
  };

  if (sidebarCollapsed) {
    return (
      <div className="w-10 border-r border-border bg-card/40 flex flex-col items-center py-3 select-none shrink-0 transition-all">
        <button
          onClick={toggleSidebar}
          title="Expand Sidebar"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const systemItems = systemLocations
    ? [
        { label: "Home", path: systemLocations.home, icon: Home },
        { label: "Desktop", path: systemLocations.desktop, icon: Monitor },
        { label: "Documents", path: systemLocations.documents, icon: FileText },
        { label: "Downloads", path: systemLocations.downloads, icon: Download },
        { label: "Pictures", path: systemLocations.pictures, icon: ImageIcon },
        { label: "Music", path: systemLocations.music, icon: Music },
        { label: "Videos", path: systemLocations.videos, icon: Video },
        { label: "Root", path: systemLocations.root, icon: HardDrive },
      ]
    : [];

  return (
    <aside className="w-56 border-r border-border bg-card/40 flex flex-col select-none shrink-0 overflow-hidden text-xs">
      {/* Top Header of Sidebar */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-border/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
        <span>Places</span>
        <button
          onClick={toggleSidebar}
          title="Collapse Sidebar"
          className="p-1 rounded hover:bg-muted/80 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
        {/* System Locations */}
        <div>
          <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground/80">Favorites</div>
          <div className="space-y-0.5">
            {systemItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavigate(item.path)}
                  title={item.path}
                  className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-md transition-colors text-left truncate ${
                    isActive
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mounted Drives */}
        {mountedDrives.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground/80">Drives</div>
            <div className="space-y-1">
              {mountedDrives.map((drive) => {
                const used = drive.total_bytes - drive.available_bytes;
                const percent = drive.total_bytes > 0 ? Math.round((used / drive.total_bytes) * 100) : 0;
                const isActive = currentPath.startsWith(drive.mount_point);

                return (
                  <button
                    key={drive.mount_point}
                    onClick={() => handleNavigate(drive.mount_point)}
                    title={`${drive.name} (${drive.mount_point})\n${formatBytes(drive.available_bytes)} free of ${formatBytes(drive.total_bytes)}`}
                    className={`w-full text-left p-2 rounded-md transition-colors ${
                      isActive ? "bg-muted/80" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1.5 truncate">
                        <HardDrive className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                        <span className="truncate font-medium">{drive.name || "Disk"}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{percent}%</span>
                    </div>

                    <div className="w-full h-1 bg-border/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          percent > 90 ? "bg-destructive" : percent > 75 ? "bg-amber-500" : "bg-primary"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {formatBytes(drive.available_bytes)} free
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bookmarks */}
        <div>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[11px] font-medium text-muted-foreground/80">Bookmarks</span>
            <button
              onClick={handleAddCurrentAsBookmark}
              title="Add current folder to bookmarks"
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            {bookmarks.length === 0 ? (
              <div className="px-2 py-1 text-[11px] text-muted-foreground/60 italic">No bookmarks yet</div>
            ) : (
              bookmarks.map((b) => {
                const isActive = currentPath === b.path;
                return (
                  <div
                    key={b.id}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-md transition-colors ${
                      isActive
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <button
                      onClick={() => handleNavigate(b.path)}
                      title={b.path}
                      className="flex items-center space-x-2 truncate flex-1 text-left"
                    >
                      <BookmarkIcon className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span className="truncate">{b.name}</span>
                    </button>
                    <button
                      onClick={() => removeBookmark(b.id)}
                      title="Remove bookmark"
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Locations */}
        {recentPaths.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground/80">Recent</div>
            <div className="space-y-0.5">
              {recentPaths.slice(0, 5).map((path) => {
                const name = path.split("/").filter(Boolean).pop() || path;
                const isActive = currentPath === path;
                return (
                  <button
                    key={path}
                    onClick={() => handleNavigate(path)}
                    title={path}
                    className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-md transition-colors text-left truncate ${
                      isActive
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-foreground/80 hover:bg-muted/60 hover:text-foreground"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
