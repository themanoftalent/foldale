import React from "react";
import { Trash2, X } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-5 text-card-foreground shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2 text-rose-500">
            <Trash2 className="h-5 w-5" />
            <h3 className="font-semibold text-sm text-foreground">
              {permanent ? "Permanently Delete Items?" : "Move Items to Trash?"}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 text-xs space-y-3">
          <p className="text-foreground/90">
            {permanent ? (
              <span className="text-rose-500 font-semibold">
                Are you sure you want to permanently delete {count} selected item(s)? This action cannot be undone.
              </span>
            ) : (
              <span>Move {count} selected item(s) to the Trash?</span>
            )}
          </p>

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
            className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
              permanent
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : "bg-primary hover:bg-primary/90 text-white"
            }`}
          >
            {permanent ? "Delete Permanently" : "Move to Trash"}
          </button>
        </div>
      </div>
    </div>
  );
};
