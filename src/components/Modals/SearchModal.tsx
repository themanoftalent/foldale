import React, { useState } from "react";
import {
  Search,
  X,
  Folder,
  File,
  ArrowRight,
  Filter,
  CheckCircle,
} from "lucide-react";
import { useFileManagerStore } from "../../store/useFileManagerStore";
import { api } from "../../services/tauriBridge";
import { SearchQuery, SearchResultEntry } from "../../types";
import { formatBytes, formatDate } from "../../utils/formatters";

export const SearchModal: React.FC = () => {
  const {
    searchOpen,
    setSearchOpen,
    activePane,
    leftPane,
    rightPane,
    navigateTo,
    selectItem,
  } = useFileManagerStore();

  const paneState = activePane === "left" ? leftPane : rightPane;
  const currentTab = paneState.tabs.find((t) => t.id === paneState.activeTabId);
  const currentPath = currentTab?.path || "/";

  const [term, setTerm] = useState("");
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [extensionFilter, setExtensionFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [results, setResults] = useState<SearchResultEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  if (!searchOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;

    setSearching(true);
    setSearched(true);

    const query: SearchQuery = {
      directory: currentPath,
      term: term.trim(),
      is_regex: isRegex,
      case_sensitive: caseSensitive,
      extension_filter: extensionFilter.trim() || undefined,
      max_results: 500,
    };

    try {
      const res = await api.searchDirectory(query);
      setResults(res);
    } catch (err: any) {
      alert(`Search error: ${err}`);
    } finally {
      setSearching(false);
    }
  };

  const handleJumpToResult = async (item: SearchResultEntry) => {
    const parentDir = item.path.substring(0, item.path.lastIndexOf("/"));
    await navigateTo(activePane, parentDir || "/", true);
    selectItem(activePane, item.path, false, false);
    setSearchOpen(false);
  };

  return (
    <div
      onClick={() => setSearchOpen(false)}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 p-4 select-none animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[75vh] text-foreground text-xs"
      >
        {/* Header & Search Form */}
        <form onSubmit={handleSearch} className="p-3 border-b border-border bg-muted/40 space-y-2">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder={`Search recursively in ${currentPath}...`}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              autoFocus
              className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-md transition-colors ${
                showFilters ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
              }`}
              title="Toggle Advanced Filters"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-0.5">
                  Extension filter (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. rs, ts, tsx"
                  value={extensionFilter}
                  onChange={(e) => setExtensionFilter(e.target.value)}
                  className="w-full h-7 px-2 bg-background border border-border rounded text-xs outline-none"
                />
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRegex}
                    onChange={(e) => setIsRegex(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Regex</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={caseSensitive}
                    onChange={(e) => setCaseSensitive(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Case Sensitive</span>
                </label>
              </div>
            </div>
          )}
        </form>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-background/50">
          {searching ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Scanning directories...</span>
            </div>
          ) : searched && results.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs italic">
              No matching files or folders found
            </div>
          ) : results.length > 0 ? (
            results.map((item) => (
              <div
                key={item.path}
                onClick={() => handleJumpToResult(item)}
                className="h-8 px-2.5 rounded-lg flex items-center justify-between text-xs hover:bg-muted/80 cursor-pointer transition-colors group"
              >
                <div className="flex items-center space-x-2 truncate flex-1 min-w-0">
                  {item.is_dir ? (
                    <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20 shrink-0" />
                  ) : (
                    <File className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="font-medium text-foreground truncate">{item.name}</span>
                  <span className="text-[11px] text-muted-foreground/60 truncate font-mono">
                    {item.path}
                  </span>
                </div>

                <div className="flex items-center space-x-3 shrink-0 text-muted-foreground font-mono text-[10px]">
                  <span>{item.is_dir ? "Folder" : formatBytes(item.size)}</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Press Enter or click Search to start
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="h-8 px-4 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground shrink-0 font-mono">
            <span>Found {results.length} results</span>
            <span>Click any result to jump to location</span>
          </div>
        )}
      </div>
    </div>
  );
};
