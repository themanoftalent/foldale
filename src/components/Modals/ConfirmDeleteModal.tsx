import React from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";

interface ConfirmDeleteModalProps {
  paths: string[];
  permanent: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  paths,
  permanent,
  onConfirm,
  onCancel,
}) => {
  if (!paths || paths.length === 0) return null;

  const count = paths.length;
  const sampleNames = paths.slice(0, 3).map((p) => p.split("/").pop());
  const remaining = count - sampleNames.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border-2 border-red-500/50 bg-card p-5 text-card-foreground shadow-[0_0_50px_rgba(239,68,68,0.25)]">
        {/* Header with Red Warning Accent */}
        <div className="flex items-start justify-between pb-3 border-b border-red-500/20">
          <div className="flex items-center gap-2.5 text-red-500">
            <div className="p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500">
              {permanent ? <AlertTriangle className="h-5 w-5 animate-pulse" /> : <Trash2 className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {permanent ? "Permanently Delete Items?" : "Move Items to Trash?"}
              </h3>
              <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                {permanent ? "Irreversible deletion warning" : "Warning: items will be moved to the Trash"}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content with Red Warning Box */}
        <div className="py-4 text-xs space-y-3">
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <div className="text-[11.5px] leading-relaxed">
              {permanent ? (
                <span>
                  <strong>Warning:</strong> You are about to permanently delete <strong>{count}</strong> selected item(s).
                  This operation cannot be undone.
                </span>
              ) : (
                <span>
                  <strong>Warning:</strong> Are you sure you want to move <strong>{count}</strong> selected item(s) to the Trash?
                </span>
              )}
            </div>
          </div>

          <div className="max-h-32 overflow-y-auto rounded-xl border border-border/70 bg-muted/50 p-3 text-[11px] space-y-1 font-mono text-muted-foreground">
            {sampleNames.map((name, i) => (
              <div key={i} className="truncate text-foreground font-medium">
                • {name}
              </div>
            ))}
            {remaining > 0 && (
              <div className="text-muted-foreground/70 italic pl-3">
                ...and {remaining} more items
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium border border-border/60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 shadow-md shadow-red-500/30 transition-colors"
          >
            {permanent ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                <span>Delete Permanently</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>Move to Trash</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
