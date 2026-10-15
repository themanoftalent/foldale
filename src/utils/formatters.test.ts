import { describe, it, expect } from "vitest";
import { formatBytes, formatDate, getFileCategory } from "./formatters";

describe("Formatters Utility", () => {
  it("formats bytes into human readable sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
    expect(formatBytes(1024 * 1024 * 1024 * 2.5)).toBe("2.5 GB");
  });

  it("identifies file categories correctly", () => {
    expect(getFileCategory("image/png", "png")).toBe("image");
    expect(getFileCategory("video/mp4", "mp4")).toBe("video");
    expect(getFileCategory("audio/mpeg", "mp3")).toBe("audio");
    expect(getFileCategory("application/zip", "zip")).toBe("archive");
    expect(getFileCategory("application/pdf", "pdf")).toBe("pdf");
    expect(getFileCategory("text/rust", "rs")).toBe("code");
    expect(getFileCategory("text/plain", "txt")).toBe("text");
  });

  it("handles dates cleanly", () => {
    expect(formatDate(undefined)).toBe("-");
    const testTs = 1700000000;
    const formatted = formatDate(testTs);
    expect(typeof formatted).toBe("string");
    expect(formatted.length).toBeGreaterThan(0);
  });
});
