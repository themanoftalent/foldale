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
      className={`flex-1 flex flex-col min-w-0 min-h-0 bg-background border transition-all duration-150 overflow-hidden ${
        isActive
          ? "border-primary/60 shadow-xs ring-1 ring-primary/20"
          : "border-border/60 opacity-95"
      }`}
    >
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
