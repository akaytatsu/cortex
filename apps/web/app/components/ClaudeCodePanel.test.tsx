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
    expect(screen.getByPlaceholderText("Digite / para comandos ou faça uma pergunta...")).toBeDefined();
  });

  it("does not render when not visible", () => {
    render(<ClaudeCodePanel {...defaultProps} isVisible={false} />);
    
    expect(screen.queryByText("Claude Code Assistant")).toBeNull();
  });

  it("shows empty state message when no messages", () => {
    render(<ClaudeCodePanel {...defaultProps} />);
    
    expect(screen.getByText("Olá! Como posso ajudar?")).toBeDefined();
    expect(screen.getByText(/Use comandos com/)).toBeDefined();
  });

  it("shows available commands", () => {
    render(<ClaudeCodePanel {...defaultProps} />);
    
    expect(screen.getByText(/Comandos disponíveis/)).toBeDefined();
    expect(screen.getByText("/help")).toBeDefined();
    expect(screen.getByText("/clear")).toBeDefined();
  });
});