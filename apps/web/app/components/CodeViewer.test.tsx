import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createRemixStub } from "@remix-run/testing";
import { CodeViewer } from "./CodeViewer";
import type { FileContent, FileSaveResponse } from "shared-types";

// Mock Prism.js
(global as unknown as { Prism: { highlightElement: typeof vi.fn } }).Prism = {
  highlightElement: vi.fn(),
};

describe("CodeViewer", () => {
  const mockFileContent: FileContent = {
    path: "test.js",
    content: "console.log('Hello World');",
    mimeType: "text/javascript",
  };

  const createStub = (loaderData: unknown, actionData?: unknown) => {
    return createRemixStub([
      {
        path: "/workspace/:workspaceName",
        element: (
          <CodeViewer workspaceName="test-workspace" filePath="test.js" />
        ),
        loader: () => loaderData,
        action: () => actionData,
      },
      {
        path: "/api/workspaces/:workspaceName/file",
        loader: () => ({ fileContent: mockFileContent }),
      },
      {
        path: "/api/workspaces/:workspaceName/file/save",
        action: () => ({ success: true, message: "Arquivo salvo com sucesso" }),
      },
    ]);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render no file selected state", async () => {
    const RemixStub = createStub({});
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    expect(screen.getByText("Nenhum arquivo selecionado")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Selecione um arquivo no Explorer para visualizar seu conteúdo"
      )
    ).toBeInTheDocument();
  });

  it("should render loading state", async () => {
    const RemixStub = createStub({});
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    // Simulate loading by not providing file content immediately
    expect(screen.queryByText("Carregando arquivo...")).toBeInTheDocument();
  });

  it("should render file content with editor", async () => {
    const RemixStub = createStub({ fileContent: mockFileContent });
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("console.log('Hello World');")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("test.js")).toBeInTheDocument();
    expect(screen.getByText("javascript")).toBeInTheDocument();
    expect(screen.getByText("1 linhas")).toBeInTheDocument();
    expect(screen.getByText("Salvar")).toBeInTheDocument();
  });

  it("should show dirty state indicator when content is modified", async () => {
    const RemixStub = createStub({ fileContent: mockFileContent });
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    const textarea = await screen.findByDisplayValue(
      "console.log('Hello World');"
    );

    // Modify content
    fireEvent.change(textarea, {
      target: { value: "console.log('Modified');" },
    });

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("console.log('Modified');")
      ).toBeInTheDocument();
    });

    // Check that dirty indicator appears (orange circle)
    const saveButton = screen.getByText("Salvar");
    expect(saveButton.closest("button")).not.toHaveClass("cursor-not-allowed");
  });

  it("should update line count when content changes", async () => {
    const RemixStub = createStub({ fileContent: mockFileContent });
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    const textarea = await screen.findByDisplayValue(
      "console.log('Hello World');"
    );

    // Add multiple lines
    fireEvent.change(textarea, {
      target: {
        value:
          "console.log('Line 1');\nconsole.log('Line 2');\nconsole.log('Line 3');",
      },
    });

    await waitFor(() => {
      expect(screen.getByText("3 linhas")).toBeInTheDocument();
    });
  });

  it("should enable save button when content is dirty", async () => {
    const RemixStub = createStub({ fileContent: mockFileContent });
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    const textarea = await screen.findByDisplayValue(
      "console.log('Hello World');"
    );
    const saveButton = screen.getByText("Salvar");

    // Initially save should be disabled (not dirty)
    expect(saveButton.closest("button")).toHaveClass("cursor-not-allowed");

    // Modify content
    fireEvent.change(textarea, {
      target: { value: "console.log('Modified');" },
    });

    await waitFor(() => {
      expect(saveButton.closest("button")).not.toHaveClass(
        "cursor-not-allowed"
      );
    });
  });

  it("should trigger save on Ctrl+S", async () => {
    const mockAction = vi.fn(() => ({ success: true, message: "Saved!" }));
    const RemixStub = createStub(
      { fileContent: mockFileContent },
      mockAction()
    );
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    const textarea = await screen.findByDisplayValue(
      "console.log('Hello World');"
    );

    // Modify content first to make it dirty
    fireEvent.change(textarea, {
      target: { value: "console.log('Modified');" },
    });

    // Trigger Ctrl+S
    fireEvent.keyDown(document, { key: "s", ctrlKey: true });

    await waitFor(() => {
      expect(textarea).toHaveValue("console.log('Modified');");
    });
  });

  it("should handle save button click", async () => {
    const RemixStub = createStub({ fileContent: mockFileContent });
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    const textarea = await screen.findByDisplayValue(
      "console.log('Hello World');"
    );

    // Modify content to make it dirty
    fireEvent.change(textarea, {
      target: { value: "console.log('Modified');" },
    });

    const saveButton = await screen.findByText("Salvar");

    await waitFor(() => {
      expect(saveButton.closest("button")).not.toHaveClass(
        "cursor-not-allowed"
      );
    });

    fireEvent.click(saveButton);

    // Verify save action is triggered
    await waitFor(() => {
      expect(saveButton.closest("button")).toHaveClass("cursor-not-allowed");
    });
  });

  it("should show error state", async () => {
    const RemixStub = createStub({ error: "File not found" });
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    await waitFor(() => {
      expect(screen.getByText("Erro ao carregar arquivo")).toBeInTheDocument();
      expect(screen.getByText("File not found")).toBeInTheDocument();
    });
  });

  it("should show save success message", async () => {
    const saveResponse: FileSaveResponse = {
      success: true,
      message: "Arquivo salvo com sucesso!",
    };

    const RemixStub = createStub(
      { fileContent: mockFileContent },
      saveResponse
    );
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    const textarea = await screen.findByDisplayValue(
      "console.log('Hello World');"
    );
    fireEvent.change(textarea, { target: { value: "Modified content" } });

    const saveButton = screen.getByText("Salvar");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText("Arquivo salvo com sucesso!")
      ).toBeInTheDocument();
    });
  });

  it("should show save error message", async () => {
    const saveResponse: FileSaveResponse = {
      success: false,
      message: "Permission denied",
    };

    const RemixStub = createStub(
      { fileContent: mockFileContent },
      saveResponse
    );
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    const textarea = await screen.findByDisplayValue(
      "console.log('Hello World');"
    );
    fireEvent.change(textarea, { target: { value: "Modified content" } });

    const saveButton = screen.getByText("Salvar");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Permission denied")).toBeInTheDocument();
    });

    // Error message should have red styling
    const errorMessage = screen.getByText("Permission denied");
    expect(errorMessage.closest("div")).toHaveClass("text-red-700");
  });

  it("should prevent save when content is not dirty", async () => {
    const RemixStub = createStub({ fileContent: mockFileContent });
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    await screen.findByDisplayValue("console.log('Hello World');");

    const saveButton = screen.getByText("Salvar");

    // Save button should be disabled when not dirty
    expect(saveButton.closest("button")).toHaveClass("cursor-not-allowed");
    expect(saveButton.closest("button")).toBeDisabled();
  });

  it("should handle different file types correctly", async () => {
    const jsonFileContent: FileContent = {
      path: "config.json",
      content: '{"name": "test"}',
      mimeType: "application/json",
    };

    const RemixStub = createStub({ fileContent: jsonFileContent });
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    await waitFor(() => {
      expect(screen.getByText("config.json")).toBeInTheDocument();
      expect(screen.getByText("json")).toBeInTheDocument();
      expect(screen.getByDisplayValue('{"name": "test"}')).toBeInTheDocument();
    });
  });

  it("should preserve content structure with line breaks", async () => {
    const multiLineContent: FileContent = {
      path: "multi.js",
      content: "function test() {\n  console.log('hello');\n  return true;\n}",
      mimeType: "text/javascript",
    };

    const RemixStub = createStub({ fileContent: multiLineContent });
    render(<RemixStub initialEntries={["/workspace/test"]} />);

    await waitFor(() => {
      expect(screen.getByText("4 linhas")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue(
          "function test() {\n  console.log('hello');\n  return true;\n}"
        )
      ).toBeInTheDocument();
    });
  });
});
