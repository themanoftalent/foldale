import React, { useState, useRef, useEffect } from "react";
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
  ArrowUpDown,
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
} from "lucide-react";
import { FileEntry, PaneId, SortField, ViewMode } from "../../types";
import { useFileManagerStore } from "../../store/useFileManagerStore";
import { formatBytes, formatDate, getFileCategory } from "../../utils/formatters";
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
  } = useFileManagerStore();

  const paneState = paneId === "left" ? leftPane : rightPane;
  const { listing, loading, error, tabs, activeTabId } = paneState;
  const currentTab = tabs.find((t) => t.id === activeTabId);

  const selectedPaths = currentTab?.selectedPaths || [];
  const filterText = (currentTab?.filterText || "").toLowerCase();
  const viewMode = currentTab?.viewMode || "detailed";
  const sortField = currentTab?.sortField || "name";
  const sortDirection = currentTab?.sortDirection || "asc";

  // Renaming state
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

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
      // Folders always first
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
      // Select filename excluding extension
      const lastDot = renameValue.lastIndexOf(".");
      if (lastDot > 0) {
        renameInputRef.current.setSelectionRange(0, lastDot);
      } else {
        renameInputRef.current.select();
      }
    }
  }, [renamingPath]);

  const handleStartRename = (item: FileEntry) => {
    setRenamingPath(item.path);
    setRenameValue(item.name);
  };

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
    selectItem(paneId, item.path, multi, range);
  };

  const handleItemDoubleClick = async (item: FileEntry) => {
    if (item.is_dir) {
      await navigateTo(paneId, item.path, true);
    } else {
      // Check if archive
      if (item.extension === "zip") {
        setPreviewPath(item.path);
      } else {
        // Open with default app
        await api.openWithDefaultApp(item.path);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, item: FileEntry | null) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePane(paneId);

    if (item && !selectedPaths.includes(item.path)) {
      selectItem(paneId, item.path, false, false);
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

  // Render File Icon
  const renderIcon = (item: FileEntry) => {
    if (item.is_symlink) {
      return <Link2 className="w-4 h-4 text-cyan-500 shrink-0" />;
    }
    if (item.is_dir) {
      return <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />;
    }

    const cat = getFileCategory(item.mime_type, item.extension);
    switch (cat) {
      case "image":
        return <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />;
      case "video":
        return <Film className="w-4 h-4 text-rose-400 shrink-0" />;
      case "audio":
        return <Music className="w-4 h-4 text-emerald-400 shrink-0" />;
      case "archive":
        return <FileArchive className="w-4 h-4 text-amber-400 shrink-0" />;
      case "code":
        return <FileCode className="w-4 h-4 text-blue-400 shrink-0" />;
      case "text":
        return <FileText className="w-4 h-4 text-muted-foreground shrink-0" />;
      case "pdf":
        return <FileSpreadsheet className="w-4 h-4 text-red-400 shrink-0" />;
      default:
        return <File className="w-4 h-4 text-muted-foreground shrink-0" />;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs space-y-2">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Reading directory contents...</span>
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
      onClick={() => {
        setActivePane(paneId);
        clearSelection(paneId);
      }}
      onContextMenu={(e) => handleContextMenu(e, null)}
      className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden relative select-none"
    >
      {/* Detailed View */}
      {viewMode === "detailed" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Table Header */}
          <div className="h-7 bg-muted/30 border-b border-border/40 grid grid-cols-12 px-3 text-[11px] font-medium text-muted-foreground items-center shrink-0">
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleSortHeader("name");
              }}
              className="col-span-6 flex items-center space-x-1 cursor-pointer hover:text-foreground"
            >
              <span>Name</span>
              {sortField === "name" && (
                sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
              )}
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                handleSortHeader("size");
              }}
              className="col-span-2 flex items-center justify-end space-x-1 cursor-pointer hover:text-foreground text-right"
            >
              <span>Size</span>
              {sortField === "size" && (
                sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
              )}
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                handleSortHeader("modified");
              }}
              className="col-span-3 flex items-center justify-end space-x-1 cursor-pointer hover:text-foreground text-right"
            >
              <span>Date Modified</span>
              {sortField === "modified" && (
                sortDirection === "asc" ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
              )}
            </div>

            <div className="col-span-1 text-right text-[10px] hidden md:block">
              <span>Mode</span>
            </div>
          </div>

          {/* Table Rows */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 space-y-0.5 focus:outline-none">
            {entries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground/60 text-xs italic">
                {filterText ? "No matching items found" : "Empty directory"}
              </div>
            ) : (
              entries.map((item) => {
                const isSelected = selectedPaths.includes(item.path);
                const isRenaming = renamingPath === item.path;

                return (
                  <div
                    key={item.path}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(e, item);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleItemDoubleClick(item);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                    className={`h-7 px-2 rounded grid grid-cols-12 items-center text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary/20 text-primary font-medium"
                        : "text-foreground/90 hover:bg-muted/60"
                    } ${item.is_hidden ? "opacity-60" : ""}`}
                  >
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
                          className="h-5 px-1 bg-background border border-primary text-foreground text-xs rounded outline-none w-full"
                        />
                      ) : (
                        <span className="truncate text-[12px]">{item.name}</span>
                      )}
                    </div>

                    {/* Size column */}
                    <div className="col-span-2 text-right text-[11px] text-muted-foreground font-mono truncate">
                      {item.is_dir ? "—" : formatBytes(item.size)}
                    </div>

                    {/* Modified column */}
                    <div className="col-span-3 text-right text-[11px] text-muted-foreground font-mono truncate">
                      {formatDate(item.modified)}
                    </div>

                    {/* Permissions column */}
                    <div className="col-span-1 text-right text-[10px] text-muted-foreground/60 font-mono hidden md:block truncate">
                      {item.permissions.slice(1, 4)}
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleItemClick(e, item);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleItemDoubleClick(item);
                }}
                onContextMenu={(e) => handleContextMenu(e, item)}
                className={`h-7 px-2.5 rounded flex items-center space-x-2 text-xs cursor-pointer w-48 truncate transition-colors ${
                  isSelected ? "bg-primary/20 text-primary font-medium" : "hover:bg-muted/60 text-foreground/90"
                } ${item.is_hidden ? "opacity-60" : ""}`}
              >
                {renderIcon(item)}
                <span className="truncate">{item.name}</span>
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleItemClick(e, item);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleItemDoubleClick(item);
                }}
                onContextMenu={(e) => handleContextMenu(e, item)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-primary/15 border-primary/40 text-primary shadow-xs"
                    : "border-transparent hover:bg-muted/50 hover:border-border/50 text-foreground"
                } ${item.is_hidden ? "opacity-60" : ""}`}
              >
                <div className="scale-150 mb-2 mt-1">{renderIcon(item)}</div>
                <span className="text-[11px] text-center truncate max-w-full font-medium" title={item.name}>
                  {item.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
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
          className="fixed z-50 w-52 bg-popover/95 backdrop-blur-md border border-border rounded-lg shadow-xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.targetItem ? (
            <>
              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  handleItemDoubleClick(contextMenu.targetItem!);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-primary/20 hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open</span>
              </button>

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  setPreviewPath(contextMenu.targetItem!.path);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/20 hover:text-primary transition-colors"
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
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-primary/20 hover:text-primary transition-colors"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Reveal in Native OS</span>
              </button>

              <div className="h-[1px] bg-border/60 my-1" />

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  copySelection();
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/20 hover:text-primary transition-colors"
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
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/20 hover:text-primary transition-colors"
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
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-primary/20 hover:text-primary transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  handleStartRename(contextMenu.targetItem!);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/20 hover:text-primary transition-colors"
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
                  className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-primary/20 hover:text-primary transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Batch Rename ({selectedPaths.length})</span>
                </button>
              )}

              <div className="h-[1px] bg-border/60 my-1" />

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
                className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-primary/20 hover:text-primary transition-colors"
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
                  className="w-full px-3 py-1.5 text-left flex items-center space-x-2 hover:bg-primary/20 hover:text-primary transition-colors text-amber-500"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Extract ZIP Here</span>
                </button>
              )}

              <div className="h-[1px] bg-border/60 my-1" />

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  deleteSelection(false);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between text-destructive hover:bg-destructive/15 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Move to Trash</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">⌫</span>
              </button>

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  deleteSelection(true);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between text-destructive hover:bg-destructive/15 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">⇧⌫</span>
              </button>

              <div className="h-[1px] bg-border/60 my-1" />

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  setPropertiesPath(contextMenu.targetItem!.path);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/20 hover:text-primary transition-colors"
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
              {/* Empty background context menu */}
              {clipboard && (
                <button
                  onClick={() => {
                    setContextMenu((p) => ({ ...p, visible: false }));
                    pasteClipboard();
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/20 hover:text-primary transition-colors"
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
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/20 hover:text-primary transition-colors"
              >
                <span>Refresh</span>
                <span className="text-[10px] text-muted-foreground font-mono">F5</span>
              </button>

              <button
                onClick={() => {
                  setContextMenu((p) => ({ ...p, visible: false }));
                  selectAll(paneId);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-primary/20 hover:text-primary transition-colors"
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
