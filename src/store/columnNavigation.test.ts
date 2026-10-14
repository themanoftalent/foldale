import { describe, it, expect, beforeEach } from "vitest";
import { useFileManagerStore } from "./useFileManagerStore";

describe("Column Navigation & Adjacent Pane Store", () => {
  beforeEach(() => {
    useFileManagerStore.setState({
      activePane: "left",
      layoutMode: "dual-horizontal",
      columnNavigation: true,
      leftPane: {
        tabs: [
          {
            id: "tab-left-1",
            path: "/Users/darwin",
            title: "darwin",
            history: ["/Users/darwin"],
            historyIndex: 0,
            filterText: "",
            viewMode: "detailed",
            sortField: "name",
            sortDirection: "asc",
            selectedPaths: [],
          },
        ],
        activeTabId: "tab-left-1",
        listing: {
          current_path: "/Users/darwin",
          parent_path: "/Users",
          entries: [
            {
              name: "Desktop",
              path: "/Users/darwin/Desktop",
              is_dir: true,
              is_symlink: false,
              is_hidden: false,
              size: 0,
              permissions: "rwxr-xr-x",
              mime_type: "folder",
              readonly: false,
              modified: Date.now() / 1000,
            },
            {
              name: "Documents",
              path: "/Users/darwin/Documents",
              is_dir: true,
              is_symlink: false,
              is_hidden: false,
              size: 0,
              permissions: "rwxr-xr-x",
              mime_type: "folder",
              readonly: false,
              modified: Date.now() / 1000,
            },
          ],
          total_files: 0,
          total_dirs: 2,
          total_size: 0,
          is_readable: true,
          is_writable: true,
        },
        loading: false,
        error: null,
      },
      rightPane: {
        tabs: [
          {
            id: "tab-right-1",
            path: "/Users/darwin/Downloads",
            title: "Downloads",
            history: ["/Users/darwin/Downloads"],
            historyIndex: 0,
            filterText: "",
            viewMode: "detailed",
            sortField: "name",
            sortDirection: "asc",
            selectedPaths: [],
          },
        ],
        activeTabId: "tab-right-1",
        listing: null,
        loading: false,
        error: null,
      },
    });
  });

  it("has columnNavigation enabled by default", () => {
    const state = useFileManagerStore.getState();
    expect(state.columnNavigation).toBe(true);
  });

  it("can toggle columnNavigation setting", () => {
    useFileManagerStore.getState().setColumnNavigation(false);
    expect(useFileManagerStore.getState().columnNavigation).toBe(false);

    useFileManagerStore.getState().setColumnNavigation(true);
    expect(useFileManagerStore.getState().columnNavigation).toBe(true);
  });

  it("navigates right pane to selected folder on adjacent navigation", async () => {
    const store = useFileManagerStore.getState();
    // Simulate navigating right pane to Desktop
    await store.navigateTo("right", "/Users/darwin/Desktop", true);

    const rightTab = useFileManagerStore.getState().rightPane.tabs.find(
      (t) => t.id === useFileManagerStore.getState().rightPane.activeTabId
    );
    expect(rightTab?.path).toBe("/Users/darwin/Desktop");
    expect(rightTab?.title).toBe("Desktop");

    // History contains both initial and newly navigated folder
    expect(rightTab?.history).toContain("/Users/darwin/Desktop");
  });
});
