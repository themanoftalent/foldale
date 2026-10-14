import React, { useState, useEffect } from "react";
import {
  X,
  File,
  Folder,
  Calendar,
  Lock,
  HardDrive,
  FolderArchive,
  Terminal,
  Calculator,
  ExternalLink,
} from "lucide-react";
import { useFileManagerStore } from "../../store/useFileManagerStore";
import { api } from "../../services/tauriBridge";
import { DetailedFileInfo, DirSizeResult } from "../../types";
import { formatBytes, formatDate } from "../../utils/formatters";

export const PropertiesModal: React.FC = () => {
  const { propertiesPath, setPropertiesPath } = useFileManagerStore();

  const [info, setInfo] = useState<DetailedFileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [dirSize, setDirSize] = useState<DirSizeResult | null>(null);
  const [calculatingSize, setCalculatingSize] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertiesPath) {
      setInfo(null);
      setDirSize(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api
      .getFileInfo(propertiesPath)
      .then((data) => {
        if (isMounted) setInfo(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.toString());
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [propertiesPath]);

  if (!propertiesPath) return null;

  const handleCalculateDirSize = async () => {
    if (!propertiesPath || calculatingSize) return;
    setCalculatingSize(true);
    try {
      const res = await api.calculateDirSize(propertiesPath);
      setDirSize(res);
    } catch (e) {
      console.error(e);
    } finally {
      setCalculatingSize(false);
    }
  };

  const handleRevealInOS = async () => {
    if (propertiesPath) await api.revealInOS(propertiesPath);
  };

  const handleOpenTerminal = async () => {
    if (!propertiesPath) return;
    const dir = info?.is_dir
      ? propertiesPath
      : propertiesPath.substring(0, propertiesPath.lastIndexOf("/"));
    await api.openInTerminal(dir);
  };

  return (
    <div
      onClick={() => setPropertiesPath(null)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col text-foreground text-xs"
      >
        {/* Header */}
        <div className="h-12 px-4 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 truncate">
            {info?.is_dir ? (
              <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
            ) : (
              <File className="w-4 h-4 text-primary shrink-0" />
            )}
            <h2 className="font-semibold text-sm truncate">{info?.name || "Properties"}</h2>
          </div>
          <button
            onClick={() => setPropertiesPath(null)}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground space-y-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Fetching properties...</span>
            </div>
          ) : error ? (
            <div className="text-destructive p-4 text-center">{error}</div>
          ) : info ? (
            <>
              {/* General Information */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                  General
                </div>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/50">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium text-foreground">
                      {info.is_dir ? "Folder" : info.mime_type || "Unknown file"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-mono text-[11px] text-foreground truncate max-w-[280px]" title={info.path}>
                      {info.path}
                    </span>
                  </div>
                  {info.symlink_target && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Symlink Target:</span>
                      <span className="font-mono text-[11px] text-cyan-400 truncate max-w-[280px]">
                        {info.symlink_target}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Size:</span>
                    {info.is_dir ? (
                      dirSize ? (
                        <span className="font-medium font-mono text-foreground">
                          {formatBytes(dirSize.total_bytes)} ({dirSize.file_count} files, {dirSize.dir_count} folders)
                        </span>
                      ) : (
                        <button
                          onClick={handleCalculateDirSize}
                          disabled={calculatingSize}
                          className="flex items-center space-x-1 px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors font-sans"
                        >
                          <Calculator className="w-3 h-3" />
                          <span>{calculatingSize ? "Calculating..." : "Calculate Folder Size"}</span>
                        </button>
                      )
                    ) : (
                      <span className="font-medium font-mono text-foreground">
                        {formatBytes(info.size)} ({info.size.toLocaleString()} bytes)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Timestamps
                </div>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/50 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans">Created:</span>
                    <span className="text-foreground">{formatDate(info.created)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans">Modified:</span>
                    <span className="text-foreground">{formatDate(info.modified)}</span>
                  </div>
                  {info.accessed && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-sans">Last Accessed:</span>
                      <span className="text-foreground">{formatDate(info.accessed)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Permissions & Attributes */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Permissions & Security
                </div>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 border border-border/50">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Permissions:</span>
                    <span className="font-mono text-foreground">
                      {info.permissions} ({info.octal_permissions})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Read-only:</span>
                    <span className={`font-medium ${info.readonly ? "text-amber-500" : "text-emerald-500"}`}>
                      {info.readonly ? "Yes (Locked)" : "No (Writable)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={handleRevealInOS}
                  className="flex-1 flex items-center justify-center space-x-2 py-2 bg-muted hover:bg-muted/80 rounded-lg text-foreground font-medium transition-colors"
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>Reveal in Native OS</span>
                </button>
                <button
                  onClick={handleOpenTerminal}
                  className="flex-1 flex items-center justify-center space-x-2 py-2 bg-muted hover:bg-muted/80 rounded-lg text-foreground font-medium transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Open in Terminal</span>
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
