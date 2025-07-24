import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { CommandInput } from "./CommandInput";

describe("CommandInput", () => {
  const mockOnSendCommand = vi.fn();
  const defaultProps = {
    onSendCommand: mockOnSendCommand,
    isDisabled: false,
    placeholder: "Digite um comando...",
  };

  beforeEach(() => {
    mockOnSendCommand.mockClear();
  });

  it("renders with correct placeholder", () => {
    render(<CommandInput {...defaultProps} />);
    expect(screen.getByPlaceholderText("Digite um comando...")).toBeInTheDocument();
  });

  it("renders with custom placeholder", () => {
    render(<CommandInput {...defaultProps} placeholder="Custom placeholder" />);
    expect(screen.getByPlaceholderText("Custom placeholder")).toBeInTheDocument();
  });

  it("sends command on form submit", async () => {
    const user = userEvent.setup();
    render(<CommandInput {...defaultProps} />);
    
    const input = screen.getByPlaceholderText("Digite um comando...");
    const button = screen.getByRole("button", { name: /enviar/i });
    
    await user.type(input, "test command");
    await user.click(button);
    
    expect(mockOnSendCommand).toHaveBeenCalledWith("test command");
    expect(input).toHaveValue(""); // Input should be cleared after sending
  });

  it("sends command on Enter key press", async () => {
    const user = userEvent.setup();
    render(<CommandInput {...defaultProps} />);
    
    const input = screen.getByPlaceholderText("Digite um comando...");
    
    await user.type(input, "test command");
    await user.keyboard("{Enter}");
    
    expect(mockOnSendCommand).toHaveBeenCalledWith("test command");
    expect(input).toHaveValue(""); // Input should be cleared after sending
  });

  it("does not send empty command", async () => {
    const user = userEvent.setup();
    render(<CommandInput {...defaultProps} />);
    
    const button = screen.getByRole("button", { name: /enviar/i });
    
    await user.click(button);
    
    expect(mockOnSendCommand).not.toHaveBeenCalled();
  });

  it("does not send whitespace-only command", async () => {
    const user = userEvent.setup();
    render(<CommandInput {...defaultProps} />);
    
    const input = screen.getByPlaceholderText("Digite um comando...");
    const button = screen.getByRole("button", { name: /enviar/i });
    
    await user.type(input, "   ");
    await user.click(button);
    
    expect(mockOnSendCommand).not.toHaveBeenCalled();
  });

  it("disables input and button when isDisabled is true", () => {
    render(<CommandInput {...defaultProps} isDisabled={true} />);
    
    const input = screen.getByPlaceholderText("Digite um comando...");
    const button = screen.getByRole("button", { name: /enviar/i });
    
    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it("navigates command history with arrow keys", async () => {
    const user = userEvent.setup();
    render(<CommandInput {...defaultProps} />);
    
    const input = screen.getByPlaceholderText("Digite um comando...");
    
    // Send first command
    await user.type(input, "first command");
    await user.keyboard("{Enter}");
    
    // Send second command
    await user.type(input, "second command");
    await user.keyboard("{Enter}");
    
    // Navigate history
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("second command");
    
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("first command");
    
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveValue("second command");
    
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveValue("");
  });

  it("resets history navigation when typing", async () => {
    const user = userEvent.setup();
    render(<CommandInput {...defaultProps} />);
    
    const input = screen.getByPlaceholderText("Digite um comando...");
    
    // Send a command to create history
    await user.type(input, "test command");
    await user.keyboard("{Enter}");
    
    // Navigate to history
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("test command");
    
    // Start typing - should reset history navigation
    await user.type(input, " modified");
    expect(input).toHaveValue("test command modified");
    
    // Arrow up should now navigate to history again since typing resets the index
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("test command"); // Should show the first (and only) history item
  });

  it("maintains command history without duplicates", async () => {
    const user = userEvent.setup();
    render(<CommandInput {...defaultProps} />);
    
    const input = screen.getByPlaceholderText("Digite um comando...");
    
    // Send same command twice
    await user.type(input, "duplicate command");
    await user.keyboard("{Enter}");
    
    await user.type(input, "duplicate command");
    await user.keyboard("{Enter}");
    
    // Send different command
    await user.type(input, "different command");
    await user.keyboard("{Enter}");
    
    // Navigate history - should see different command first, then duplicate command only once
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("different command");
    
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("duplicate command");
    
    // Should not have another duplicate
    await user.keyboard("{ArrowUp}");
    expect(input).toHaveValue("duplicate command"); // Should stay the same
  });

  it("shows history navigation hint when history exists", async () => {
    const user = userEvent.setup();
    render(<CommandInput {...defaultProps} />);
    
    const input = screen.getByPlaceholderText("Digite um comando...");
    
    // Initially no hint should be visible
    expect(screen.queryByText("↑↓")).not.toBeInTheDocument();
    
    // Send a command to create history
    await user.type(input, "test command");
    await user.keyboard("{Enter}");
    
    // Now hint should be visible
    expect(screen.getByText("↑↓")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<CommandInput {...defaultProps} className="custom-class" />);
    expect(container.firstChild).toHaveClass("custom-class");
  });
});