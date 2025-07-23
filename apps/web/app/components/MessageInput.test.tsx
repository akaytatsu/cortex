/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageInput } from "./MessageInput";

describe("MessageInput", () => {
  const mockOnSendMessage = vi.fn();
  const mockOnSlashCommand = vi.fn();

  beforeEach(() => {
    mockOnSendMessage.mockClear();
    mockOnSlashCommand.mockClear();
  });

  it("renders with placeholder", () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    expect(screen.getByPlaceholderText("Ask Claude Code anything...")).toBeDefined();
  });

  it("renders with custom placeholder", () => {
    render(
      <MessageInput 
        onSendMessage={mockOnSendMessage} 
        placeholder="Custom placeholder" 
      />
    );
    
    expect(screen.getByPlaceholderText("Custom placeholder")).toBeDefined();
  });

  it("shows keyboard shortcuts hint", () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    expect(screen.getByText(/para enviar/)).toBeDefined();
    expect(screen.getByText(/para nova linha/)).toBeDefined();
  });

  it("sends message when form is submitted", () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByPlaceholderText("Ask Claude Code anything...");
    const sendButton = screen.getByLabelText("Enviar mensagem");
    
    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.click(sendButton);
    
    expect(mockOnSendMessage).toHaveBeenCalledWith("Test message");
  });

  it("sends message when Enter is pressed", () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByPlaceholderText("Ask Claude Code anything...");
    
    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    
    expect(mockOnSendMessage).toHaveBeenCalledWith("Test message");
  });

  it("does not send message when Shift+Enter is pressed", () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByPlaceholderText("Ask Claude Code anything...");
    
    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it("disables input and button when disabled", () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} isDisabled={true} />);
    
    const textarea = screen.getByPlaceholderText("Ask Claude Code anything...");
    const sendButton = screen.getByLabelText("Enviar mensagem");
    
    expect(textarea.disabled).toBe(true);
    expect(sendButton.disabled).toBe(true);
  });

  it("shows character count when typing", () => {
    render(<MessageInput onSendMessage={mockOnSendMessage} />);
    
    const textarea = screen.getByPlaceholderText("Ask Claude Code anything...");
    
    fireEvent.change(textarea, { target: { value: "Hello" } });
    
    expect(screen.getByText("5 caracteres")).toBeDefined();
  });

  describe("Slash Commands", () => {
    it("detects slash commands and shows visual indicator", () => {
      render(
        <MessageInput 
          onSendMessage={mockOnSendMessage} 
          onSlashCommand={mockOnSlashCommand} 
        />
      );
      
      const textarea = screen.getByPlaceholderText("Ask Claude Code anything...");
      
      fireEvent.change(textarea, { target: { value: "/BMad:agents:dev" } });
      
      expect(screen.getByText("🤖 Comando de agente detectado")).toBeDefined();
    });

    it("calls onSlashCommand when slash command is submitted", () => {
      render(
        <MessageInput 
          onSendMessage={mockOnSendMessage} 
          onSlashCommand={mockOnSlashCommand} 
        />
      );
      
      const textarea = screen.getByPlaceholderText("Ask Claude Code anything...");
      const sendButton = screen.getByLabelText("Enviar mensagem");
      
      fireEvent.change(textarea, { target: { value: "/BMad:agents:dev arg1 arg2" } });
      fireEvent.click(sendButton);
      
      expect(mockOnSlashCommand).toHaveBeenCalledWith("BMad:agents:dev", ["arg1", "arg2"]);
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it("calls onSendMessage for regular messages when onSlashCommand is provided", () => {
      render(
        <MessageInput 
          onSendMessage={mockOnSendMessage} 
          onSlashCommand={mockOnSlashCommand} 
        />
      );
      
      const textarea = screen.getByPlaceholderText("Ask Claude Code anything...");
      const sendButton = screen.getByLabelText("Enviar mensagem");
      
      fireEvent.change(textarea, { target: { value: "Regular message" } });
      fireEvent.click(sendButton);
      
      expect(mockOnSendMessage).toHaveBeenCalledWith("Regular message");
      expect(mockOnSlashCommand).not.toHaveBeenCalled();
    });

    it("does not detect slash commands without colon", () => {
      render(
        <MessageInput 
          onSendMessage={mockOnSendMessage} 
          onSlashCommand={mockOnSlashCommand} 
        />
      );
      
      const textarea = screen.getByPlaceholderText("Ask Claude Code anything...");
      
      fireEvent.change(textarea, { target: { value: "/help" } });
      
      expect(screen.queryByText("🤖 Comando de agente detectado")).toBeNull();
    });
  });
});