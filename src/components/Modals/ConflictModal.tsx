import React, { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { ConflictItem, ConflictPolicy } from "../../types";
import { formatBytes, formatDate } from "../../utils/formatters";

interface ConflictModalProps {
  conflicts: ConflictItem[];
  isMove: boolean;
  onResolve: (policy: ConflictPolicy, applyToAll: boolean) => void;
  onCancel: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  conflicts,
  isMove,
  onResolve,
  onCancel,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [applyToAll, setApplyToAll] = useState(false);

  if (!conflicts || conflicts.length === 0) return null;

  const current = conflicts[currentIndex] || conflicts[0];
  const fileName = current.destination_path.split("/").pop() || "item";
  const total = conflicts.length;

  const handleSelectPolicy = (policy: ConflictPolicy) => {
    if (applyToAll || currentIndex >= total - 1) {
      onResolve(policy, applyToAll);
    } else {
      onResolve(policy, false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-5 text-card-foreground shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold text-sm text-foreground">
              File Conflict {total > 1 ? `(${currentIndex + 1} of ${total})` : ""}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conflict Details */}
        <div className="py-4 text-xs space-y-3">
          <p className="text-foreground/90">
            An item named <span className="font-semibold text-primary">"{fileName}"</span> already exists in the destination folder.
          </p>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-muted/50 p-3 text-[11px]">
            <div>
              <div className="font-medium text-muted-foreground mb-1">Incoming ({isMove ? "Move" : "Copy"})</div>
              <div className="truncate text-foreground font-semibold" title={current.source_path}>
                {formatBytes(current.source_size)}
              </div>
              {current.source_modified && (
                <div className="text-muted-foreground text-[10px] mt-0.5">
                  {formatDate(current.source_modified)}
                </div>
              )}
            </div>
            <div className="border-l border-border/70 pl-3">
              <div className="font-medium text-muted-foreground mb-1">Existing in Folder</div>
              <div className="truncate text-foreground font-semibold" title={current.destination_path}>
                {formatBytes(current.target_size)}
              </div>
              {current.target_modified && (
                <div className="text-muted-foreground text-[10px] mt-0.5">
                  {formatDate(current.target_modified)}
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="text-amber-500 font-semibold">Safe replace:</span>
            <span>If replaced, the existing item will be moved to the Trash.</span>
          </div>

          {total > 1 && (
            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-[11px] text-foreground">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0 focus:ring-offset-0"
              />
              Apply to all remaining conflicts ({total - currentIndex})
            </label>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSelectPolicy("skip")}
            className="px-3 py-1.5 rounded-lg text-xs bg-muted hover:bg-muted/80 text-foreground transition-colors font-medium border border-border/60"
          >
            Skip
          </button>
          <button
            onClick={() => handleSelectPolicy("keep_both")}
            className="px-3 py-1.5 rounded-lg text-xs bg-muted hover:bg-muted/80 text-foreground font-semibold transition-colors border border-border/60"
          >
            Keep Both
          </button>
          <button
            onClick={() => handleSelectPolicy("replace")}
            className="px-3.5 py-1.5 rounded-lg text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-xs transition-colors"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  );
};
