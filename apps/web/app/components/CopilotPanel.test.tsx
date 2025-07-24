import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CopilotPanel } from "./CopilotPanel";
import type { ClaudeCodeMessage } from "shared-types";

// Mock react-markdown
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown-content">{children}</div>,
}));

// Mock the useCopilotWebSocket hook
const mockHookReturn = {
  connectionStatus: 'closed' as const,
  isConnected: false,
  error: null,
  lastMessage: null,
  isProcessing: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  sendMessage: vi.fn(),
};

vi.mock("../hooks/useCopilotWebSocket", () => ({
  useCopilotWebSocket: vi.fn(() => mockHookReturn),
}));

import { useCopilotWebSocket } from "../hooks/useCopilotWebSocket";

describe("CopilotPanel Component", () => {
  const mockUseCopilotWebSocket = vi.mocked(useCopilotWebSocket);

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock return values
    Object.assign(mockHookReturn, {
      connectionStatus: 'closed' as const,
      isConnected: false,
      error: null,
      lastMessage: null,
      isProcessing: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("renders without sessionId", () => {
    render(<CopilotPanel />);

    expect(screen.getByText("Copilot Panel")).toBeInTheDocument();
    expect(screen.getByText("Aguardando mensagens do copiloto...")).toBeInTheDocument();
    expect(screen.getByText("Selecione uma sessão ativa para começar")).toBeInTheDocument();
  });

  it("renders with sessionId", () => {
    render(<CopilotPanel sessionId="test-session-123" />);

    expect(screen.getByText("Copilot Panel")).toBeInTheDocument();
    expect(mockUseCopilotWebSocket).toHaveBeenCalledWith({
      sessionId: "test-session-123",
      onMessage: expect.any(Function),
      onError: expect.any(Function),
    });
  });

  it("shows connected status when connected", () => {
    mockHookReturn.connectionStatus = 'open';
    mockHookReturn.isConnected = true;

    render(<CopilotPanel sessionId="test-session" />);

    expect(screen.getByText("Conectado")).toBeInTheDocument();
    const statusIndicator = screen.getByText("Conectado").previousElementSibling;
    expect(statusIndicator).toHaveClass("bg-green-400");
  });

  it("shows connecting status when connecting", () => {
    mockHookReturn.connectionStatus = 'connecting';

    render(<CopilotPanel sessionId="test-session" />);

    expect(screen.getByText("Conectando...")).toBeInTheDocument();
    const statusIndicator = screen.getByText("Conectando...").previousElementSibling;
    expect(statusIndicator).toHaveClass("bg-yellow-400", "animate-pulse");
  });

  it("shows error status when there's an error", () => {
    mockHookReturn.connectionStatus = 'error';
    mockHookReturn.error = "Connection failed";

    render(<CopilotPanel sessionId="test-session" />);

    expect(screen.getByText("Erro")).toBeInTheDocument();
    expect(screen.getByText("Erro de Conexão:")).toBeInTheDocument();
    expect(screen.getByText("Connection failed")).toBeInTheDocument();
    
    const statusIndicator = screen.getByText("Erro").previousElementSibling;
    expect(statusIndicator).toHaveClass("bg-red-400");
  });

  it("shows processing indicator when processing", () => {
    mockHookReturn.isProcessing = true;

    render(<CopilotPanel sessionId="test-session" />);

    expect(screen.getByText("Processing...")).toBeInTheDocument();
    const processingIndicator = screen.getByText("Processing...").previousElementSibling;
    expect(processingIndicator).toHaveClass("animate-pulse");
  });

  it("displays session ID in status bar", () => {
    mockHookReturn.connectionStatus = 'open';
    
    render(<CopilotPanel sessionId="test-session-123456789" />);

    expect(screen.getByText("• test-ses...")).toBeInTheDocument();
  });

  it("displays message count in status bar", () => {
    render(<CopilotPanel />);

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("mensagens")).toBeInTheDocument();
  });

  it("handles message callback from hook", async () => {
    let onMessageCallback: ((message: ClaudeCodeMessage) => void) | undefined;

    mockUseCopilotWebSocket.mockImplementation((options) => {
      onMessageCallback = options.onMessage;
      return mockHookReturn;
    });

    render(<CopilotPanel sessionId="test-session" />);

    // Simulate receiving a message
    const testMessage: ClaudeCodeMessage = {
      type: 'output',
      data: 'Hello from copilot!',
      sessionId: 'test-session',
    };

    if (onMessageCallback) {
      act(() => {
        onMessageCallback(testMessage);
      });
    }

    await waitFor(() => {
      expect(screen.getByText("output")).toBeInTheDocument();
      expect(screen.getByTestId("markdown-content")).toHaveTextContent("Hello from copilot!");
    });

    // Check message count updated
    expect(screen.getByText("1")).toBeInTheDocument();
    // Note: "mensagem" text is hidden on small screens with sm:inline class
  });

  it("renders different message type badges with correct colors", async () => {
    let onMessageCallback: ((message: ClaudeCodeMessage) => void) | undefined;

    mockUseCopilotWebSocket.mockImplementation((options) => {
      onMessageCallback = options.onMessage;
      return mockHookReturn;
    });

    render(<CopilotPanel sessionId="test-session" />);

    if (onMessageCallback) {
      act(() => {
        // Test output message (blue)
        onMessageCallback({
          type: 'output',
          data: 'Output message',
          sessionId: 'test-session',
        });

        // Test error message (red)
        onMessageCallback({
          type: 'error',
          data: 'Error message',
          sessionId: 'test-session',
        });

        // Test stdout message (green)
        onMessageCallback({
          type: 'stdout',
          data: 'Stdout message',
          sessionId: 'test-session',
        });
      });
    }

    await waitFor(() => {
      // Check if different message types are rendered
      expect(screen.getByText("output")).toBeInTheDocument();
      expect(screen.getByText("error")).toBeInTheDocument();
      expect(screen.getByText("stdout")).toBeInTheDocument();
    });
  });

  it("renders message without data", async () => {
    let onMessageCallback: ((message: ClaudeCodeMessage) => void) | undefined;

    mockUseCopilotWebSocket.mockImplementation((options) => {
      onMessageCallback = options.onMessage;
      return mockHookReturn;
    });

    render(<CopilotPanel sessionId="test-session" />);

    if (onMessageCallback) {
      act(() => {
        onMessageCallback({
          type: 'session_started',
          sessionId: 'test-session',
          status: 'success',
        });
      });
    }

    await waitFor(() => {
      expect(screen.getByText("session_started")).toBeInTheDocument();
      expect(screen.getByText("session_started - success")).toBeInTheDocument();
    });
  });

  it("handles error callback from hook", () => {
    let onErrorCallback: ((error: string) => void) | undefined;
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockUseCopilotWebSocket.mockImplementation((options) => {
      onErrorCallback = options.onError;
      return mockHookReturn;
    });

    render(<CopilotPanel sessionId="test-session" />);

    if (onErrorCallback) {
      onErrorCallback("Test error");
    }

    expect(consoleSpy).toHaveBeenCalledWith("[CopilotPanel] WebSocket error:", "Test error");
    
    consoleSpy.mockRestore();
  });

  it("applies custom className", () => {
    const { container } = render(<CopilotPanel className="custom-class" />);
    
    const cardElement = container.querySelector('.custom-class');
    expect(cardElement).toBeInTheDocument();
  });

  it("shows appropriate message when connected but no messages", () => {
    mockHookReturn.connectionStatus = 'open';
    mockHookReturn.isConnected = true;

    render(<CopilotPanel sessionId="test-session" />);

    expect(screen.getByText("Conectado, aguardando atividade...")).toBeInTheDocument();
  });
});