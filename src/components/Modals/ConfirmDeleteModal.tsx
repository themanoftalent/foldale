import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-[#16171b] p-5 text-neutral-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-neutral-800/80">
          <div className="flex items-center gap-2 text-rose-500">
            <Trash2 className="h-5 w-5" />
            <h3 className="font-semibold text-sm text-neutral-100">
              {permanent ? "Permanently Delete Items?" : "Move Items to Trash?"}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 text-xs space-y-2.5">
          <p className="text-neutral-300">
            {permanent ? (
              <span className="text-rose-400 font-medium">
                Are you sure you want to permanently delete {count} selected item(s)? This action cannot be undone.
              </span>
            ) : (
              <span>Move {count} selected item(s) to the Trash?</span>
            )}
          </p>

          <div className="max-h-32 overflow-y-auto rounded border border-neutral-800 bg-[#121316] p-2.5 text-[11px] space-y-1 font-mono text-neutral-400">
            {sampleNames.map((name, i) => (
              <div key={i} className="truncate text-neutral-300">
                • {name}
              </div>
            ))}
            {remaining > 0 && (
              <div className="text-neutral-500 italic pl-3">
                ...and {remaining} more items
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800/80">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              permanent
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : "bg-neutral-700 hover:bg-neutral-600 text-neutral-100"
            }`}
          >
            {permanent ? "Delete Permanently" : "Move to Trash"}
          </button>
        </div>
      </div>
    </div>
  );
};
