export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(timestamp?: number): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getFileCategory(mime: string, ext?: string): string {
  const extension = (ext || "").toLowerCase();

  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(extension)) {
    return "image";
  }
  if (mime.startsWith("video/") || ["mp4", "mkv", "mov", "avi", "webm"].includes(extension)) {
    return "video";
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(extension)) {
    return "audio";
  }
  if (mime === "application/pdf" || extension === "pdf") {
    return "pdf";
  }
  if (
    [
      "zip",
      "tar",
      "gz",
      "tgz",
      "7z",
      "rar",
      "bz2",
      "xz",
    ].includes(extension)
  ) {
    return "archive";
  }
  if (
    [
      "ts",
      "tsx",
      "js",
      "jsx",
      "rs",
      "py",
      "go",
      "java",
      "c",
      "cpp",
      "h",
      "hpp",
      "html",
      "css",
      "json",
      "yaml",
      "yml",
      "toml",
      "xml",
      "sh",
      "bash",
      "zsh",
      "sql",
    ].includes(extension)
  ) {
    return "code";
  }
  if (["md", "markdown", "txt", "log", "rtf"].includes(extension) || mime.startsWith("text/")) {
    return "text";
  }
  return "binary";
}
