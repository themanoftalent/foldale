import React, { useState, useEffect } from "react";
import {
  X,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  FolderArchive,
  Download,
  FileCode,
  File,
} from "lucide-react";
import { useFileManagerStore } from "../../store/useFileManagerStore";
import { api } from "../../services/tauriBridge";
import { formatBytes, formatDate, getFileCategory } from "../../utils/formatters";
import { ArchiveEntry, DetailedFileInfo } from "../../types";

export const PreviewModal: React.FC = () => {
  const { previewPath, setPreviewPath } = useFileManagerStore();

  const [loading, setLoading] = useState(false);
  const [fileInfo, setFileInfo] = useState<DetailedFileInfo | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [archiveEntries, setArchiveEntries] = useState<ArchiveEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!previewPath) {
      setFileInfo(null);
      setTextContent(null);
      setImageData(null);
      setArchiveEntries(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        const info = await api.getFileInfo(previewPath);
        if (!isMounted) return;
        setFileInfo(info);

        const cat = getFileCategory(info.mime_type, info.extension);

        if (cat === "image") {
          const b64 = await api.readFileBase64(previewPath);
          if (isMounted) setImageData(b64);
        } else if (cat === "text" || cat === "code") {
          const content = await api.readTextPreview(previewPath, 256 * 1024);
          if (isMounted) setTextContent(content);
        } else if (cat === "archive" && info.extension === "zip") {
          const entries = await api.listArchiveContents(previewPath);
          if (isMounted) setArchiveEntries(entries);
        }
      } catch (err: any) {
        if (isMounted) setError(err.toString());
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [previewPath]);

  if (!previewPath) return null;

  const fileName = previewPath.split("/").filter(Boolean).pop() || "File Preview";
  const cat = fileInfo ? getFileCategory(fileInfo.mime_type, fileInfo.extension) : "binary";

  const handleOpenWithDefault = async () => {
    await api.openWithDefaultApp(previewPath);
  };

  const handleRevealInOS = async () => {
    await api.revealInOS(previewPath);
  };

  return (
    <div
      onClick={() => setPreviewPath(null)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[85vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden text-foreground"
      >
        {/* Modal Header */}
        <div className="h-12 px-4 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <span className="font-semibold text-sm truncate">{fileName}</span>
            {fileInfo && (
              <span className="text-xs text-muted-foreground font-mono">
                ({formatBytes(fileInfo.size)})
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenWithDefault}
              title="Open with default application"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open</span>
            </button>

            <button
              onClick={handleRevealInOS}
              title="Reveal in native file manager"
              className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Reveal</span>
            </button>

            <button
              onClick={() => setPreviewPath(null)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-4 flex flex-col min-h-0 bg-background/50">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-muted-foreground text-xs">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading preview...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2 text-destructive text-xs">
              <p className="font-semibold">Unable to preview file</p>
              <p className="text-muted-foreground max-w-md">{error}</p>
            </div>
          ) : (
            <>
              {/* Image Preview */}
              {cat === "image" && (
                <div className="flex-1 flex flex-col items-center justify-center overflow-hidden bg-black/40 rounded-lg p-2">
                  {imageData ? (
                    <img
                      src={imageData}
                      alt={fileName}
                      className="max-h-[60vh] max-w-full object-contain rounded shadow-lg"
                    />
                  ) : (
                    <div className="text-muted-foreground text-xs">Loading image...</div>
                  )}
                  <div className="text-center text-xs text-muted-foreground mt-2">
                    <p>{previewPath}</p>
                  </div>
                </div>
              )}

              {/* Text / Code Preview */}
              {(cat === "text" || cat === "code") && textContent !== null && (
                <div className="flex-1 flex flex-col overflow-hidden bg-card border border-border/60 rounded-lg font-mono text-xs">
                  <div className="h-6 bg-muted/60 px-3 flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/40 shrink-0">
                    <span>Text Preview</span>
                    <span>{textContent.split("\n").length} lines</span>
                  </div>
                  <pre className="flex-1 p-3 overflow-auto select-text text-foreground leading-relaxed whitespace-pre-wrap">
                    <code>{textContent}</code>
                  </pre>
                </div>
              )}

              {/* ZIP Archive Content Preview */}
              {archiveEntries !== null && (
                <div className="flex-1 flex flex-col overflow-hidden bg-card border border-border/60 rounded-lg text-xs">
                  <div className="h-7 bg-muted/60 px-3 flex items-center justify-between text-[11px] font-semibold text-muted-foreground border-b border-border/40 shrink-0">
                    <span>Archive Contents ({archiveEntries.length} items)</span>
                  </div>
                  <div className="flex-1 overflow-auto p-1 space-y-0.5">
                    {archiveEntries.map((entry, idx) => (
                      <div
                        key={idx}
                        className="h-6 px-2 flex items-center justify-between rounded hover:bg-muted/40 text-[11px]"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {entry.is_dir ? (
                            <FolderArchive className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : (
                            <File className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate">{entry.name}</span>
                        </div>
                        <div className="text-muted-foreground font-mono text-[10px] shrink-0">
                          {entry.is_dir ? "—" : formatBytes(entry.size)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Audio / Video / Binary Fallback */}
              {cat !== "image" && (cat !== "text" && cat !== "code") && archiveEntries === null && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center text-primary">
                    {cat === "video" ? (
                      <Film className="w-8 h-8" />
                    ) : cat === "audio" ? (
                      <Music className="w-8 h-8" />
                    ) : (
                      <File className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{fileName}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fileInfo?.mime_type || "Binary file"} • {fileInfo ? formatBytes(fileInfo.size) : "-"}
                    </p>
                  </div>
                  <button
                    onClick={handleOpenWithDefault}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    Open with System Application
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Metadata */}
        {fileInfo && (
          <div className="h-9 px-4 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground font-mono shrink-0">
            <span>Permissions: {fileInfo.permissions} ({fileInfo.octal_permissions})</span>
            <span>Modified: {formatDate(fileInfo.modified)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
