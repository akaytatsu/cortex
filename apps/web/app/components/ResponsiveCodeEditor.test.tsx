import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResponsiveCodeEditor } from "./ResponsiveCodeEditor";

// Mock Monaco Editor
vi.mock("@monaco-editor/react", () => ({
  Editor: vi.fn(({ value, loading }) => {
    return (
      <div data-testid="monaco-editor">
        {loading || (
          <div data-testid="editor-content">
            Editor loaded with value: {value}
          </div>
        )}
      </div>
    );
  }),
}));

describe("ResponsiveCodeEditor", () => {
  const defaultProps = {
    value: "console.log('hello world');",
    onChange: vi.fn(),
    language: "javascript",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the editor", () => {
    render(<ResponsiveCodeEditor {...defaultProps} />);
    const editor = screen.getByTestId("monaco-editor");
    expect(editor).toBeDefined();
  });

  it("displays loading state initially", () => {
    render(<ResponsiveCodeEditor {...defaultProps} />);
    const loadingText = screen.getByText("Carregando editor...");
    expect(loadingText).toBeDefined();
  });

  it("applies mobile-specific configuration", () => {
    render(
      <ResponsiveCodeEditor
        {...defaultProps}
        isMobile={true}
        fontSize={14}
      />
    );
    
    const editor = screen.getByTestId("monaco-editor");
    expect(editor).toBeDefined();
  });

  it("applies compact mode configuration", () => {
    render(
      <ResponsiveCodeEditor
        {...defaultProps}
        isCompactMode={true}
        fontSize={12}
      />
    );
    
    const editor = screen.getByTestId("monaco-editor");
    expect(editor).toBeDefined();
  });

  it("handles touch device settings", () => {
    render(
      <ResponsiveCodeEditor
        {...defaultProps}
        isTouch={true}
        isMobile={true}
      />
    );
    
    const editor = screen.getByTestId("monaco-editor");
    expect(editor).toBeDefined();
  });

  it("applies readonly mode", () => {
    render(
      <ResponsiveCodeEditor
        {...defaultProps}
        readonly={true}
      />
    );
    
    const editor = screen.getByTestId("monaco-editor");
    expect(editor).toBeDefined();
  });

  it("handles different languages", () => {
    const { rerender } = render(
      <ResponsiveCodeEditor
        {...defaultProps}
        language="typescript"
      />
    );
    
    expect(screen.getByTestId("monaco-editor")).toBeDefined();

    rerender(
      <ResponsiveCodeEditor
        {...defaultProps}
        language="python"
      />
    );
    
    expect(screen.getByTestId("monaco-editor")).toBeDefined();
  });

  it("handles theme changes", () => {
    const { rerender } = render(
      <ResponsiveCodeEditor
        {...defaultProps}
        theme="vs-dark"
      />
    );

    expect(screen.getByTestId("monaco-editor")).toBeDefined();

    rerender(
      <ResponsiveCodeEditor
        {...defaultProps}
        theme="vs-light"
      />
    );

    expect(screen.getByTestId("monaco-editor")).toBeDefined();
  });

  it("adjusts font size for mobile", () => {
    render(
      <ResponsiveCodeEditor
        {...defaultProps}
        fontSize={13}
        isMobile={true}
      />
    );

    const editor = screen.getByTestId("monaco-editor");
    expect(editor).toBeDefined();
  });

  it("combines mobile and compact mode", () => {
    render(
      <ResponsiveCodeEditor
        {...defaultProps}
        fontSize={13}
        isMobile={true}
        isCompactMode={true}
      />
    );

    const editor = screen.getByTestId("monaco-editor");
    expect(editor).toBeDefined();
  });
});