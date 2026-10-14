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
      className={`flex-1 flex flex-col min-w-0 min-h-0 rounded-lg border transition-all duration-150 overflow-hidden relative shadow-sm ${
        isActive
          ? "border-primary/70 bg-[#1a1b20] ring-1 ring-primary/30"
          : "border-border/40 bg-[#131417] opacity-90 hover:opacity-100"
      }`}
    >
      {/* Top subtle Marta active indicator strip */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 z-30" />
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
