import React, { useState, useEffect } from "react";
import { Palette, Type, Sparkles, X, Check, RotateCcw } from "lucide-react";
import { useFileManagerStore, CustomFolderStyle } from "../../store/useFileManagerStore";
import { MacFolderIcon } from "../MacFolderIcon";

// 16 curated Apple / FolderForge inspired folder colors
const COLOR_PRESETS = [
  { name: "macOS Blue", value: "#007aff" },
  { name: "Sky Cyan", value: "#0ea5e9" },
  { name: "Teal Mint", value: "#14b8a6" },
  { name: "Emerald Green", value: "#10b981" },
  { name: "Lime", value: "#84cc16" },
  { name: "Sunny Yellow", value: "#eab308" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Tangerine", value: "#f97316" },
  { name: "Coral Rose", value: "#f43f5e" },
  { name: "Crimson Red", value: "#ef4444" },
  { name: "Hot Pink", value: "#ec4899" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Royal Purple", value: "#8b5cf6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Slate", value: "#64748b" },
  { name: "Midnight", value: "#1e293b" },
];

const TEXT_PRESETS = [
  "DEV",
  "WIP",
  "2026",
  "TODO",
  "PROJ",
  "API",
  "DOCS",
  "VIP",
  "TEST",
  "ARCH",
  "WORK",
  "HOT",
];

const EMOJI_PRESETS = [
  "⭐",
  "🔥",
  "🚀",
  "💻",
  "🔒",
  "❤️",
  "⚡",
  "📁",
  "🏷️",
  "💼",
  "🎵",
  "📦",
  "🎯",
  "💡",
  "☕",
  "🛠️",
];

const TEXT_COLORS = [
  { name: "White", value: "#ffffff" },
  { name: "Dark", value: "#0f172a" },
  { name: "Yellow", value: "#fde047" },
  { name: "Neon Cyan", value: "#67e8f9" },
  { name: "Neon Green", value: "#86efac" },
  { name: "Coral Pink", value: "#fda4af" },
];

export const FolderCustomizerModal: React.FC = () => {
  const {
    folderCustomizerTarget,
    setFolderCustomizerTarget,
    customFolderStyles,
    setFolderCustomStyle,
    removeFolderCustomStyle,
  } = useFileManagerStore();

  const [color, setColor] = useState("#007aff");
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [icon, setIcon] = useState("");

  useEffect(() => {
    if (folderCustomizerTarget) {
      const existing = customFolderStyles[folderCustomizerTarget.path];
      if (existing) {
        setColor(existing.color || "#007aff");
        setText(existing.text || "");
        setTextColor(existing.textColor || "#ffffff");
        setIcon(existing.icon || "");
      } else {
        setColor("#007aff");
        setText("");
        setTextColor("#ffffff");
        setIcon("");
      }
    }
  }, [folderCustomizerTarget, customFolderStyles]);

  if (!folderCustomizerTarget) return null;

  const handleClose = () => {
    setFolderCustomizerTarget(null);
  };

  const handleSave = async () => {
    const style: CustomFolderStyle = {
      color,
      text: text.trim() || undefined,
      textColor: textColor || "#ffffff",
      icon: icon || undefined,
    };
    await setFolderCustomStyle(folderCustomizerTarget.path, style);
    handleClose();
  };

  const handleReset = async () => {
    await removeFolderCustomStyle(folderCustomizerTarget.path);
    handleClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={handleClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose();
      }}
    >
      <div
        className="bg-card text-card-foreground border border-border/80 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-muted/30">
          <div className="flex items-center space-x-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: `${color}25` }}
            >
              <Palette className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Folder Color & Icon Stamp</h2>
              <p className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                {folderCustomizerTarget.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Live FolderForge / macOS Preview */}
          <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-b from-muted/40 to-muted/10 border border-border/50 relative overflow-hidden">
            <div className="relative flex flex-col items-center justify-center">
              <MacFolderIcon
                color={color}
                text={text}
                textColor={textColor}
                icon={icon}
                size="2xl"
              />
            </div>

            <div className="mt-3 text-center">
              <span className="font-semibold text-xs text-foreground block truncate max-w-[200px]">
                {folderCustomizerTarget.name}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Changes apply in Foldale & native macOS Desktop
              </span>
            </div>
          </div>

          {/* Color Palette Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold flex items-center space-x-1.5">
                <Palette className="w-3.5 h-3.5 text-primary" />
                <span>Folder Color</span>
              </label>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">{color}</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-border p-0 bg-transparent"
                  title="Choose custom color"
                />
              </div>
            </div>

            <div className="grid grid-cols-8 gap-2">
              {COLOR_PRESETS.map((p) => {
                const isSelected = color.toLowerCase() === p.value.toLowerCase();
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setColor(p.value)}
                    title={p.name}
                    className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center border ${
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 border-transparent shadow-xs"
                        : "border-black/10 hover:scale-105"
                    }`}
                    style={{ backgroundColor: p.value }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Stamp Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold flex items-center space-x-1.5">
                <Type className="w-3.5 h-3.5 text-primary" />
                <span>Text Stamp (FolderForge style)</span>
              </label>
              {text && (
                <button
                  type="button"
                  onClick={() => setText("")}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                maxLength={8}
                value={text}
                onChange={(e) => {
                  setText(e.target.value.toUpperCase());
                  if (icon && e.target.value) setIcon("");
                }}
                placeholder="e.g. DEV, WIP, 2026..."
                className="flex-1 px-3 py-1.5 bg-muted/60 border border-border/80 rounded-lg text-xs font-mono font-medium tracking-wider focus:outline-hidden focus:ring-1 focus:ring-primary uppercase"
              />

              {/* Text Color Swatches */}
              <div className="flex items-center space-x-1 bg-muted/40 p-1 rounded-lg border border-border/60">
                {TEXT_COLORS.map((tc) => (
                  <button
                    key={tc.value}
                    type="button"
                    onClick={() => setTextColor(tc.value)}
                    title={tc.name}
                    className={`w-4 h-4 rounded-full border transition-all ${
                      textColor === tc.value ? "ring-2 ring-primary scale-110" : "border-black/20"
                    }`}
                    style={{ backgroundColor: tc.value }}
                  />
                ))}
              </div>
            </div>

            {/* Quick Text Chips */}
            <div className="flex flex-wrap gap-1.5">
              {TEXT_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setText(t);
                    setIcon("");
                  }}
                  className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-md border transition-all ${
                    text === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol / Emoji Stamp Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Symbol / Emoji Stamp</span>
              </label>
              {icon && (
                <button
                  type="button"
                  onClick={() => setIcon("")}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="grid grid-cols-8 gap-1.5 bg-muted/30 p-2 rounded-xl border border-border/60">
              {EMOJI_PRESETS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setIcon(icon === e ? "" : e);
                    if (icon !== e) setText("");
                  }}
                  className={`h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                    icon === e
                      ? "bg-primary/20 ring-1 ring-primary scale-110 shadow-xs"
                      : "hover:bg-muted hover:scale-105"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border/60 bg-muted/30 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all flex items-center space-x-1.5 font-semibold"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Style</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
