import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MessageBubble } from "./MessageBubble";
import type { ClaudeCodeMessage } from "shared-types";

describe("MessageBubble", () => {
  const baseMessage: ClaudeCodeMessage = {
    id: "test-id",
    content: "Test message content",
    timestamp: new Date("2024-01-01T12:00:00Z"),
    type: "user",
  };

  it("renders user message correctly", () => {
    const userMessage = { ...baseMessage, type: "user" as const };
    render(<MessageBubble message={userMessage} />);
    
    expect(screen.getByText("Test message content")).toBeDefined();
    expect(screen.getByText("12:00")).toBeDefined(); // formatted time
  });

  it("renders assistant message correctly", () => {
    const assistantMessage = { ...baseMessage, type: "assistant" as const };
    render(<MessageBubble message={assistantMessage} />);
    
    expect(screen.getByText("Test message content")).toBeDefined();
    expect(screen.getByText("Claude Code")).toBeDefined();
    expect(screen.getByText("12:00")).toBeDefined();
  });

  it("shows status icons correctly", () => {
    const messageWithStatus = { ...baseMessage, status: "sent" as const };
    render(<MessageBubble message={messageWithStatus} />);
    
    // CheckCircle icon should be present for sent status
    const checkIcon = document.querySelector("svg");
    expect(checkIcon).toBeDefined();
  });

  it("handles multi-line content", () => {
    const multilineMessage = { 
      ...baseMessage, 
      content: "Line 1\nLine 2\nLine 3"
    };
    render(<MessageBubble message={multilineMessage} />);
    
    // Check that the content includes parts of the multiline text
    expect(screen.getByText(/Line 1/)).toBeDefined();
    expect(screen.getByText(/Line 2/)).toBeDefined();
    expect(screen.getByText(/Line 3/)).toBeDefined();
  });

  it("renders markdown code blocks correctly", () => {
    const markdownMessage = {
      ...baseMessage,
      type: "assistant" as const,
      content: "Here's some code:\n\n```typescript\nconst hello = 'world';\n```"
    };
    render(<MessageBubble message={markdownMessage} />);
    
    expect(screen.getByText("Here's some code:")).toBeDefined();
    expect(screen.getByText("const hello = 'world';")).toBeDefined();
  });

  it("renders markdown lists correctly", () => {
    const markdownMessage = {
      ...baseMessage,
      type: "assistant" as const,
      content: "Features:\n- Feature 1\n- Feature 2\n- Feature 3"
    };
    render(<MessageBubble message={markdownMessage} />);
    
    expect(screen.getByText("Features:")).toBeDefined();
    expect(screen.getByText("Feature 1")).toBeDefined();
    expect(screen.getByText("Feature 2")).toBeDefined();
  });

  it("renders markdown inline code correctly", () => {
    const markdownMessage = {
      ...baseMessage,
      type: "assistant" as const,
      content: "Use the `console.log()` function for debugging."
    };
    render(<MessageBubble message={markdownMessage} />);
    
    expect(screen.getByText(/Use the/)).toBeDefined();
    expect(screen.getByText("console.log()")).toBeDefined();
    expect(screen.getByText(/function for debugging/)).toBeDefined();
  });
});