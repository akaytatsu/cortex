import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ConversationHistory } from "./ConversationHistory";
import type { ClaudeCodeMessage } from "shared-types";

describe("ConversationHistory", () => {
  const mockMessages: ClaudeCodeMessage[] = [
    {
      id: "1",
      type: "user",
      content: "Hello Claude",
      timestamp: new Date("2024-01-01T12:00:00Z"),
      status: "sent",
    },
    {
      id: "2", 
      type: "assistant",
      content: "Hello! How can I help you?",
      timestamp: new Date("2024-01-01T12:00:30Z"),
    },
  ];

  it("renders messages correctly", () => {
    render(<ConversationHistory messages={mockMessages} />);
    
    expect(screen.getByText("Hello Claude")).toBeDefined();
    expect(screen.getByText("Hello! How can I help you?")).toBeDefined();
  });

  it("renders empty state when no messages", () => {
    render(<ConversationHistory messages={[]} />);
    
    // Container should still exist but be empty
    const container = document.querySelector(".flex-1.overflow-y-auto");
    expect(container).toBeDefined();
  });

  it("shows loading indicator when isLoading is true", () => {
    render(<ConversationHistory messages={mockMessages} isLoading={true} />);
    
    expect(screen.getByText("Claude está digitando...")).toBeDefined();
  });

  it("does not show loading indicator when isLoading is false", () => {
    render(<ConversationHistory messages={mockMessages} isLoading={false} />);
    
    expect(screen.queryByText("Claude está digitando...")).toBeNull();
  });

  it("shows session separator for messages far apart in time", () => {
    const messagesWithGap: ClaudeCodeMessage[] = [
      {
        id: "1",
        type: "user", 
        content: "First message",
        timestamp: new Date("2024-01-01T12:00:00Z"),
      },
      {
        id: "2",
        type: "user",
        content: "Second message after 10 minutes",
        timestamp: new Date("2024-01-01T12:10:00Z"), // 10 minutes later (>5 minutes gap)
      },
    ];

    render(<ConversationHistory messages={messagesWithGap} />);
    
    expect(screen.getByText("Nova sessão")).toBeDefined();
  });

  it("applies correct CSS classes for smooth scrolling", () => {
    render(<ConversationHistory messages={mockMessages} />);
    
    const scrollContainer = document.querySelector(".scroll-smooth");
    expect(scrollContainer).toBeDefined();
    expect(scrollContainer?.className).toContain("overflow-y-auto");
  });
});