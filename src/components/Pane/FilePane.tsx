import React from "react";
import { PaneId } from "../../types";
import { useFileManagerStore } from "../../store/useFileManagerStore";
import { TabBar } from "./TabBar";
import { Breadcrumbs } from "./Breadcrumbs";
import { FileList } from "./FileList";
import { StatusBar } from "./StatusBar";

interface FilePaneProps {
  paneId: PaneId;
}

export const FilePane: React.FC<FilePaneProps> = ({ paneId }) => {
  const { activePane, setActivePane } = useFileManagerStore();
  const isActive = activePane === paneId;

  return (
    <div
      onClick={() => setActivePane(paneId)}
      className={`flex-1 flex flex-col min-w-0 min-h-0 rounded-xl border transition-all duration-200 overflow-hidden relative ${
        isActive
          ? "border-primary/60 bg-card shadow-md ring-1 ring-primary/25"
          : "border-border/70 bg-card/75 shadow-xs hover:border-border"
      }`}
    >
      {/* Top subtle active indicator strip */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/80 via-primary to-primary/80 z-30" />
      )}

      {/* Pane Tab Bar */}
      <TabBar paneId={paneId} />

      {/* Pane Breadcrumb & Address Bar */}
      <Breadcrumbs paneId={paneId} />

      {/* Pane File Listing Area */}
      <FileList paneId={paneId} />

      {/* Pane Status Bar */}
      <StatusBar paneId={paneId} />
    </div>
  );
};
