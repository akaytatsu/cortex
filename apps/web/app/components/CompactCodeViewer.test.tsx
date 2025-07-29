import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CompactCodeViewer } from "./CompactCodeViewer";

// Mock useTouchClasses hook
vi.mock("../hooks/useTouchDevice", () => ({
  useTouchClasses: () => ({
    button: (size: string) => `touch-target-${size}`,
  }),
}));

describe("CompactCodeViewer", () => {
  const defaultProps = {
    isCompactMode: false,
    onToggleCompact: vi.fn(),
    fontSize: 13,
    onFontSizeChange: vi.fn(),
    wordWrap: false,
    onWordWrapChange: vi.fn(),
    showLineNumbers: true,
    onLineNumbersChange: vi.fn(),
    showMinimap: false,
    onMinimapChange: vi.fn(),
    isMobile: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders compact mode toggle button", () => {
    render(<CompactCodeViewer {...defaultProps} />);
    
    const compactButton = screen.getByRole("button", { name: /compacto/i });
    expect(compactButton).toBeDefined();
  });

  it("shows correct state when compact mode is disabled", () => {
    render(<CompactCodeViewer {...defaultProps} />);
    
    const compactButton = screen.getByRole("button", { name: /compacto/i });
    expect(compactButton.title).toBe("Ativar modo compacto");
  });

  it("shows correct state when compact mode is enabled", () => {
    render(<CompactCodeViewer {...defaultProps} isCompactMode={true} />);
    
    const compactButton = screen.getByTitle("Desativar modo compacto");
    expect(compactButton.title).toBe("Desativar modo compacto");
  });

  it("calls onToggleCompact when compact button is clicked", () => {
    const onToggleCompact = vi.fn();
    render(<CompactCodeViewer {...defaultProps} onToggleCompact={onToggleCompact} />);
    
    const compactButton = screen.getByRole("button", { name: /compacto/i });
    fireEvent.click(compactButton);
    
    expect(onToggleCompact).toHaveBeenCalledWith(true);
  });

  it("shows compact mode controls when compact mode is enabled", () => {
    render(<CompactCodeViewer {...defaultProps} isCompactMode={true} />);
    
    // Font size controls should be visible
    expect(screen.getByText("13")).toBeDefined();
    
    // Quick toggle buttons should be visible
    const lineNumbersButton = screen.getByTitle(/números de linha/i);
    const wordWrapButton = screen.getByTitle(/quebra de linha/i);
    
    expect(lineNumbersButton).toBeDefined();
    expect(wordWrapButton).toBeDefined();
  });

  it("hides compact mode controls when compact mode is disabled", () => {
    render(<CompactCodeViewer {...defaultProps} isCompactMode={false} />);
    
    // Font size controls should not be visible
    expect(screen.queryByText("13")).toBe(null);
  });

  it("calls onFontSizeChange when font size buttons are clicked", () => {
    const onFontSizeChange = vi.fn();
    render(
      <CompactCodeViewer 
        {...defaultProps} 
        isCompactMode={true} 
        onFontSizeChange={onFontSizeChange}
        fontSize={13}
      />
    );
    
    const increaseFontButton = screen.getByTitle("Aumentar fonte");
    const decreaseFontButton = screen.getByTitle("Diminuir fonte");
    
    fireEvent.click(increaseFontButton);
    expect(onFontSizeChange).toHaveBeenCalledWith(14);
    
    fireEvent.click(decreaseFontButton);
    expect(onFontSizeChange).toHaveBeenCalledWith(12);
  });

  it("prevents font size from going below 8 or above 24", () => {
    const onFontSizeChange = vi.fn();
    
    // Test minimum font size
    const { rerender } = render(
      <CompactCodeViewer 
        {...defaultProps} 
        isCompactMode={true} 
        onFontSizeChange={onFontSizeChange}
        fontSize={8}
      />
    );
    
    const decreaseFontButton = screen.getByTitle("Diminuir fonte");
    expect(decreaseFontButton.disabled).toBe(true);
    
    // Test maximum font size
    rerender(
      <CompactCodeViewer 
        {...defaultProps} 
        isCompactMode={true} 
        onFontSizeChange={onFontSizeChange}
        fontSize={24}
      />
    );
    
    const increaseFontButton = screen.getByTitle("Aumentar fonte");
    expect(increaseFontButton.disabled).toBe(true);
  });

  it("calls toggle functions when quick toggle buttons are clicked", () => {
    const onLineNumbersChange = vi.fn();
    const onWordWrapChange = vi.fn();
    
    render(
      <CompactCodeViewer 
        {...defaultProps} 
        isCompactMode={true}
        onLineNumbersChange={onLineNumbersChange}
        onWordWrapChange={onWordWrapChange}
        showLineNumbers={true}
        wordWrap={false}
      />
    );
    
    const lineNumbersButton = screen.getByTitle(/números de linha/i);
    const wordWrapButton = screen.getByTitle(/quebra de linha/i);
    
    fireEvent.click(lineNumbersButton);
    expect(onLineNumbersChange).toHaveBeenCalledWith(false);
    
    fireEvent.click(wordWrapButton);
    expect(onWordWrapChange).toHaveBeenCalledWith(true);
  });

  it("shows minimap toggle only on desktop", () => {
    const { rerender } = render(
      <CompactCodeViewer {...defaultProps} isCompactMode={true} isMobile={false} />
    );
    
    // Should show minimap toggle on desktop
    expect(screen.getByTitle(/minimap/i)).toBeDefined();
    
    // Should hide minimap toggle on mobile
    rerender(
      <CompactCodeViewer {...defaultProps} isCompactMode={true} isMobile={true} />
    );
    
    expect(screen.queryByTitle(/minimap/i)).toBe(null);
  });

  it("shows settings dropdown when settings button is clicked", () => {
    render(<CompactCodeViewer {...defaultProps} isCompactMode={true} />);
    
    const settingsButton = screen.getByTitle("Presets de modo compacto");
    fireEvent.click(settingsButton);
    
    expect(screen.getByText("Presets Compactos")).toBeDefined();
    expect(screen.getByText("Mínimo")).toBeDefined();
    expect(screen.getByText("Leitura")).toBeDefined();
    expect(screen.getByText("Edição")).toBeDefined();
  });

  it("applies preset configuration when preset is selected", () => {
    const onLineNumbersChange = vi.fn();
    const onMinimapChange = vi.fn();
    const onWordWrapChange = vi.fn();
    const onFontSizeChange = vi.fn();
    
    render(
      <CompactCodeViewer 
        {...defaultProps} 
        isCompactMode={true}
        onLineNumbersChange={onLineNumbersChange}
        onMinimapChange={onMinimapChange}
        onWordWrapChange={onWordWrapChange}
        onFontSizeChange={onFontSizeChange}
      />
    );
    
    // Open settings
    const settingsButton = screen.getByTitle("Presets de modo compacto");
    fireEvent.click(settingsButton);
    
    // Click on "Mínimo" preset
    const minimalPreset = screen.getByText("Mínimo");
    fireEvent.click(minimalPreset);
    
    // Check that the correct configuration is applied
    expect(onLineNumbersChange).toHaveBeenCalledWith(false);
    expect(onMinimapChange).toHaveBeenCalledWith(false);
    expect(onWordWrapChange).toHaveBeenCalledWith(true);
    expect(onFontSizeChange).toHaveBeenCalledWith(11);
  });
});