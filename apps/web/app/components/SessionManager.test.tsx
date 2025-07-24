import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { SessionManager } from "./SessionManager";
import type { TerminalSession } from "shared-types";

// Mock data
const mockSessions: TerminalSession[] = [
  {
    id: "session-1",
    workspaceName: "test-workspace",
    workspacePath: "/path/to/workspace",
    userId: "user-1",
    status: "active",
    createdAt: new Date("2023-01-01T10:00:00Z"),
    pid: 1234,
  },
  {
    id: "session-2",
    workspaceName: "test-workspace",
    workspacePath: "/path/to/workspace",
    userId: "user-1",
    status: "inactive",
    createdAt: new Date("2023-01-01T11:00:00Z"),
  },
];

const defaultProps = {
  sessions: mockSessions,
  currentSessionId: "session-1",
  onSessionSelect: vi.fn(),
  onSessionClose: vi.fn(),
  onNewSession: vi.fn(),
};

describe("SessionManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders session list correctly", () => {
    render(<SessionManager {...defaultProps} />);

    expect(screen.getByText("Sessões Ativas")).toBeInTheDocument();
    expect(screen.getByText("Nova Sessão")).toBeInTheDocument();

    // Check if sessions are displayed (using partial text match due to truncation)
    const sessionElements = screen.getAllByText(/test-workspace \(session-/);
    expect(sessionElements).toHaveLength(2);

    // Check status badges
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByText("inactive")).toBeInTheDocument();
  });

  it("highlights the current session", () => {
    render(<SessionManager {...defaultProps} />);

    const sessionElements = screen.getAllByText(/test-workspace \(session-/);
    const currentSessionCard = sessionElements[0].closest(
      "div[class*='ring-2']"
    );
    expect(currentSessionCard).toHaveClass("ring-2", "ring-blue-500");
  });

  it("calls onSessionSelect when a session is clicked", () => {
    render(<SessionManager {...defaultProps} />);

    const sessionCards = screen.getAllByText(/test-workspace \(session-/);
    const sessionCard = sessionCards[1].closest("div[class*='cursor-pointer']");
    fireEvent.click(sessionCard!);

    expect(defaultProps.onSessionSelect).toHaveBeenCalledWith("session-2");
  });

  it("calls onNewSession when 'Nova Sessão' button is clicked", () => {
    render(<SessionManager {...defaultProps} />);

    const newSessionButton = screen.getByText("Nova Sessão");
    fireEvent.click(newSessionButton);

    expect(defaultProps.onNewSession).toHaveBeenCalled();
  });

  it("calls onSessionClose when 'Fechar' button is clicked", async () => {
    const mockOnSessionClose = vi.fn().mockResolvedValue(undefined);
    render(
      <SessionManager {...defaultProps} onSessionClose={mockOnSessionClose} />
    );

    const closeButtons = screen.getAllByText("Fechar");
    
    await act(async () => {
      fireEvent.click(closeButtons[0]);
    });

    expect(mockOnSessionClose).toHaveBeenCalledWith("session-1");
  });

  it("shows loading state when closing a session", async () => {
    const mockOnSessionClose = vi
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
    render(
      <SessionManager {...defaultProps} onSessionClose={mockOnSessionClose} />
    );

    const closeButtons = screen.getAllByText("Fechar");
    fireEvent.click(closeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Fechando...")).toBeInTheDocument();
    });
  });

  it("displays empty state when no sessions are available", () => {
    render(<SessionManager {...defaultProps} sessions={[]} />);

    expect(screen.getByText("Nenhuma sessão ativa")).toBeInTheDocument();
    expect(
      screen.getByText('Clique em "Nova Sessão" para começar')
    ).toBeInTheDocument();
  });

  it("prevents event propagation when close button is clicked", async () => {
    const mockOnSessionSelect = vi.fn();
    const mockOnSessionClose = vi.fn().mockResolvedValue(undefined);

    render(
      <SessionManager
        {...defaultProps}
        onSessionSelect={mockOnSessionSelect}
        onSessionClose={mockOnSessionClose}
      />
    );

    const closeButtons = screen.getAllByText("Fechar");
    
    await act(async () => {
      fireEvent.click(closeButtons[0]);
    });

    // Session select should not be called when close button is clicked
    expect(mockOnSessionSelect).not.toHaveBeenCalled();
    expect(mockOnSessionClose).toHaveBeenCalledWith("session-1");
  });

  it("displays PID information when available", () => {
    render(<SessionManager {...defaultProps} />);

    expect(screen.getByText("PID: 1234")).toBeInTheDocument();
  });

  it("formats session creation date correctly", () => {
    render(<SessionManager {...defaultProps} />);

    // Check if creation dates are displayed (exact format may vary based on locale)
    const creationDates = screen.getAllByText(/Criada em/);
    expect(creationDates).toHaveLength(2);
  });
});
