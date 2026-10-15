import React, { useEffect } from "react";
import { X } from "lucide-react";
import { api } from "../../services/tauriBridge";
import { useFileManagerStore } from "../../store/useFileManagerStore";

export const AboutModal: React.FC = () => {
  const { aboutOpen, setAboutOpen } = useFileManagerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && aboutOpen) {
        setAboutOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [aboutOpen, setAboutOpen]);

  if (!aboutOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={() => setAboutOpen(false)}
    >
      <div
        className="relative w-full max-w-xl bg-background/95 dark:bg-zinc-950/95 backdrop-blur-2xl rounded-3xl p-6 border border-border/80 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setAboutOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors z-10"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Open Source Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-[#007aff] flex items-center justify-center text-white text-[11px] font-bold font-mono shrink-0 shadow-xs">
              &#123;&#125;
            </div>
            <h3 className="font-bold text-[16px] text-foreground tracking-tight">
              Open Source | Free to Fork &amp; Use
            </h3>
          </div>

          <p className="text-[13px] text-muted-foreground">
            Feel free to fork, modify, use, and contribute!
          </p>

          <div className="space-y-1.5 pt-2 text-[13px]">
            <div>
              <span className="text-muted-foreground font-normal">Developed by:&nbsp;&nbsp;</span>
              <span className="text-foreground font-semibold">SoftAI Yazılım</span>
            </div>
            <div>
              <span className="text-muted-foreground font-normal">Developer:&nbsp;&nbsp;</span>
              <span className="text-foreground font-semibold">Assoc. Prof. Dr. Mehmet Akif Cifci</span>
            </div>
            <div>
              <span className="text-muted-foreground font-normal">GitHub:&nbsp;&nbsp;</span>
              <button
                type="button"
                onClick={() => api.openWithDefaultApp("https://github.com/themanoftalent")}
                className="text-[#007aff] font-semibold hover:underline inline-block text-left"
              >
                @themanoftalent
              </button>
            </div>
          </div>
        </div>

        {/* 2. Follow & Support Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2.5">
            <span className="text-lg leading-none text-[#ff2d55]">❤️</span>
            <h3 className="font-bold text-[16px] text-foreground tracking-tight">
              Follow &amp; Support
            </h3>
          </div>

          <p className="text-[13px] text-muted-foreground leading-relaxed">
            If you find this project useful, star the repository, follow me, or buy me a coffee! Your support helps keep future projects free and open-source.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => api.openWithDefaultApp("https://github.com/themanoftalent")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-400/80 bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:border-blue-700 dark:hover:bg-blue-900/50 text-foreground text-[13px] font-semibold transition-all shadow-xs"
            >
              <span className="text-[#007aff] font-bold text-xs font-mono">&lt;/&gt;</span>
              <span>GitHub</span>
            </button>

            <button
              type="button"
              onClick={() => api.openWithDefaultApp("https://github.com/sponsors/themanoftalent")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-300 bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:border-rose-800 dark:hover:bg-rose-900/50 text-foreground text-[13px] font-semibold transition-all shadow-xs"
            >
              <span className="text-sm leading-none">❤️</span>
              <span>Sponsor Me</span>
            </button>

            <button
              type="button"
              onClick={() => api.openWithDefaultApp("https://buymeacoffee.com/themanoftalent")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:border-amber-800 dark:hover:bg-amber-900/50 text-foreground text-[13px] font-semibold transition-all shadow-xs"
            >
              <span className="text-sm leading-none">☕</span>
              <span>Buy Me a Coffee</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
