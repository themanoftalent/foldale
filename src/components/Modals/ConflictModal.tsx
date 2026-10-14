import React, { useState } from "react";
import { AlertTriangle, ArrowRight, Copy, Trash2, X } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-lg border border-neutral-800 bg-[#16171b] p-5 text-neutral-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-neutral-800/80">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold text-sm text-neutral-100">
              File Conflict Detected {total > 1 ? `(${currentIndex + 1} of ${total})` : ""}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conflict Details */}
        <div className="py-4 text-xs space-y-3">
          <p className="text-neutral-300">
            An item named <span className="font-semibold text-amber-400">"{fileName}"</span> already exists in the destination folder.
          </p>

          <div className="grid grid-cols-2 gap-3 rounded border border-neutral-800 bg-[#121316] p-3 text-[11px]">
            <div>
              <div className="font-medium text-neutral-400 mb-1">Incoming ({isMove ? "Move" : "Copy"})</div>
              <div className="truncate text-neutral-200" title={current.source_path}>
                {formatBytes(current.source_size)}
              </div>
              {current.source_modified && (
                <div className="text-neutral-400 text-[10px]">
                  {formatDate(current.source_modified)}
                </div>
              )}
            </div>
            <div className="border-l border-neutral-800 pl-3">
              <div className="font-medium text-neutral-400 mb-1">Existing in Folder</div>
              <div className="truncate text-neutral-200" title={current.destination_path}>
                {formatBytes(current.target_size)}
              </div>
              {current.target_modified && (
                <div className="text-neutral-400 text-[10px]">
                  {formatDate(current.target_modified)}
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <span className="text-amber-500/90 font-medium">Safe replace:</span>
            <span>If you replace, existing file is moved to Trash.</span>
          </div>

          {total > 1 && (
            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-[11px] text-neutral-300">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0 focus:ring-offset-0"
              />
              Apply to all remaining conflicts ({total - currentIndex})
            </label>
          )}
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
            onClick={() => handleSelectPolicy("skip")}
            className="px-3 py-1.5 rounded text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => handleSelectPolicy("keep_both")}
            className="px-3 py-1.5 rounded text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-medium transition-colors"
          >
            Keep Both
          </button>
          <button
            onClick={() => handleSelectPolicy("replace")}
            className="px-3 py-1.5 rounded text-xs bg-amber-600 hover:bg-amber-500 text-black font-semibold transition-colors"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  );
};
