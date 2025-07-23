import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MessageInput } from "./MessageInput";

describe("MessageInput", () => {
  const mockOnSendMessage = vi.fn();

  beforeEach(() => {
    mockOnSendMessage.mockClear();
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
});