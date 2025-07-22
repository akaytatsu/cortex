import { render, screen } from "@testing-library/react";
import { createRemixStub } from "@remix-run/testing";
import { describe, it, expect, vi } from "vitest";
import { CodeEditor } from "./CodeEditor";
import type { FileContent } from "shared-types";

// Mock Prism.js to avoid issues in tests
vi.mock("prismjs", () => ({
  default: {
    languages: {
      javascript: {},
      typescript: {},
    },
    highlight: (code: string) => code,
  },
}));

describe("CodeEditor", () => {
  const mockWorkspace = "test-workspace";
  
  const createMockRemixStub = (loaderData: unknown) => {
    return createRemixStub([
      {
        path: "/",
        Component: () => (
          <CodeEditor workspaceName={mockWorkspace} filePath="/test/file.js" />
        ),
        loader: () => loaderData,
        action: () => ({ success: true }),
      },
    ]);
  };

  it("should display empty state when no file is selected", () => {
    const RemixStub = createMockRemixStub({});
    render(<RemixStub />);

    const CodeEditorNoFile = () => (
      <CodeEditor workspaceName={mockWorkspace} filePath={null} />
    );

    const { container } = render(<CodeEditorNoFile />);
    expect(container.textContent).toContain("Nenhum arquivo selecionado");
  });

  it("should display loading state", () => {
    const RemixStub = createMockRemixStub({});
    render(<RemixStub />);
    
    // The loading state would be shown during fetch
    expect(screen.getByText("Carregando arquivo...")).toBeDefined();
  });

  it("should display file content when loaded", async () => {
    const mockFileContent: FileContent = {
      path: "/test/file.js",
      content: "console.log('Hello, World!');",
      mimeType: "application/javascript",
      size: 29,
      lastModified: new Date().toISOString(),
    };

    const RemixStub = createMockRemixStub({
      fileContent: mockFileContent,
    });

    render(<RemixStub />);

    // The file name should be displayed in the toolbar
    expect(screen.getByText("file.js")).toBeDefined();
  });

  it("should display error state when file loading fails", () => {
    const RemixStub = createMockRemixStub({
      error: "File not found",
    });

    render(<RemixStub />);

    expect(screen.getByText("Erro ao carregar arquivo")).toBeDefined();
    expect(screen.getByText("File not found")).toBeDefined();
  });

  it("should show minimap for large files", () => {
    const largeContent = Array(60).fill("console.log('line');").join("\n");
    const mockFileContent: FileContent = {
      path: "/test/large-file.js",
      content: largeContent,
      mimeType: "application/javascript",
      size: largeContent.length,
      lastModified: new Date().toISOString(),
    };

    const RemixStub = createMockRemixStub({
      fileContent: mockFileContent,
    });

    render(<RemixStub />);

    // Should show the minimap toggle since it's a large file
    expect(screen.getByLabelText("Mostrar Minimap")).toBeDefined();
  });

  it("should handle different file types correctly", () => {
    const mockFileContent: FileContent = {
      path: "/test/component.tsx",
      content: "export const Component = () => <div>Hello</div>;",
      mimeType: "text/typescript",
      size: 45,
      lastModified: new Date().toISOString(),
    };

    const RemixStub = createMockRemixStub({
      fileContent: mockFileContent,
    });

    render(<RemixStub />);

    // Should detect TypeScript and show appropriate language indicator
    expect(screen.getByText("component.tsx")).toBeDefined();
    expect(screen.getByText("TypeScript")).toBeDefined();
  });
});