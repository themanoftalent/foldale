import React, { useState, useEffect, useRef } from "react";
import { FolderPlus, FilePlus, X } from "lucide-react";
import { useFileManagerStore } from "../../store/useFileManagerStore";
import { api } from "../../services/tauriBridge";

export const NewItemModal: React.FC = () => {
  const {
    newFolderOpen,
    setNewFolderOpen,
    newFileOpen,
    setNewFileOpen,
    activePane,
    leftPane,
    rightPane,
    refreshPane,
  } = useFileManagerStore();

  const isFolder = newFolderOpen;
  const isOpen = newFolderOpen || newFileOpen;

  const paneState = activePane === "left" ? leftPane : rightPane;
  const currentTab = paneState.tabs.find((t) => t.id === paneState.activeTabId);
  const currentPath = currentTab?.path || "/";

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(isFolder ? "New Folder" : "untitled.txt");
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, isFolder]);

  if (!isOpen) return null;

  const handleClose = () => {
    setNewFolderOpen(false);
    setNewFileOpen(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const fullPath = `${currentPath}/${name.trim()}`;

    try {
      if (isFolder) {
        await api.createDirectory(fullPath);
      } else {
        await api.createFile(fullPath);
      }
      await refreshPane(activePane);
      handleClose();
    } catch (err: any) {
      setError(err.toString());
    }
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-4 flex flex-col space-y-3 text-foreground text-xs"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isFolder ? (
              <FolderPlus className="w-4 h-4 text-amber-500" />
            ) : (
              <FilePlus className="w-4 h-4 text-primary" />
            )}
            <h3 className="font-semibold text-sm">
              {isFolder ? "Create New Folder" : "Create New File"}
            </h3>
          </div>
          <button onClick={handleClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">
              Name:
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-8 px-2.5 bg-background border border-border rounded-md text-xs outline-none focus:border-primary"
            />
          </div>

          {error && <div className="text-destructive text-[11px]">{error}</div>}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 rounded-md hover:bg-muted text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
