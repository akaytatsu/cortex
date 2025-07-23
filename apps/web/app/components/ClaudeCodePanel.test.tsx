/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ClaudeCodePanel } from "./ClaudeCodePanel";

describe("ClaudeCodePanel", () => {
  const defaultProps = {
    workspaceName: "test-workspace",
    workspacePath: "/path/to/workspace",
    isVisible: true,
    onToggleVisibility: vi.fn(),
  };

  it("renders when visible", () => {
    render(<ClaudeCodePanel {...defaultProps} />);
    
    expect(screen.getByText("Claude Code Assistant")).toBeDefined();
    expect(screen.getByPlaceholderText("Ask Claude Code anything...")).toBeDefined();
  });

  it("does not render when not visible", () => {
    render(<ClaudeCodePanel {...defaultProps} isVisible={false} />);
    
    expect(screen.queryByText("Claude Code Assistant")).toBeNull();
  });

  it("shows empty state message when no messages", () => {
    render(<ClaudeCodePanel {...defaultProps} />);
    
    expect(screen.getByText("Olá! Como posso ajudar?")).toBeDefined();
    expect(screen.getByText(/Sou seu assistente de desenvolvimento/)).toBeDefined();
  });

  it("shows keyboard shortcuts hint", () => {
    render(<ClaudeCodePanel {...defaultProps} />);
    
    expect(screen.getByText(/para enviar/)).toBeDefined();
    expect(screen.getByText(/para nova linha/)).toBeDefined();
  });
});