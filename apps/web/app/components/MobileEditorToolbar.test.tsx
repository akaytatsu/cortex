import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MobileEditorToolbar } from "./MobileEditorToolbar";

// Mock useTouchClasses hook
vi.mock("../hooks/useTouchDevice", () => ({
  useTouchClasses: () => ({
    button: (size: string) => `touch-target-${size}`,
  }),
}));

describe("MobileEditorToolbar", () => {
  const defaultProps = {
    fontSize: 14,
    onFontSizeChange: vi.fn(),
    isCompactMode: false,
    onToggleCompact: vi.fn(),
    theme: "dark" as const,
    language: "javascript",
    isVisible: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when visible", () => {
    render(<MobileEditorToolbar {...defaultProps} />);
    
    expect(screen.getByTitle("Principal")).toBeDefined();
    expect(screen.getByTitle("Editar")).toBeDefined();
    expect(screen.getByTitle("Navegar")).toBeDefined();
    expect(screen.getByTitle("Exibir")).toBeDefined();
  });

  it("does not render when not visible", () => {
    render(<MobileEditorToolbar {...defaultProps} isVisible={false} />);
    
    expect(screen.queryByTitle("Principal")).toBe(null);
  });

  it("shows main tab content by default", () => {
    render(<MobileEditorToolbar {...defaultProps} />);
    
    expect(screen.getByText("Fonte:")).toBeDefined();
    expect(screen.getByText("14px")).toBeDefined();
    expect(screen.getByText("Compacto")).toBeDefined();
  });

  it("switches tabs when tab buttons are clicked", () => {
    render(<MobileEditorToolbar {...defaultProps} />);
    
    // Switch to edit tab
    fireEvent.click(screen.getByTitle("Editar"));
    expect(screen.getByTitle("Desfazer")).toBeDefined();
    expect(screen.getByTitle("Copiar")).toBeDefined();
    
    // Switch to navigate tab
    fireEvent.click(screen.getByTitle("Navegar"));
    expect(screen.getByText("Localizar")).toBeDefined();
    
    // Switch to view tab
    fireEvent.click(screen.getByTitle("Exibir"));
    expect(screen.getByText("Tema:")).toBeDefined();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<MobileEditorToolbar {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByTitle("Fechar toolbar");
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("handles font size changes", () => {
    const onFontSizeChange = vi.fn();
    render(
      <MobileEditorToolbar 
        {...defaultProps} 
        onFontSizeChange={onFontSizeChange}
        fontSize={14}
      />
    );
    
    const increaseButton = screen.getByTitle("Aumentar fonte");
    const decreaseButton = screen.getByTitle("Diminuir fonte");
    
    fireEvent.click(increaseButton);
    expect(onFontSizeChange).toHaveBeenCalledWith(15);
    
    fireEvent.click(decreaseButton);
    expect(onFontSizeChange).toHaveBeenCalledWith(13);
  });

  it("disables font size buttons at limits", () => {
    const { rerender } = render(
      <MobileEditorToolbar {...defaultProps} fontSize={8} />
    );
    
    const decreaseButton = screen.getByTitle("Diminuir fonte");
    expect(decreaseButton.disabled).toBe(true);
    
    rerender(<MobileEditorToolbar {...defaultProps} fontSize={24} />);
    
    const increaseButton = screen.getByTitle("Aumentar fonte");
    expect(increaseButton.disabled).toBe(true);
  });

  it("handles compact mode toggle", () => {
    const onToggleCompact = vi.fn();
    render(
      <MobileEditorToolbar 
        {...defaultProps} 
        onToggleCompact={onToggleCompact}
        isCompactMode={false}
      />
    );
    
    const compactButton = screen.getByTitle("Ativar modo compacto");
    fireEvent.click(compactButton);
    
    expect(onToggleCompact).toHaveBeenCalledWith(true);
  });

  it("shows undo/redo buttons in edit tab", () => {
    render(<MobileEditorToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByTitle("Editar"));
    
    expect(screen.getByTitle("Desfazer")).toBeDefined();
    expect(screen.getByTitle("Refazer")).toBeDefined();
  });

  it("disables undo/redo buttons when not available", () => {
    render(
      <MobileEditorToolbar 
        {...defaultProps} 
        canUndo={false}
        canRedo={false}
      />
    );
    
    fireEvent.click(screen.getByTitle("Editar"));
    
    const undoButton = screen.getByTitle("Desfazer");
    const redoButton = screen.getByTitle("Refazer");
    
    expect(undoButton.disabled).toBe(true);
    expect(redoButton.disabled).toBe(true);
  });

  it("shows clipboard actions in edit tab", () => {
    render(<MobileEditorToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByTitle("Editar"));
    
    expect(screen.getByTitle("Copiar")).toBeDefined();
    expect(screen.getByTitle("Cortar")).toBeDefined();
    expect(screen.getByTitle("Colar")).toBeDefined();
  });

  it("disables copy/cut when no selection", () => {
    render(
      <MobileEditorToolbar 
        {...defaultProps} 
        hasSelection={false}
      />
    );
    
    fireEvent.click(screen.getByTitle("Editar"));
    
    const copyButton = screen.getByTitle("Copiar");
    const cutButton = screen.getByTitle("Cortar");
    
    expect(copyButton.disabled).toBe(true);
    expect(cutButton.disabled).toBe(true);
  });

  it("shows navigation controls in navigate tab", () => {
    render(
      <MobileEditorToolbar 
        {...defaultProps} 
        currentLine={5}
        totalLines={100}
      />
    );
    
    fireEvent.click(screen.getByTitle("Navegar"));
    
    expect(screen.getByText("Localizar")).toBeDefined();
    expect(screen.getByText("Ln 5/100")).toBeDefined();
  });

  it("shows error navigation when errors exist", () => {
    render(
      <MobileEditorToolbar 
        {...defaultProps} 
        errorCount={3}
      />
    );
    
    fireEvent.click(screen.getByTitle("Navegar"));
    
    expect(screen.getByText("3 erros")).toBeDefined();
    expect(screen.getByTitle("Erro anterior")).toBeDefined();
    expect(screen.getByTitle("Próximo erro")).toBeDefined();
  });

  it("shows theme and language in view tab", () => {
    render(
      <MobileEditorToolbar 
        {...defaultProps} 
        theme="dark"
        language="typescript"
      />
    );
    
    fireEvent.click(screen.getByTitle("Exibir"));
    
    expect(screen.getByText("Tema:")).toBeDefined();
    expect(screen.getByText("Escuro")).toBeDefined();
    expect(screen.getByText("Linguagem:")).toBeDefined();
    expect(screen.getByText("typescript")).toBeDefined();
  });

  it("calls action handlers when provided", () => {
    const onUndo = vi.fn();
    const onFind = vi.fn();
    const onThemeChange = vi.fn();
    
    render(
      <MobileEditorToolbar 
        {...defaultProps} 
        onUndo={onUndo}
        onFind={onFind}
        onThemeChange={onThemeChange}
        canUndo={true}
      />
    );
    
    // Test undo
    fireEvent.click(screen.getByTitle("Editar"));
    fireEvent.click(screen.getByTitle("Desfazer"));
    expect(onUndo).toHaveBeenCalledTimes(1);
    
    // Test find
    fireEvent.click(screen.getByTitle("Navegar"));
    fireEvent.click(screen.getByText("Localizar"));
    expect(onFind).toHaveBeenCalledTimes(1);
    
    // Test theme change
    fireEvent.click(screen.getByTitle("Exibir"));
    fireEvent.click(screen.getByTitle("Alternar para tema claro"));
    expect(onThemeChange).toHaveBeenCalledWith("light");
  });
});