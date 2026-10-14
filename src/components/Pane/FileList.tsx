import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Folder,
  File,
  FileCode,
  FileText,
  FileArchive,
  Image as ImageIcon,
  Film,
  Music,
  FileSpreadsheet,
  Link2,
  ArrowUp,
  ArrowDown,
  Eye,
  Trash2,
  Copy,
  Scissors,
  ClipboardPaste,
  Edit2,
  Archive,
  ExternalLink,
  Info,
  Check,
  FolderArchive,
  AlertTriangle,
  Palette,
} from "lucide-react";
import { FileEntry, PaneId, SortField } from "../../types";
import { useFileManagerStore } from "../../store/useFileManagerStore";
import { formatBytes, formatDate, getFileCategory } from "../../utils/formatters";
import { getFolderStyle } from "../../utils/folderColors";
import { api } from "../../services/tauriBridge";

interface FileListProps {
  paneId: PaneId;
}

export const FileList: React.FC<FileListProps> = ({ paneId }) => {
  const {
    leftPane,
    rightPane,
    activePane,
    setActivePane,
    navigateTo,
    navigateUp,
    selectItem,
    selectAll,
    clearSelection,
    setTabSorting,
    copySelection,
    cutSelection,
    pasteClipboard,
    deleteSelection,
    duplicateSelection,
    clipboard,
    refreshPane,
    setPreviewPath,
    setPropertiesPath,
    setBatchRenameOpen,
    setPendingConflict,
    setUndoToastMessage,
    colorfulFolders,
    customFolderStyles,
    setFolderCustomizerTarget,
  } = useFileManagerStore();

  const paneState = paneId === "left" ? leftPane : rightPane;
  const { listing, loading, error, tabs, activeTabId } = paneState;
  const currentTab = tabs.find((t) => t.id === activeTabId);

  const selectedPaths = currentTab?.selectedPaths || [];
  const filterText = (currentTab?.filterText || "").toLowerCase();
  const viewMode = currentTab?.viewMode || "detailed";
  const sortField = currentTab?.sortField || "name";
  const sortDirection = currentTab?.sortDirection || "asc";

  const isPaneActive = activePane === paneId;

  // Renaming state
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop state
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);
  const [isPaneDragOver, setIsPaneDragOver] = useState(false);

  // List container ref for autoscroll
  const listContainerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<{ [path: string]: HTMLDivElement | null }>({});

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    targetItem: FileEntry | null;
  }>({ visible: false, x: 0, y: 0, targetItem: null });

  // Filter & Sort entries
  const entries = React.useMemo(() => {
    if (!listing?.entries) return [];

    let filtered = listing.entries;
    if (filterText) {
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(filterText) ||
          (e.extension && e.extension.toLowerCase().includes(filterText))
      );
    }

    return [...filtered].sort((a, b) => {
      // Folders always first (Marta rule)
      if (a.is_dir && !b.is_dir) return -1;
      if (!a.is_dir && b.is_dir) return 1;

      let comp = 0;
      switch (sortField) {
        case "name":
          comp = a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
          break;
        case "size":
          comp = a.size - b.size;
          break;
        case "modified":
          comp = (a.modified || 0) - (b.modified || 0);
          break;
        case "extension":
          comp = (a.extension || "").localeCompare(b.extension || "");
          break;
        case "mime_type":
          comp = a.mime_type.localeCompare(b.mime_type);
          break;
      }
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [listing?.entries, filterText, sortField, sortDirection]);

  const orderedPaths = React.useMemo(() => entries.map((e) => e.path), [entries]);

  // Handle click outside context menu
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [contextMenu.visible]);

  // Focus rename input
  useEffect(() => {
    if (renamingPath && renameInputRef.current) {
      renameInputRef.current.focus();
      const lastDot = renameValue.lastIndexOf(".");
      if (lastDot > 0) {
        renameInputRef.current.setSelectionRange(0, lastDot);
      } else {
        renameInputRef.current.select();
      }
    }
  }, [renamingPath]);

  const handleStartRename = useCallback((item: FileEntry) => {
    setRenamingPath(item.path);
    setRenameValue(item.name);
  }, []);

  const handleConfirmRename = async () => {
    if (!renamingPath || !renameValue.trim()) {
      setRenamingPath(null);
      return;
    }

    const parentDir = renamingPath.substring(0, renamingPath.lastIndexOf("/"));
    const newPath = `${parentDir}/${renameValue.trim()}`;

    if (newPath !== renamingPath) {
      try {
        await api.renameItem(renamingPath, newPath);
        await refreshPane(paneId);
      } catch (err: any) {
        alert(`Rename failed: ${err}`);
      }
    }
    setRenamingPath(null);
  };

  const handleItemClick = (e: React.MouseEvent, item: FileEntry) => {
    setActivePane(paneId);
    const multi = e.metaKey || e.ctrlKey;
    const range = e.shiftKey;
    selectItem(paneId, item.path, multi, range, orderedPaths);
  };

  const handleItemDoubleClick = async (item: FileEntry) => {
    if (item.is_dir) {
      await navigateTo(paneId, item.path, true);
    } else {
      if (item.extension === "zip") {
        setPreviewPath(item.path);
      } else {
        await api.openWithDefaultApp(item.path);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileEntry | null) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePane(paneId);

    if (item && !selectedPaths.includes(item.path)) {
      selectItem(paneId, item.path, false, false, orderedPaths);
    }

    setContextMenu({
      visible: true,
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 340),
      targetItem: item,
    });
  };

  const handleSortHeader = (field: SortField) => {
    if (sortField === field) {
      setTabSorting(paneId, field, sortDirection === "asc" ? "desc" : "asc");
    } else {
      setTabSorting(paneId, field, "asc");
    }
  };

  // Keyboard navigation for Marta-style arrow controls
  useEffect(() => {
    if (!isPaneActive || renamingPath) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (entries.length === 0) return;

      // Current selected index
      const currentIndex = entries.findIndex((item) => selectedPaths.includes(item.path));

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, entries.length - 1);
        const nextItem = entries[nextIndex];
        selectItem(paneId, nextItem.path, e.shiftKey, false, orderedPaths);
        rowRefs.current[nextItem.path]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
        const prevItem = entries[prevIndex];
        selectItem(paneId, prevItem.path, e.shiftKey, false, orderedPaths);
        rowRefs.current[prevItem.path]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Home") {
        e.preventDefault();
        const first = entries[0];
        selectItem(paneId, first.path, false, false, orderedPaths);
        rowRefs.current[first.path]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "End") {
        e.preventDefault();
        const last = entries[entries.length - 1];
        selectItem(paneId, last.path, false, false, orderedPaths);
        rowRefs.current[last.path]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (currentIndex >= 0) {
          handleItemDoubleClick(entries[currentIndex]);
        }
      } else if (e.key === "F2") {
        e.preventDefault();
        if (currentIndex >= 0) {
          handleStartRename(entries[currentIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isPaneActive,
    renamingPath,
    entries,
    selectedPaths,
    paneId,
    selectItem,
    handleStartRename,
    orderedPaths,
  ]);

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, item: FileEntry) => {
    const dragItems = selectedPaths.includes(item.path) ? selectedPaths : [item.path];
    e.dataTransfer.setData("application/foldale-paths", JSON.stringify(dragItems));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnFolder = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTargetFolder(null);

    const data = e.dataTransfer.getData("application/foldale-paths");
    if (!data) return;

    try {
      const sources: string[] = JSON.parse(data);
      if (sources.includes(targetFolder)) return; // Avoid dropping into self

      const conflicts = await api.checkConflicts(sources, targetFolder);
      if (conflicts.length > 0) {
        setPendingConflict({
          sources,
          destination: targetFolder,
          isMove: true,
          conflicts,
        });
        return;
      }

      await api.moveItemsWithPolicy(sources, targetFolder, "replace");
      setUndoToastMessage(`Moved ${sources.length} item(s)`);
      await Promise.all([refreshPane("left"), refreshPane("right")]);
    } catch (err: any) {
      alert(`Move error: ${err}`);
    }
  };

  const handleDropOnPane = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsPaneDragOver(false);

    const currentPath = currentTab?.path || "/";
    const data = e.dataTransfer.getData("application/foldale-paths");
    if (!data) return;

    try {
      const sources: string[] = JSON.parse(data);
      if (sources.includes(currentPath)) return;

      const conflicts = await api.checkConflicts(sources, currentPath);
      if (conflicts.length > 0) {
        setPendingConflict({
          sources,
          destination: currentPath,
          isMove: true,
          conflicts,
        });
        return;
      }

      await api.moveItemsWithPolicy(sources, currentPath, "replace");
      setUndoToastMessage(`Moved ${sources.length} item(s)`);
      await Promise.all([refreshPane("left"), refreshPane("right")]);
    } catch (err: any) {
      alert(`Move error: ${err}`);
    }
  };

  // Render File Icon with colorful folders and responsive sizes
  const renderIcon = (item: FileEntry, size: "sm" | "md" | "lg" = "sm") => {
    const sizeClass = size === "lg" ? "w-10 h-10" : size === "md" ? "w-5 h-5" : "w-4 h-4";

    if (item.is_symlink) {
      return <Link2 className={`${sizeClass} text-cyan-500 shrink-0`} />;
    }
    if (item.is_dir) {
      const customStyle = customFolderStyles[item.path];
      if (customStyle) {
        return (
          <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClass}`}>
            <Folder
              className={`${sizeClass} shrink-0 transition-transform`}
              style={{
                color: customStyle.color,
                fill: `${customStyle.color}35`,
              }}
            />
            {customStyle.icon ? (
              <span
                className={`absolute select-none pointer-events-none ${
                  size === "lg" ? "text-base pt-1" : size === "md" ? "text-[10px]" : "text-[8px]"
                }`}
              >
                {customStyle.icon}
              </span>
            ) : customStyle.text && size === "lg" ? (
              <span
                className="absolute bottom-1 px-1 rounded text-[8px] font-mono font-bold uppercase tracking-wider select-none pointer-events-none shadow-xs border border-white/20"
                style={{
                  backgroundColor: customStyle.color,
                  color: customStyle.textColor || "#ffffff",
                }}
              >
                {customStyle.text.slice(0, 5)}
              </span>
            ) : null}
          </div>
        );
      }

      const folderStyle = getFolderStyle(item.name, colorfulFolders);
      const FolderIcon = folderStyle.Icon;
      return (
        <FolderIcon
          className={`${sizeClass} ${folderStyle.strokeClass} ${folderStyle.fillClass} shrink-0 transition-transform`}
        />
      );
    }

    const cat = getFileCategory(item.mime_type, item.extension);
    switch (cat) {
      case "image":
        return <ImageIcon className={`${sizeClass} text-purple-500 shrink-0`} />;
      case "video":
        return <Film className={`${sizeClass} text-rose-500 shrink-0`} />;
      case "audio":
        return <Music className={`${sizeClass} text-amber-500 shrink-0`} />;
      case "archive":
        return <FileArchive className={`${sizeClass} text-orange-500 shrink-0`} />;
      case "code":
        return <FileCode className={`${sizeClass} text-emerald-500 shrink-0`} />;
      case "text":
        return <FileText className={`${sizeClass} text-blue-400 shrink-0`} />;
      case "pdf":
        return <FileSpreadsheet className={`${sizeClass} text-red-500 shrink-0`} />;
      default:
        return <File className={`${sizeClass} text-muted-foreground shrink-0`} />;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs space-y-2">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-[11px]">Loading folder...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-destructive space-y-2">
        <div className="font-semibold text-sm">Cannot access folder</div>
        <p className="text-muted-foreground max-w-sm">{error}</p>
        <button
          onClick={() => refreshPane(paneId)}
          className="px-3 py-1.5 bg-muted rounded-md text-foreground hover:bg-muted/80 text-xs font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div
      ref={listContainerRef}
      onClick={() => {
        setActivePane(paneId);
        clearSelection(paneId);
      }}
      onContextMenu={(e) => handleContextMenu(e, null)}
      onDragOver={(e) => {
        e.preventDefault();
        setIsPaneDragOver(true);
      }}
      onDragLeave={() => setIsPaneDragOver(false)}
      onDrop={handleDropOnPane}
      className={`flex-1 flex flex-col min-h-0 overflow-hidden relative select-none font-sans ${
        isPaneDragOver ? "ring-2 ring-primary ring-inset bg-primary/5" : ""
      }`}
    >
      {/* Detailed View */}
      {viewMode === "detailed" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Table Header */}
          <div className="h-7 bg-muted/60 border-b border-border/70 grid grid-cols-12 px-3 text-[10.5px] font-semibold tracking-wider uppercase text-muted-foreground items-center shrink-0">
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleSortHeader("name");
              }}
              className="col-span-6 flex items-center space-x-1 cursor-pointer hover:text-foreground"
            >
              <span>NAME</span>
              {sortField === "name" && (
                sortDirection === "asc" ? <ArrowUp className="w-2.5 h-2.5 text-primary" /> : <ArrowDown className="w-2.5 h-2.5 text-primary" />
              )}
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                handleSortHeader("size");
              }}
              className="col-span-2 flex items-center justify-end space-x-1 cursor-pointer hover:text-foreground text-right"
            >
              <span>SIZE</span>
              {sortField === "size" && (
                sortDirection === "asc" ? <ArrowUp className="w-2.5 h-2.5 text-primary" /> : <ArrowDown className="w-2.5 h-2.5 text-primary" />
              )}
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                handleSortHeader("modified");
              }}
              className="col-span-3 flex items-center justify-end space-x-1 cursor-pointer hover:text-foreground text-right"
            >
              <span>DATE</span>
              {sortField === "modified" && (
                sortDirection === "asc" ? <ArrowUp className="w-2.5 h-2.5 text-primary" /> : <ArrowDown className="w-2.5 h-2.5 text-primary" />
              )}
            </div>

            <div className="col-span-1 text-right text-[9px] hidden md:block">
              <span>PERM</span>
            </div>
          </div>

          {/* Table Rows */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-0.5 space-y-0.5 focus:outline-none">
            {entries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground/50 text-xs italic">
                {filterText ? "No matching items" : "Empty folder"}
              </div>
            ) : (
              entries.map((item) => {
                const isSelected = selectedPaths.includes(item.path);
                const isRenaming = renamingPath === item.path;
                const isTargetDrop = dropTargetFolder === item.path;

                return (
                  <div
                    key={item.path}
                    ref={(el) => (rowRefs.current[item.path] = el)}
                    draggable={!isRenaming}
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragOver={(e) => {
                      if (item.is_dir) {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropTargetFolder(item.path);
                      }
                    }}
                    onDragLeave={() => {
                      if (item.is_dir) setDropTargetFolder(null);
                    }}
                    onDrop={(e) => {
                      if (item.is_dir) handleDropOnFolder(e, item.path);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(e, item);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleItemDoubleClick(item);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    className={`h-7 px-2.5 rounded-lg flex items-center text-xs transition-colors cursor-pointer border ${
                      isTargetDrop
                        ? "bg-primary/20 border-primary ring-1 ring-primary"
                        : isSelected
                        ? isPaneActive
                          ? "bg-primary/15 border-primary/50 text-primary font-semibold shadow-xs"
                          : "bg-muted border-border/80 text-foreground font-medium"
                        : "border-transparent hover:bg-muted/70 text-foreground"
                    } ${item.is_hidden ? "opacity-50" : ""}`}
                  >
                    <div className="w-full grid grid-cols-12 items-center">
                      {/* Name column */}
                      <div className="col-span-6 flex items-center space-x-2 truncate">
                        {renderIcon(item)}

                        {isRenaming ? (
                          <input
                            ref={renameInputRef}
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleConfirmRename();
                              if (e.key === "Escape") setRenamingPath(null);
                            }}
                            onBlur={handleConfirmRename}
                            onClick={(e) => e.stopPropagation()}
                            className="h-5 px-1 bg-background border border-primary text-foreground text-xs rounded outline-none w-full font-sans"
                          />
                        ) : (
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="truncate text-[11.5px] tracking-tight">{item.name}</span>
                            {item.is_dir && customFolderStyles[item.path]?.text && (
                              <span
                                className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider shadow-2xs border shrink-0 leading-tight"
                                style={{
                                  backgroundColor: `${customFolderStyles[item.path].color}25`,
                                  color: customFolderStyles[item.path].color,
                                  borderColor: `${customFolderStyles[item.path].color}50`,
                                }}
                              >
                                {customFolderStyles[item.path].text}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Size column */}
                      <div className="col-span-2 text-right text-[10.5px] text-muted-foreground font-mono truncate">
                        {item.is_dir ? "—" : formatBytes(item.size)}
                      </div>

                      {/* Modified column */}
                      <div className="col-span-3 text-right text-[10.5px] text-muted-foreground font-mono truncate">
                        {formatDate(item.modified)}
                      </div>

                      {/* Permissions column */}
                      <div className="col-span-1 text-right text-[9.5px] text-muted-foreground/60 font-mono hidden md:block truncate">
                        {item.permissions.slice(1, 4)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="flex-1 overflow-y-auto p-2 flex flex-wrap content-start gap-1">
          {entries.map((item) => {
            const isSelected = selectedPaths.includes(item.path);
            return (
              <div
                key={item.path}
                ref={(el) => (rowRefs.current[item.path] = el)}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleItemClick(e, item);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleItemDoubleClick(item);
                }}
                onContextMenu={(e) => handleContextMenu(e, item)}
                className={`h-7 px-2.5 rounded-lg flex items-center space-x-2 text-xs cursor-pointer w-48 truncate transition-colors border ${
                  isSelected
                    ? isPaneActive
                      ? "bg-primary/15 border-primary/50 text-primary font-semibold shadow-xs"
                      : "bg-muted border-border/80 text-foreground font-medium"
                    : "border-transparent hover:bg-muted/70 text-foreground"
                } ${item.is_hidden ? "opacity-50" : ""}`}
              >
                {renderIcon(item)}
                <span className="truncate text-[11.5px]">{item.name}</span>
                {item.is_dir && customFolderStyles[item.path]?.text && (
                  <span
                    className="px-1 rounded text-[8px] font-mono font-bold uppercase tracking-wider border shrink-0 leading-tight"
                    style={{
                      backgroundColor: `${customFolderStyles[item.path].color}25`,
                      color: customFolderStyles[item.path].color,
                      borderColor: `${customFolderStyles[item.path].color}50`,
                    }}
                  >
                    {customFolderStyles[item.path].text}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {entries.map((item) => {
            const isSelected = selectedPaths.includes(item.path);
            return (
              <div
                key={item.path}
                ref={(el) => (rowRefs.current[item.path] = el)}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleItemClick(e, item);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleItemDoubleClick(item);
                }}
                onContextMenu={(e) => handleContextMenu(e, item)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? isPaneActive
                      ? "bg-primary/15 border-primary/60 text-primary font-semibold shadow-sm"
                      : "bg-muted border-border/80 text-foreground font-medium"
                    : "border-transparent hover:bg-muted/70 text-foreground"
                } ${item.is_hidden ? "opacity-50" : ""}`}
              >
                <div className="mb-2 mt-1">{renderIcon(item, "lg")}</div>
                <span className="text-[11px] text-center truncate max-w-full font-medium" title={item.name}>
                  {item.name}
                </span>
                <span className="text-[9.5px] text-muted-foreground font-mono mt-0.5">
                  {item.is_dir ? "Folder" : formatBytes(item.size)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Context Menu Popup */}
      {contextMenu.visible && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-52 bg-popover/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-2xl py-1.5 text-xs select-none animate-in fade-in zoom-in-95 duration-100 text-popover-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.targetItem ? (
            <>
              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  handleItemDoubleClick(contextMenu.targetItem!);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open</span>
              </button>

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  setPreviewPath(contextMenu.targetItem!.path);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Quick Look</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Space</span>
              </button>

              <button
                onClick={async () => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  await api.revealInOS(contextMenu.targetItem!.path);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Reveal in Native OS</span>
              </button>

              {contextMenu.targetItem.is_dir && (
                <button
                  onClick={() => {
                    const target = contextMenu.targetItem!;
                    setContextMenu((p) => ({ ...p, visible: false }));
                    setFolderCustomizerTarget({ name: target.name, path: target.path });
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/10 hover:text-primary transition-colors text-primary font-medium"
                >
                  <div className="flex items-center space-x-2">
                    <Palette className="w-3.5 h-3.5 text-primary" />
                    <span>Folder Color & Badge...</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">⌘⌥C</span>
                </button>
              )}

              <div className="h-[1px] bg-border/40 my-1" />

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  copySelection();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">⌘C</span>
              </button>

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  cutSelection();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Cut</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">⌘X</span>
              </button>

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  duplicateSelection();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  handleStartRename(contextMenu.targetItem!);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Rename</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">F2</span>
              </button>

              {selectedPaths.length > 1 && (
                <button
                  onClick={() => {
                    setContextMenu((p) => ({ ...p, visible: false }));
                    setBatchRenameOpen(true);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-primary" />
                  <span>Batch Rename ({selectedPaths.length})</span>
                </button>
              )}

              <div className="h-[1px] bg-border/40 my-1" />

              {/* Archive Actions */}
              <button
                onClick={async () => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  const sources = selectedPaths.length > 0 ? selectedPaths : [contextMenu.targetItem!.path];
                  const first = sources[0];
                  const archivePath = `${first}.zip`;
                  try {
                    await api.createZipArchive(sources, archivePath);
                    await refreshPane(paneId);
                  } catch (err: any) {
                    alert(`Compress failed: ${err}`);
                  }
                }}
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Compress to ZIP</span>
              </button>

              {contextMenu.targetItem.extension === "zip" && (
                <button
                  onClick={async () => {
                    setContextMenu((p) => ({ ...p, visible: false }));
                    const destDir = currentTab?.path || "/";
                    try {
                      await api.extractArchive(contextMenu.targetItem!.path, destDir);
                      await refreshPane(paneId);
                    } catch (err: any) {
                      alert(`Extract failed: ${err}`);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-primary/10 hover:text-primary transition-colors text-primary font-medium"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Extract ZIP Here</span>
                </button>
              )}

              <div className="h-[1px] bg-red-500/20 my-1" />

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  deleteSelection(false);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between text-red-600 dark:text-red-400 hover:bg-red-500/15 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors group"
              >
                <div className="flex items-center space-x-2">
                  <Trash2 className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform" />
                  <span>Move to Trash</span>
                </div>
                <span className="text-[10px] text-red-500/80 font-mono font-semibold">⌫</span>
              </button>

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  deleteSelection(true);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between text-red-600 dark:text-red-400 hover:bg-red-600/20 hover:text-red-700 dark:hover:text-red-300 font-semibold transition-colors group"
              >
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform" />
                  <span>Delete Permanently</span>
                </div>
                <span className="text-[10px] text-red-500 font-mono font-bold">⇧⌫</span>
              </button>

              <div className="h-[1px] bg-red-500/20 my-1" />

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  setPropertiesPath(contextMenu.targetItem!.path);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Info className="w-3.5 h-3.5" />
                  <span>Properties</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">⌥↵</span>
              </button>
            </>
          ) : (
            <>
              {clipboard && (
                <button
                  onClick={() => {
                    setContextMenu((p) => ({ ...p, visible: false }));
                    pasteClipboard();
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>Paste ({clipboard.paths.length} items)</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">⌘V</span>
                </button>
              )}

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  refreshPane(paneId);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <span>Refresh</span>
                <span className="text-[10px] text-muted-foreground font-mono">F5</span>
              </button>

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  selectAll(paneId);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <span>Select All</span>
                <span className="text-[10px] text-muted-foreground font-mono">⌘A</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
