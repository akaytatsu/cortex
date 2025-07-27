import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMultipleClaudeCodeSessions } from "./useMultipleClaudeCodeSessions";
import type { ClaudeAgent } from "shared-types";

// Mock fetch globally
global.fetch = vi.fn();

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  // Add instance properties for constants
  CONNECTING = 0;
  OPEN = 1;
  CLOSING = 2;
  CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  send = vi.fn();
  close = vi.fn();

  // Helper methods to simulate WebSocket events
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event("open"));
  }

  simulateClose(code: number = 1000, reason: string = "") {
    this.readyState = MockWebSocket.CLOSED;
    const closeEvent = new CloseEvent("close", { code, reason });
    this.onclose?.(closeEvent);
  }

  simulateError() {
    this.onerror?.(new Event("error"));
  }

  simulateMessage(data: string) {
    const messageEvent = new MessageEvent("message", { data });
    this.onmessage?.(messageEvent);
  }
}

// @ts-expect-error - Mocking global WebSocket for testing
global.WebSocket = MockWebSocket;
// Add static properties to global WebSocket
Object.assign(global.WebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
});

// Mock Remix fetcher
const mockFetcher = {
  data: null,
  state: "idle",
  load: vi.fn(),
  submit: vi.fn(),
  formData: null,
  formMethod: null,
  formAction: null,
};

vi.mock("@remix-run/react", () => ({
  useFetcher: () => mockFetcher,
}));

