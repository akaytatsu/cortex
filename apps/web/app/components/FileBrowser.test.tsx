import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createRemixStub } from "@remix-run/testing";
import { FileBrowser } from "./FileBrowser";
import type { FileSystemItem } from "shared-types";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Folder: () => <span data-testid="folder-icon">📁</span>,
  FolderOpen: () => <span data-testid="folder-open-icon">📂</span>,
  File: () => <span data-testid="file-icon">📄</span>,
  Code: () => <span data-testid="code-icon">💻</span>,
  FileText: () => <span data-testid="text-icon">📝</span>,
  Settings: () => <span data-testid="settings-icon">⚙️</span>,
  Image: () => <span data-testid="image-icon">🖼️</span>,
  Database: () => <span data-testid="database-icon">🗄️</span>,
  Package: () => <span data-testid="package-icon">📦</span>,
  Loader2: () => <span data-testid="loader-icon">⏳</span>,
  ChevronRight: () => <span data-testid="chevron-right">▶</span>,
  ChevronDown: () => <span data-testid="chevron-down">▼</span>,
}));

const mockFiles: FileSystemItem[] = [
  {
    name: "src",
    path: "src",
    type: "directory",
    children: [
      { name: "index.ts", path: "src/index.ts", type: "file" },
      { name: "utils.ts", path: "src/utils.ts", type: "file" },
    ],
  },
  { name: "package.json", path: "package.json", type: "file" },
  { name: "README.md", path: "README.md", type: "file" },
];

describe("FileBrowser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createComponent(
    files: FileSystemItem[] = mockFiles,
    error?: string
  ) {
    const RemixStub = createRemixStub([
      {
        path: "/",
        Component: () => (
          <FileBrowser workspaceName="test-workspace" onFileSelect={vi.fn()} />
        ),
      },
      {
        path: "/api/workspaces/test-workspace/files",
        loader: () => ({ files, error }),
      },
    ]);

    return render(<RemixStub initialEntries={["/"]} />);
  }

  it("should render file browser with files", async () => {
    createComponent();

    await waitFor(() => {
      expect(screen.getByText("src")).toBeInTheDocument();
      expect(screen.getByText("package.json")).toBeInTheDocument();
      expect(screen.getByText("README.md")).toBeInTheDocument();
    });
  });

  it("should show loading state initially", () => {
    createComponent([]);

    expect(screen.getByText("Carregando arquivos...")).toBeInTheDocument();
    expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
  });

  it("should show error state when there's an error", async () => {
    createComponent([], "Failed to load files");

    await waitFor(() => {
      expect(screen.getByText("Erro ao carregar arquivos")).toBeInTheDocument();
      expect(screen.getByText("Failed to load files")).toBeInTheDocument();
    });
  });

  it("should show empty state when no files found", async () => {
    createComponent([]);

    await waitFor(() => {
      expect(screen.getByText("Nenhum arquivo encontrado")).toBeInTheDocument();
    });
  });

  it("should display correct icons for different file types", async () => {
    const filesWithDifferentTypes: FileSystemItem[] = [
      { name: "script.js", path: "script.js", type: "file" },
      { name: "config.json", path: "config.json", type: "file" },
      { name: "README.md", path: "README.md", type: "file" },
      { name: "image.png", path: "image.png", type: "file" },
      {
        name: "folder",
        path: "folder",
        type: "directory",
        children: [],
      },
    ];

    createComponent(filesWithDifferentTypes);

    await waitFor(() => {
      expect(screen.getByTestId("code-icon")).toBeInTheDocument(); // .js file
      expect(screen.getByTestId("settings-icon")).toBeInTheDocument(); // .json file
      expect(screen.getByTestId("text-icon")).toBeInTheDocument(); // .md file
      expect(screen.getByTestId("image-icon")).toBeInTheDocument(); // .png file
      expect(screen.getByTestId("folder-icon")).toBeInTheDocument(); // directory
    });
  });

  it("should expand/collapse directories when clicked", async () => {
    createComponent();

    await waitFor(() => {
      expect(screen.getByText("src")).toBeInTheDocument();
    });

    // Initially, children should not be visible
    expect(screen.queryByText("index.ts")).not.toBeInTheDocument();
    expect(screen.queryByText("utils.ts")).not.toBeInTheDocument();

    // Click to expand directory
    fireEvent.click(screen.getByText("src"));

    await waitFor(() => {
      expect(screen.getByText("index.ts")).toBeInTheDocument();
      expect(screen.getByText("utils.ts")).toBeInTheDocument();
    });

    // Click again to collapse
    fireEvent.click(screen.getByText("src"));

    await waitFor(() => {
      expect(screen.queryByText("index.ts")).not.toBeInTheDocument();
      expect(screen.queryByText("utils.ts")).not.toBeInTheDocument();
    });
  });

  it("should call onFileSelect when file is clicked", async () => {
    const mockOnFileSelect = vi.fn();

    const RemixStub = createRemixStub([
      {
        path: "/",
        Component: () => (
          <FileBrowser
            workspaceName="test-workspace"
            onFileSelect={mockOnFileSelect}
          />
        ),
      },
      {
        path: "/api/workspaces/test-workspace/files",
        loader: () => ({ files: mockFiles }),
      },
    ]);

    render(<RemixStub initialEntries={["/"]} />);

    await waitFor(() => {
      expect(screen.getByText("package.json")).toBeInTheDocument();
    });

    // Click on a file
    fireEvent.click(screen.getByText("package.json"));

    expect(mockOnFileSelect).toHaveBeenCalledWith("package.json");
  });

  it("should show chevron indicators for directories", async () => {
    createComponent();

    await waitFor(() => {
      expect(screen.getByTestId("chevron-right")).toBeInTheDocument();
    });

    // Expand directory
    fireEvent.click(screen.getByText("src"));

    await waitFor(() => {
      expect(screen.getByTestId("chevron-down")).toBeInTheDocument();
    });
  });
});
