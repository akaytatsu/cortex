import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createRemixStub } from "@remix-run/testing";
import { CodeViewer } from "./CodeViewer";
import type { FileContent } from "shared-types";

// Mock Prism.js
vi.mock("prismjs", () => ({
  default: {
    highlightElement: vi.fn(),
  },
}));

// Mock CSS imports
vi.mock("prismjs/themes/prism.css", () => ({}));
vi.mock("prismjs/components/prism-typescript", () => ({}));
vi.mock("prismjs/components/prism-javascript", () => ({}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  File: () => <span data-testid="file-icon">📄</span>,
  AlertCircle: () => <span data-testid="alert-icon">⚠️</span>,
  Loader2: () => <span data-testid="loader-icon">⏳</span>,
  FileX: () => <span data-testid="file-x-icon">❌</span>,
}));

const mockFileContent: FileContent = {
  path: "src/index.ts",
  content: "console.log('Hello, world!');",
  mimeType: "text/typescript",
};

describe("CodeViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createComponent(
    filePath: string | null = null,
    fileContent?: FileContent,
    error?: string
  ) {
    const RemixStub = createRemixStub([
      {
        path: "/",
        Component: () => (
          <CodeViewer
            workspaceName="test-workspace"
            filePath={filePath}
          />
        ),
      },
      {
        path: "/api/workspaces/test-workspace/file",
        loader: () => ({ fileContent, error }),
      },
    ]);

    return render(<RemixStub initialEntries={["/"]} />);
  }

  it("should show empty state when no file is selected", () => {
    createComponent();

    expect(screen.getByText("Nenhum arquivo selecionado")).toBeInTheDocument();
    expect(screen.getByText("Selecione um arquivo no Explorer para visualizar seu conteúdo")).toBeInTheDocument();
    expect(screen.getByTestId("file-icon")).toBeInTheDocument();
  });

  it("should show loading state when loading file", () => {
    createComponent("src/index.ts");

    expect(screen.getByText("Carregando arquivo...")).toBeInTheDocument();
    expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
  });

  it("should display file content when loaded successfully", async () => {
    createComponent("src/index.ts", mockFileContent);

    await waitFor(() => {
      expect(screen.getByText("index.ts")).toBeInTheDocument();
      expect(screen.getByText("typescript")).toBeInTheDocument();
      expect(screen.getByText("1 linhas")).toBeInTheDocument();
      expect(screen.getByText("console.log('Hello, world!');")).toBeInTheDocument();
    });
  });

  it("should show error state when file loading fails", async () => {
    createComponent("src/index.ts", undefined, "File not found");

    await waitFor(() => {
      expect(screen.getByText("Erro ao carregar arquivo")).toBeInTheDocument();
      expect(screen.getByText("File not found")).toBeInTheDocument();
      expect(screen.getByText("src/index.ts")).toBeInTheDocument();
      expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
    });
  });

  it("should show not found state when no content is available", async () => {
    createComponent("src/index.ts");

    await waitFor(() => {
      expect(screen.getByText("Arquivo não encontrado")).toBeInTheDocument();
      expect(screen.getByTestId("file-x-icon")).toBeInTheDocument();
    });
  });

  it("should display correct file information in header", async () => {
    const fileContent: FileContent = {
      path: "src/utils.js",
      content: "function add(a, b) {\\n  return a + b;\\n}",
      mimeType: "text/javascript",
    };

    createComponent("src/utils.js", fileContent);

    await waitFor(() => {
      expect(screen.getByText("utils.js")).toBeInTheDocument();
      expect(screen.getByText("javascript")).toBeInTheDocument();
      expect(screen.getByText("1 linhas")).toBeInTheDocument(); // Note: split by \\n in test
    });
  });

  it("should handle different file types with correct language detection", async () => {
    const testCases = [
      { fileName: "style.css", mimeType: "text/css", expectedLang: "css" },
      { fileName: "data.json", mimeType: "application/json", expectedLang: "json" },
      { fileName: "script.py", mimeType: "text/x-python", expectedLang: "python" },
      { fileName: "config.yaml", mimeType: "text/yaml", expectedLang: "yaml" },
      { fileName: "README.md", mimeType: "text/markdown", expectedLang: "markdown" },
    ];

    for (const testCase of testCases) {
      const fileContent: FileContent = {
        path: testCase.fileName,
        content: "test content",
        mimeType: testCase.mimeType,
      };

      const { unmount } = createComponent(testCase.fileName, fileContent);

      await waitFor(() => {
        expect(screen.getByText(testCase.expectedLang)).toBeInTheDocument();
      });

      unmount();
    }
  });

  it("should render code with proper syntax highlighting class", async () => {
    createComponent("src/index.js", {
      path: "src/index.js",
      content: "console.log('test');",
      mimeType: "text/javascript",
    });

    await waitFor(() => {
      const codeElement = document.querySelector('code.language-javascript');
      expect(codeElement).toBeInTheDocument();
      expect(codeElement).toHaveTextContent("console.log('test');");
    });
  });
});