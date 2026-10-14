import React from "react";
import {
  Folder,
  FolderCode,
  FolderGit2,
  FolderArchive,
  FolderDown,
  FolderLock,
  FolderHeart,
  FolderSync,
  Trash2,
} from "lucide-react";

export interface FolderStyle {
  Icon: React.ComponentType<{ className?: string }>;
  strokeClass: string;
  fillClass: string;
  textClass: string;
  badgeClass: string;
}

// 15 curated vibrant colors that look clean and readable in both Light and Dark modes
const COLOR_PALETTES = [
  {
    strokeClass: "text-sky-500 dark:text-sky-400",
    fillClass: "fill-sky-500/25 dark:fill-sky-400/25",
    textClass: "text-sky-600 dark:text-sky-400",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  {
    strokeClass: "text-emerald-500 dark:text-emerald-400",
    fillClass: "fill-emerald-500/25 dark:fill-emerald-400/25",
    textClass: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  {
    strokeClass: "text-amber-500 dark:text-amber-400",
    fillClass: "fill-amber-500/25 dark:fill-amber-400/25",
    textClass: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    strokeClass: "text-violet-500 dark:text-violet-400",
    fillClass: "fill-violet-500/25 dark:fill-violet-400/25",
    textClass: "text-violet-600 dark:text-violet-400",
    badgeClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  {
    strokeClass: "text-rose-500 dark:text-rose-400",
    fillClass: "fill-rose-500/25 dark:fill-rose-400/25",
    textClass: "text-rose-600 dark:text-rose-400",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  {
    strokeClass: "text-cyan-500 dark:text-cyan-400",
    fillClass: "fill-cyan-500/25 dark:fill-cyan-400/25",
    textClass: "text-cyan-600 dark:text-cyan-400",
    badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  },
  {
    strokeClass: "text-orange-500 dark:text-orange-400",
    fillClass: "fill-orange-500/25 dark:fill-orange-400/25",
    textClass: "text-orange-600 dark:text-orange-400",
    badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  {
    strokeClass: "text-purple-500 dark:text-purple-400",
    fillClass: "fill-purple-500/25 dark:fill-purple-400/25",
    textClass: "text-purple-600 dark:text-purple-400",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  },
  {
    strokeClass: "text-teal-500 dark:text-teal-400",
    fillClass: "fill-teal-500/25 dark:fill-teal-400/25",
    textClass: "text-teal-600 dark:text-teal-400",
    badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
  {
    strokeClass: "text-indigo-500 dark:text-indigo-400",
    fillClass: "fill-indigo-500/25 dark:fill-indigo-400/25",
    textClass: "text-indigo-600 dark:text-indigo-400",
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  },
  {
    strokeClass: "text-pink-500 dark:text-pink-400",
    fillClass: "fill-pink-500/25 dark:fill-pink-400/25",
    textClass: "text-pink-600 dark:text-pink-400",
    badgeClass: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  },
  {
    strokeClass: "text-lime-600 dark:text-lime-400",
    fillClass: "fill-lime-600/25 dark:fill-lime-400/25",
    textClass: "text-lime-700 dark:text-lime-400",
    badgeClass: "bg-lime-500/15 text-lime-800 dark:text-lime-300",
  },
  {
    strokeClass: "text-yellow-500 dark:text-yellow-400",
    fillClass: "fill-yellow-500/25 dark:fill-yellow-400/25",
    textClass: "text-yellow-600 dark:text-yellow-400",
    badgeClass: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  },
  {
    strokeClass: "text-blue-600 dark:text-blue-400",
    fillClass: "fill-blue-600/25 dark:fill-blue-400/25",
    textClass: "text-blue-600 dark:text-blue-400",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  {
    strokeClass: "text-fuchsia-500 dark:text-fuchsia-400",
    fillClass: "fill-fuchsia-500/25 dark:fill-fuchsia-400/25",
    textClass: "text-fuchsia-600 dark:text-fuchsia-400",
    badgeClass: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  },
];

/**
 * Deterministically resolve a colorful folder icon and palette
 * based on folder name keywords or stable hash.
 */
export function getFolderStyle(folderName: string): FolderStyle {
  const name = (folderName || "").trim().toLowerCase();

  // 1. Semantic Icon & Color Matching for well-known directories
  if (name === ".trash" || name === "trash") {
    return {
      Icon: Trash2,
      strokeClass: "text-red-500 dark:text-red-400",
      fillClass: "fill-red-500/25 dark:fill-red-400/25",
      textClass: "text-red-600 dark:text-red-400",
      badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300",
    };
  }

  if (name === ".git" || name === "git" || name === "github" || name === "gitlab") {
    return {
      Icon: FolderGit2,
      ...COLOR_PALETTES[1], // Emerald
    };
  }

  if (
    name === "src" ||
    name === "source" ||
    name === "code" ||
    name === "dev" ||
    name === "development" ||
    name === "scripts" ||
    name === "bin" ||
    name === "lib"
  ) {
    return {
      Icon: FolderCode,
      ...COLOR_PALETTES[5], // Cyan
    };
  }

  if (name === "downloads" || name === "download" || name === "incoming" || name === "inbox") {
    return {
      Icon: FolderDown,
      ...COLOR_PALETTES[0], // Sky
    };
  }

  if (
    name === "archive" ||
    name === "archives" ||
    name === "backup" ||
    name === "backups" ||
    name === "old" ||
    name === "zip"
  ) {
    return {
      Icon: FolderArchive,
      ...COLOR_PALETTES[6], // Orange
    };
  }

  if (
    name === "keys" ||
    name === ".ssh" ||
    name === "ssh" ||
    name === "certs" ||
    name === "secret" ||
    name === "private"
  ) {
    return {
      Icon: FolderLock,
      ...COLOR_PALETTES[2], // Amber
    };
  }

  if (name === "favorites" || name === "starred" || name === "bookmarks" || name === "likes") {
    return {
      Icon: FolderHeart,
      ...COLOR_PALETTES[4], // Rose
    };
  }

  if (name === "cloud" || name === "drive" || name === "sync" || name === "dropbox" || name === "onedrive") {
    return {
      Icon: FolderSync,
      ...COLOR_PALETTES[8], // Teal
    };
  }

  if (
    name === "documents" ||
    name === "docs" ||
    name === "paper" ||
    name === "papers" ||
    name === "notes" ||
    name === "books"
  ) {
    return {
      Icon: Folder,
      ...COLOR_PALETTES[2], // Amber
    };
  }

  if (
    name === "pictures" ||
    name === "photos" ||
    name === "images" ||
    name === "wallpaper" ||
    name === "wallpapers" ||
    name === "camera" ||
    name === "screenshots"
  ) {
    return {
      Icon: Folder,
      ...COLOR_PALETTES[10], // Pink
    };
  }

  if (name === "music" || name === "audio" || name === "songs" || name === "sound" || name === "podcasts") {
    return {
      Icon: Folder,
      ...COLOR_PALETTES[4], // Rose
    };
  }

  if (name === "movies" || name === "videos" || name === "film" || name === "films" || name === "clips" || name === "tv") {
    return {
      Icon: Folder,
      ...COLOR_PALETTES[7], // Purple
    };
  }

  if (name === "desktop") {
    return {
      Icon: Folder,
      ...COLOR_PALETTES[13], // Blue
    };
  }

  if (name === "applications" || name === "apps") {
    return {
      Icon: Folder,
      ...COLOR_PALETTES[3], // Violet
    };
  }

  // 2. Deterministic Hash Palette for all other folders
  // Computes a stable hash so each distinct folder name gets a consistent, vibrant color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const palette = COLOR_PALETTES[hash % COLOR_PALETTES.length];

  return {
    Icon: Folder,
    ...palette,
  };
}
