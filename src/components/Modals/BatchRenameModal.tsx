import React, { useState, useMemo } from "react";
import { X, ArrowRight, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { useFileManagerStore } from "../../store/useFileManagerStore";
import { api } from "../../services/tauriBridge";
import { RenameOperation } from "../../types";

export const BatchRenameModal: React.FC = () => {
  const {
    batchRenameOpen,
    setBatchRenameOpen,
    activePane,
    leftPane,
    rightPane,
    refreshPane,
  } = useFileManagerStore();

  const paneState = activePane === "left" ? leftPane : rightPane;
  const currentTab = paneState.tabs.find((t) => t.id === paneState.activeTabId);
  const selectedPaths = currentTab?.selectedPaths || [];
  const entries = paneState.listing?.entries || [];

  // Mode: "replace" | "numbering" | "affix" | "case"
  const [mode, setMode] = useState<"replace" | "numbering" | "affix" | "case">("replace");

  // Options
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [isRegex, setIsRegex] = useState(false);

  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");

  const [numberBase, setNumberBase] = useState("file_");
  const [startNumber, setStartNumber] = useState(1);
  const [padLength, setPadLength] = useState(3);

  const [caseType, setCaseType] = useState<"lower" | "upper" | "title">("lower");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected file objects
  const selectedFiles = useMemo(() => {
    return entries.filter((e) => selectedPaths.includes(e.path));
  }, [entries, selectedPaths]);

  // Compute live preview operations
  const previewOperations = useMemo(() => {
    const ops: { oldName: string; newName: string; oldPath: string; newPath: string }[] = [];
    const usedNames = new Set<string>();
    let hasCollision = false;

    selectedFiles.forEach((file, index) => {
      const parentDir = file.path.substring(0, file.path.lastIndexOf("/"));
      const originalName = file.name;
      const lastDot = originalName.lastIndexOf(".");
      const nameWithoutExt = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
      const ext = lastDot > 0 ? originalName.slice(lastDot) : "";

      let computedName = originalName;

      if (mode === "replace") {
        if (findText) {
          try {
            if (isRegex) {
              const reg = new RegExp(findText, "g");
              computedName = originalName.replace(reg, replaceText);
            } else {
              computedName = originalName.split(findText).join(replaceText);
            }
          } catch (e) {
            computedName = originalName;
          }
        }
      } else if (mode === "affix") {
        computedName = `${prefix}${nameWithoutExt}${suffix}${ext}`;
      } else if (mode === "numbering") {
        const numStr = String(startNumber + index).padStart(padLength, "0");
        computedName = `${numberBase}${numStr}${ext}`;
      } else if (mode === "case") {
        if (caseType === "lower") {
          computedName = `${nameWithoutExt.toLowerCase()}${ext.toLowerCase()}`;
        } else if (caseType === "upper") {
          computedName = `${nameWithoutExt.toUpperCase()}${ext}`;
        } else if (caseType === "title") {
          const titled = nameWithoutExt.replace(
            /\w\S*/g,
            (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          );
          computedName = `${titled}${ext}`;
        }
      }

      if (usedNames.has(computedName)) {
        hasCollision = true;
      }
      usedNames.add(computedName);

      ops.push({
        oldName: originalName,
        newName: computedName,
        oldPath: file.path,
        newPath: `${parentDir}/${computedName}`,
      });
    });

    return { ops, hasCollision };
  }, [
    selectedFiles,
    mode,
    findText,
    replaceText,
    isRegex,
    prefix,
    suffix,
    numberBase,
    startNumber,
    padLength,
    caseType,
  ]);

  if (!batchRenameOpen) return null;

  const handleApply = async () => {
    if (previewOperations.ops.length === 0) return;
    setLoading(true);
    setError(null);

    const operations: RenameOperation[] = previewOperations.ops
      .filter((op) => op.oldPath !== op.newPath)
      .map((op) => ({
        old_path: op.oldPath,
        new_path: op.newPath,
      }));

    if (operations.length === 0) {
      setBatchRenameOpen(false);
      return;
    }

    try {
      const res = await api.batchRename(operations);
      if (res.failed.length > 0) {
        setError(`Failed to rename ${res.failed.length} items.`);
      } else {
        await refreshPane(activePane);
        setBatchRenameOpen(false);
      }
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={() => setBatchRenameOpen(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] text-foreground text-xs"
      >
        {/* Header */}
        <div className="h-12 px-4 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-sm">Batch Rename</h2>
            <p className="text-[11px] text-muted-foreground">
              Renaming {selectedFiles.length} selected items
            </p>
          </div>
          <button
            onClick={() => setBatchRenameOpen(false)}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-4 py-2 border-b border-border/60 bg-muted/20 flex space-x-2 shrink-0">
          {(["replace", "affix", "numbering", "case"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md uppercase font-semibold text-[10px] tracking-wider transition-colors ${
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "replace"
                ? "Find & Replace"
                : m === "affix"
                ? "Prefix / Suffix"
                : m === "numbering"
                ? "Sequential Number"
                : "Change Case"}
            </button>
          ))}
        </div>

        {/* Inputs based on Mode */}
        <div className="p-4 border-b border-border/60 space-y-3 shrink-0">
          {mode === "replace" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1 font-medium">Find</label>
                <input
                  type="text"
                  placeholder="Text to replace..."
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="w-full h-8 px-2 bg-background border border-border rounded-md text-xs outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1 font-medium">Replace with</label>
                <input
                  type="text"
                  placeholder="New text..."
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="w-full h-8 px-2 bg-background border border-border rounded-md text-xs outline-none focus:border-primary"
                />
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="regexCheck"
                  checked={isRegex}
                  onChange={(e) => setIsRegex(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="regexCheck" className="text-[11px] text-muted-foreground cursor-pointer">
                  Regular expression pattern
                </label>
              </div>
            </div>
          )}

          {mode === "affix" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1 font-medium">Add Prefix</label>
                <input
                  type="text"
                  placeholder="e.g. draft_"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full h-8 px-2 bg-background border border-border rounded-md text-xs outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1 font-medium">Add Suffix</label>
                <input
                  type="text"
                  placeholder="e.g. _v2"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="w-full h-8 px-2 bg-background border border-border rounded-md text-xs outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {mode === "numbering" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1 font-medium">Base Name</label>
                <input
                  type="text"
                  placeholder="e.g. photo_"
                  value={numberBase}
                  onChange={(e) => setNumberBase(e.target.value)}
                  className="w-full h-8 px-2 bg-background border border-border rounded-md text-xs outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1 font-medium">Start Number</label>
                <input
                  type="number"
                  value={startNumber}
                  onChange={(e) => setStartNumber(parseInt(e.target.value) || 1)}
                  className="w-full h-8 px-2 bg-background border border-border rounded-md text-xs outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1 font-medium">Digit Padding</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={padLength}
                  onChange={(e) => setPadLength(parseInt(e.target.value) || 1)}
                  className="w-full h-8 px-2 bg-background border border-border rounded-md text-xs outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {mode === "case" && (
            <div className="flex space-x-3">
              {(["lower", "upper", "title"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCaseType(c)}
                  className={`px-3 py-1.5 rounded-md border text-xs capitalize ${
                    caseType === c ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:bg-muted"
                  }`}
                >
                  {c === "lower" ? "lowercase" : c === "upper" ? "UPPERCASE" : "Title Case"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Diff Preview Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-background/50">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Live Renaming Preview</span>
            {previewOperations.hasCollision && (
              <span className="flex items-center text-amber-500 normal-case space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Filename collision detected!</span>
              </span>
            )}
          </div>

          <div className="space-y-1">
            {previewOperations.ops.map((op, idx) => {
              const changed = op.oldName !== op.newName;
              return (
                <div
                  key={idx}
                  className={`h-7 px-2.5 rounded flex items-center justify-between text-xs font-mono border ${
                    changed ? "bg-muted/40 border-border/60" : "bg-transparent border-transparent opacity-60"
                  }`}
                >
                  <span className="truncate flex-1 text-muted-foreground">{op.oldName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mx-2" />
                  <span className={`truncate flex-1 font-medium ${changed ? "text-primary" : "text-foreground"}`}>
                    {op.newName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error reporting */}
        {error && (
          <div className="px-4 py-2 bg-destructive/15 text-destructive text-xs border-t border-destructive/20">
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <div className="h-12 px-4 border-t border-border bg-muted/40 flex items-center justify-between shrink-0">
          <span className="text-muted-foreground text-[11px]">
            {previewOperations.ops.filter((o) => o.oldName !== o.newName).length} will change
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setBatchRenameOpen(false)}
              className="px-3 py-1.5 rounded-md hover:bg-muted text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={loading || previewOperations.hasCollision}
              className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Renaming..." : "Apply Rename"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
