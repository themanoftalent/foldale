import React from "react";
import { RotateCcw, X } from "lucide-react";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({ message, onUndo, onDismiss }) => {
  return (
    <div className="fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-lg border border-neutral-700/80 bg-[#1e2025] px-4 py-3 text-xs text-neutral-200 shadow-2xl backdrop-blur animate-in slide-in-from-bottom-5 duration-200">
      <span className="max-w-xs truncate text-neutral-300 font-medium">{message}</span>
      <div className="flex items-center gap-2 border-l border-neutral-700/80 pl-3">
        <button
          onClick={onUndo}
          className="flex items-center gap-1.5 rounded bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/30 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Undo</span>
          <kbd className="ml-1 text-[10px] text-amber-500/70 font-mono">⌘Z</kbd>
        </button>
        <button
          onClick={onDismiss}
          className="text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
