import React from "react";
import { Plus, X } from "lucide-react";
import { PaneId } from "../../types";
import { useFileManagerStore } from "../../store/useFileManagerStore";
import { getFolderStyle } from "../../utils/folderColors";

interface TabBarProps {
  paneId: PaneId;
}

export const TabBar: React.FC<TabBarProps> = ({ paneId }) => {
  const { leftPane, rightPane, createTab, closeTab, setActiveTab, activePane, setActivePane } =
    useFileManagerStore();

  const paneState = paneId === "left" ? leftPane : rightPane;
  const { tabs, activeTabId } = paneState;
  const isPaneActive = activePane === paneId;

  return (
    <div
      onClick={() => setActivePane(paneId)}
      className="flex items-center h-8 bg-muted/40 border-b border-border/60 px-2 select-none overflow-x-auto no-scrollbar shrink-0"
    >
      <div className="flex items-center space-x-1 flex-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={(e) => {
                e.stopPropagation();
                setActivePane(paneId);
                setActiveTab(paneId, tab.id);
              }}
              className={`group flex items-center space-x-1.5 h-6.5 px-3 rounded-t-md text-xs cursor-pointer border-t border-x transition-all max-w-[180px] ${
                isActive
                  ? isPaneActive
                    ? "bg-card border-t-2 border-t-primary border-x-border/80 text-foreground font-semibold shadow-xs"
                    : "bg-card/70 border-t-2 border-t-muted-foreground/30 border-x-border/50 text-muted-foreground font-medium"
                  : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {(() => {
                const folderStyle = getFolderStyle(tab.title || "Folder");
                const FolderIcon = folderStyle.Icon;
                return (
                  <FolderIcon
                    className={`w-3.5 h-3.5 shrink-0 ${folderStyle.strokeClass} ${folderStyle.fillClass}`}
                  />
                );
              })()}
              <span className="truncate flex-1 text-[11px] tracking-tight">{tab.title || "Folder"}</span>

              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(paneId, tab.id);
                  }}
                  title="Close tab (⌘W)"
                  className="opacity-0 group-hover:opacity-100 hover:bg-muted p-0.5 rounded text-muted-foreground hover:text-foreground transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => createTab(paneId)}
        title="New Tab (⌘T)"
        className="p-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors ml-1"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
