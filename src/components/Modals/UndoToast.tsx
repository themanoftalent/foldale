import React from "react";
import { RotateCcw, X, Trash2 } from "lucide-react";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({ message, onUndo, onDismiss }) => {
  const isDeleteOrTrash = /trash|delete|remove/i.test(message);

  return (
    <div
      className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 text-xs text-foreground shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5 duration-200 ${
        isDeleteOrTrash
          ? "border-red-500/50 bg-card/95 shadow-[0_4px_25px_rgba(239,68,68,0.15)]"
          : "border-border/80 bg-card/95"
      }`}
    >
      <div className="flex items-center gap-2 max-w-xs truncate">
        {isDeleteOrTrash && <Trash2 className="h-4 w-4 text-red-500 shrink-0" />}
        <span className="truncate text-foreground font-medium">{message}</span>
      </div>
      <div className="flex items-center gap-2 border-l border-border/80 pl-3">
        <button
          onClick={onUndo}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
            isDeleteOrTrash
              ? "bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25"
              : "bg-primary/15 text-primary hover:bg-primary/25"
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Undo</span>
          <kbd className="ml-1 text-[10px] opacity-80 font-mono">⌘Z</kbd>
        </button>
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
