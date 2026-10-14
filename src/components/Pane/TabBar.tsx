import React from "react";
import { Plus, X, Folder } from "lucide-react";
import { PaneId } from "../../types";
import { useFileManagerStore } from "../../store/useFileManagerStore";

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
      className="flex items-center h-7.5 bg-[#141518] border-b border-[#24262d] px-1 select-none overflow-x-auto no-scrollbar shrink-0"
    >
      <div className="flex items-center space-x-0.5 flex-1 min-w-0">
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
              className={`group flex items-center space-x-1.5 h-6 px-2.5 rounded-t-md text-xs cursor-pointer border-t border-x transition-colors max-w-[170px] ${
                isActive
                  ? isPaneActive
                    ? "bg-[#1a1b20] border-t-2 border-t-amber-500 border-x-[#282a33] text-foreground font-medium shadow-xs"
                    : "bg-[#16171b] border-t-2 border-t-muted-foreground/30 border-x-[#24262d] text-muted-foreground font-medium"
                  : "bg-transparent border-transparent text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
              }`}
            >
              <Folder className={`w-3 h-3 shrink-0 ${isActive && isPaneActive ? "text-amber-500" : "text-muted-foreground"}`} />
              <span className="truncate flex-1 text-[11px] font-sans tracking-tight">{tab.title || "Folder"}</span>

              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(paneId, tab.id);
                  }}
                  title="Close tab (⌘W)"
                  className="opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] p-0.5 rounded text-muted-foreground hover:text-foreground transition-opacity"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => createTab(paneId)}
        title="New Tab (⌘T)"
        className="p-1 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors ml-1"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
};