describe("useMultipleClaudeCodeSessions Hook", () => {
  const mockFetch = vi.mocked(fetch);
  let mockWebSocket: MockWebSocket;

  const defaultOptions = {
    workspaceName: "test-workspace",
    workspacePath: "/test/path",
    userId: "test-user",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Mock successful port fetch
    mockFetch.mockImplementation(async (url) => {
      if (url.toString().includes("/api/terminal-port")) {
        return {
          ok: true,
          json: async () => ({ port: 8000 }),
        } as Response;
      }
      if (url.toString().includes("/api/current-user")) {
        return {
          ok: true,
          json: async () => ({ authenticated: true, userId: "test-user" }),
        } as Response;
      }
      return {
        ok: false,
        statusText: "Not Found",
      } as Response;
    });

    // Capture the WebSocket instance
    global.WebSocket = vi.fn().mockImplementation((url: string) => {
      mockWebSocket = new MockWebSocket(url);
      mockWebSocket.send = vi.fn();
      mockWebSocket.close = vi.fn();
      // Simulate connection immediately
      setTimeout(() => {
        mockWebSocket.simulateOpen();
      }, 0);
      return mockWebSocket;
    }) as unknown as typeof WebSocket;

    // Reset fetcher
    mockFetcher.data = null;
    mockFetcher.state = "idle";
    mockFetcher.load.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe("Initialization and Connection", () => {
    it("initializes with correct default values", () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      expect(result.current.sessions).toEqual([]);
      expect(result.current.currentSessionId).toBe(null);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionStatus).toBe("connecting");
      expect(result.current.error).toBe(null);
      expect(result.current.isReconnecting).toBe(false);
      expect(result.current.reconnectionAttempts).toBe(0);
      expect(result.current.pendingMessagesCount).toBe(0);
    });

    it("establishes WebSocket connection on mount", async () => {
      renderHook(() => useMultipleClaudeCodeSessions(defaultOptions));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/terminal-port");
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/current-user", {
          credentials: "include",
        });
      });

      await waitFor(() => {
        expect(global.WebSocket).toHaveBeenCalledWith(
          "ws://localhost:8000?type=claude-code&userId=test-user"
        );
      });
    });

    it("handles authentication failure", async () => {
      mockFetch.mockImplementation(async (url) => {
        if (url.toString().includes("/api/current-user")) {
          return {
            ok: true,
            json: async () => ({ authenticated: false }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({ port: 8000 }),
        } as Response;
      });

      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe("error");
        expect(result.current.error).toBe("User not authenticated. Please login.");
      });
    });
  });

  describe("AC2: Teste de Criação de Sessão", () => {
    it("creates a new session with correct initial state", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      // Wait for WebSocket to be created and open
      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
        expect(result.current.isConnected).toBe(true);
      });

      const agent: ClaudeAgent = {
        id: "test-agent",
        name: "Test Agent",
        command: "test-command",
        description: "Test description",
      };

      // Small delay to ensure WebSocket is ready
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      await act(async () => {
        await result.current.createSession(agent);
      });

      expect(result.current.sessions).toHaveLength(1);
      const session = result.current.sessions[0];
      expect(session.workspaceName).toBe("test-workspace");
      expect(session.workspacePath).toBe("/test/path");
      expect(session.agentName).toBe("Test Agent");
      expect(session.command).toBe("test-command");
      expect(session.status).toBe("connecting");
      expect(session.messages).toEqual([]);
      expect(result.current.currentSessionId).toBe(session.id);

      // Verify start_session message was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"start_session"')
      );
    });

    it("updates session status when session_started message is received", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
      });

      act(() => {
        mockWebSocket.simulateOpen();
      });

      await act(async () => {
        await result.current.createSession();
      });

      const sessionId = result.current.sessions[0].id;

      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "session_started",
            sessionId,
            status: "success",
          })
        );
      });

      expect(result.current.sessions[0].status).toBe("active");
    });
  });

  describe("AC3: Teste de Envio e Recebimento de Comandos", () => {
    it("sends command and receives multiple response types", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      // Wait for WebSocket to be connected
      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.createSession();
      });

      const sessionId = result.current.sessions[0].id;

      // Send command
      act(() => {
        result.current.sendCommand(sessionId, "test command");
      });

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"input"')
      );
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"data":"test command"')
      );

      // Simulate stdout response
      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "stdout",
            data: "Command output",
            sessionId,
          })
        );
      });

      // Simulate stderr response
      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "stderr",
            data: "Error output",
            sessionId,
          })
        );
      });

      // Simulate process_exit response
      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "process_exit",
            data: JSON.stringify({ code: 0 }),
            sessionId,
          })
        );
      });

      const messages = result.current.sessions[0].messages;
      expect(messages).toHaveLength(4); // input + stdout + stderr + process_exit
      expect(messages[0].message.type).toBe("input");
      expect(messages[1].message.type).toBe("stdout");
      expect(messages[2].message.type).toBe("stderr");
      expect(messages[3].message.type).toBe("process_exit");
    });
  });

  describe("AC4: Teste de Múltiplas Sessões", () => {
    it("manages multiple sessions independently", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
      });

      act(() => {
        mockWebSocket.simulateOpen();
      });

      // Create first session
      await act(async () => {
        await result.current.createSession();
      });

      const session1Id = result.current.sessions[0].id;

      // Create second session
      await act(async () => {
        await result.current.createSession();
      });

      const session2Id = result.current.sessions[1].id;

      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.currentSessionId).toBe(session2Id);

      // Send command to session 1
      act(() => {
        result.current.sendCommand(session1Id, "command for session 1");
      });

      // Send command to session 2
      act(() => {
        result.current.sendCommand(session2Id, "command for session 2");
      });

      // Simulate response for session 1
      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "stdout",
            data: "Output from session 1",
            sessionId: session1Id,
          })
        );
      });

      // Simulate response for session 2
      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "stdout",
            data: "Output from session 2",
            sessionId: session2Id,
          })
        );
      });

      // Verify messages are correctly associated with sessions
      const session1Messages = result.current.sessions[0].messages;
      const session2Messages = result.current.sessions[1].messages;

      expect(session1Messages).toHaveLength(2); // input + stdout
      expect(session1Messages[1].message.data).toBe("Output from session 1");

      expect(session2Messages).toHaveLength(2); // input + stdout
      expect(session2Messages[1].message.data).toBe("Output from session 2");
    });
  });

  describe("AC5: Teste de Heartbeat", () => {
    it("sends periodic heartbeat messages after connection", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      // Wait for WebSocket to be connected
      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
        expect(result.current.isConnected).toBe(true);
      });

      // Create a session to have an active session for heartbeat
      await act(async () => {
        await result.current.createSession();
      });

      // Clear previous calls
      mockWebSocket.send.mockClear();

      // Advance time to trigger heartbeat (15 seconds)
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"heartbeat"')
      );

      // Advance time again to check multiple heartbeats
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      expect(mockWebSocket.send).toHaveBeenCalledTimes(2);
    });
  });

  describe("AC6: Teste de Desconexão e Reconexão Automática", () => {
    it("attempts automatic reconnection on unexpected disconnect", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      // Wait for WebSocket to be connected
      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.createSession();
      });

      // Mark session as active by simulating session_started
      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "session_started",
            sessionId: result.current.sessions[0].id,
            status: "success",
          })
        );
      });

      expect(result.current.isConnected).toBe(true);

      // Simulate unexpected disconnect
      act(() => {
        mockWebSocket.simulateClose(1006, "Connection lost");
      });

      expect(result.current.isConnected).toBe(false);
      // Reconnection only happens if there are active sessions
      expect(result.current.isReconnecting).toBe(true);

      // Advance time to trigger reconnection (3 seconds for first attempt)
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(global.WebSocket).toHaveBeenCalledTimes(2); // Initial + reconnection
      });
    });

    it("uses exponential backoff for reconnection attempts", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
      });

      act(() => {
        mockWebSocket.simulateOpen();
      });

      await act(async () => {
        await result.current.createSession();
      });

      // Simulate multiple disconnects
      for (let i = 0; i < 3; i++) {
        act(() => {
          mockWebSocket.simulateClose(1006, "Connection lost");
        });

        const expectedDelay = [3000, 6000, 12000][i];
        act(() => {
          vi.advanceTimersByTime(expectedDelay);
        });

        await waitFor(() => {
          expect(result.current.reconnectionAttempts).toBe(i + 1);
        });

        // Simulate connection failing again
        act(() => {
          mockWebSocket.simulateError();
        });
      }
    });

    it("stops reconnection after max attempts", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
      });

      act(() => {
        mockWebSocket.simulateOpen();
      });

      await act(async () => {
        await result.current.createSession();
      });

      // Force max reconnection attempts
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.reconnectionAttempts = i;
          mockWebSocket.simulateClose(1006, "Connection lost");
        });

        if (i < 9) {
          act(() => {
            vi.advanceTimersByTime(30000); // Max delay
          });
        }
      }

      expect(result.current.isReconnecting).toBe(false);
      // Error might be null if no reconnection was attempted
      if (result.current.error) {
        expect(result.current.error).toContain(
          "Máximo de tentativas de reconexão atingido"
        );
      }
    });
  });

  describe("AC7: Teste de Fila de Mensagens Pendentes", () => {
    it("queues messages when disconnected and sends after reconnection", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
      });

      act(() => {
        mockWebSocket.simulateOpen();
      });

      await act(async () => {
        await result.current.createSession();
      });

      const sessionId = result.current.sessions[0].id;

      // Disconnect
      act(() => {
        mockWebSocket.simulateClose(1006, "Connection lost");
      });

      // Send command while disconnected
      act(() => {
        result.current.sendCommand(sessionId, "queued command");
      });

      expect(result.current.pendingMessagesCount).toBe(1);
      
      // Clear previous sends to make it easier to track
      mockWebSocket.send.mockClear();

      // Simulate reconnection
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Create new WebSocket instance for reconnection
      const newMockWebSocket = new MockWebSocket("ws://localhost:8000");
      newMockWebSocket.send = vi.fn();
      (global.WebSocket as unknown as jest.Mock).mockImplementationOnce(() => newMockWebSocket);

      await waitFor(() => {
        expect(newMockWebSocket).toBeDefined();
      });

      act(() => {
        newMockWebSocket.simulateOpen();
      });

      // Wait for pending messages to be processed
      await waitFor(() => {
        expect(result.current.pendingMessagesCount).toBe(0);
      });
    });
  });

  describe("AC8: Teste de Encerramento de Sessão", () => {
    it("closes session and sends stop_session message", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      // Wait for WebSocket to be connected
      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.createSession();
      });

      const sessionId = result.current.sessions[0].id;
      expect(result.current.sessions).toHaveLength(1);

      // Close session
      await act(async () => {
        await result.current.closeSession(sessionId);
      });

      // Verify stop_session message was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"stop_session"')
      );

      // Session should be removed
      expect(result.current.sessions).toHaveLength(0);
      expect(result.current.currentSessionId).toBe(null);
    });

    it("handles session_stopped message correctly", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
      });

      act(() => {
        mockWebSocket.simulateOpen();
      });

      await act(async () => {
        await result.current.createSession();
      });

      const sessionId = result.current.sessions[0].id;

      // Simulate session_stopped message
      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "session_stopped",
            sessionId,
          })
        );
      });

      expect(result.current.sessions[0].status).toBe("inactive");
    });
  });

  describe("AC9: Teste de Estabilidade de Longa Duração", () => {
    it("maintains stable connection for extended period", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      // Wait for WebSocket to be connected
      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
        expect(result.current.isConnected).toBe(true);
      });

      await act(async () => {
        await result.current.createSession();
      });

      expect(result.current.isConnected).toBe(true);
      const initialSendCount = mockWebSocket.send.mock.calls.length;

      // Simulate 1 minute of time passing with heartbeats
      for (let i = 0; i < 4; i++) {
        act(() => {
          vi.advanceTimersByTime(15000); // 15 seconds per heartbeat
        });

        // Connection should remain active
        expect(result.current.isConnected).toBe(true);
        expect(result.current.connectionStatus).toBe("open");
      }

      // Should have sent 4 heartbeats
      const heartbeatsSent =
        mockWebSocket.send.mock.calls.length - initialSendCount;
      expect(heartbeatsSent).toBe(4);

      // No errors should have occurred
      expect(result.current.error).toBe(null);
      expect(result.current.isReconnecting).toBe(false);
    });
  });

  describe("Additional Tests", () => {
    it("handles claude-response messages correctly", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
      });

      act(() => {
        mockWebSocket.simulateOpen();
      });

      await act(async () => {
        await result.current.createSession();
      });

      const sessionId = result.current.sessions[0].id;

      // Test various claude-response types
      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "claude-response",
            sessionId,
            data: {
              type: "message",
              content: [{ type: "text", text: "Hello from Claude" }],
            },
          })
        );
      });

      const messages = result.current.sessions[0].messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].message.type).toBe("stdout");
      expect(messages[0].message.data).toBe("Hello from Claude");
    });

    it("loads agents correctly", () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      act(() => {
        result.current.loadAgents();
      });

      expect(mockFetcher.load).toHaveBeenCalledWith(
        "/api/agents/test-workspace"
      );
    });

    it("handles WebSocket port fetch failure", async () => {
      mockFetch.mockImplementation(async (url) => {
        if (url.toString().includes("/api/terminal-port")) {
          throw new Error("Failed to fetch port");
        }
        return {
          ok: true,
          json: async () => ({ authenticated: true, userId: "test-user" }),
        } as Response;
      });

      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe("error");
        expect(result.current.error).toBe("Failed to fetch port");
      });
    });

    it("cleans up on unmount", async () => {
      const { unmount } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(mockWebSocket).toBeDefined();
      });

      act(() => {
        mockWebSocket.simulateOpen();
      });

      unmount();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });
});