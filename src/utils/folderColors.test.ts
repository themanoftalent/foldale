import { describe, it, expect } from "vitest";
import { getFolderStyle } from "./folderColors";

describe("folderColors", () => {
  it("resolves semantic icons and colors for common directories", () => {
    const gitFolder = getFolderStyle(".git");
    expect(gitFolder.strokeClass).toContain("emerald");

    const codeFolder = getFolderStyle("src");
    expect(codeFolder.strokeClass).toContain("cyan");

    const dlFolder = getFolderStyle("Downloads");
    expect(dlFolder.strokeClass).toContain("sky");

    const trashFolder = getFolderStyle("trash");
    expect(trashFolder.strokeClass).toContain("red");
  });

  it("deterministically assigns consistent colors to arbitrary folders", () => {
    const style1 = getFolderStyle("ProjectAlpha");
    const style2 = getFolderStyle("ProjectAlpha");
    expect(style1.strokeClass).toBe(style2.strokeClass);
    expect(style1.fillClass).toBe(style2.fillClass);

    const styleBeta = getFolderStyle("ProjectBeta");
    // Verify it returns valid classes
    expect(styleBeta.strokeClass).toBeDefined();
    expect(styleBeta.fillClass).toBeDefined();
  });
});
