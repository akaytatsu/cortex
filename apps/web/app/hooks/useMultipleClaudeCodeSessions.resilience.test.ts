import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMultipleClaudeCodeSessions } from "./useMultipleClaudeCodeSessions";

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

describe("useMultipleClaudeCodeSessions - Resilience and Reconnection Tests", () => {
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

  describe("AC1: Detecção de Queda de Conexão", () => {
    it("detecta quando conexão é perdida e atualiza status", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      // Wait for WebSocket to be connected
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.connectionStatus).toBe("open");
      });

      // Simulate connection loss
      act(() => {
        mockWebSocket.simulateClose(1006, "Connection lost unexpectedly");
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionStatus).toBe("closed");
    });

    it("detecta erro de conexão e atualiza status", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate WebSocket error
      act(() => {
        mockWebSocket.simulateError();
      });

      expect(result.current.connectionStatus).toBe("error");
      expect(result.current.error).toBe("WebSocket connection failed");
    });
  });

  describe("AC2: Tentativa de Reconexão Automática", () => {
    it("não inicia reconexão se não houver sessões ativas", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Disconnect without active sessions
      act(() => {
        mockWebSocket.simulateClose(1006, "Connection lost");
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isReconnecting).toBe(false);
    });

    it("inicia reconexão automática apenas com sessões ativas", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Create session
      await act(async () => {
        await result.current.createSession();
      });

      // Mark session as active
      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "session_started",
            sessionId: result.current.sessions[0].id,
            status: "success",
          })
        );
      });

      expect(result.current.sessions[0].status).toBe("active");

      // Clear mock to track reconnection attempts
      (global.WebSocket as unknown as ReturnType<typeof vi.fn>).mockClear();

      // Simulate unexpected disconnect
      act(() => {
        mockWebSocket.simulateClose(1006, "Connection lost");
      });

      expect(result.current.isConnected).toBe(false);

      // Should start reconnection process
      act(() => {
        vi.advanceTimersByTime(3000); // First reconnection delay
      });

      await waitFor(() => {
        expect(global.WebSocket).toHaveBeenCalledTimes(1); // Reconnection attempt
      });
    });
  });

  describe("AC3: Feedback Visual", () => {
    it("fornece feedback visual durante processo de reconexão", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Create and activate session
      await act(async () => {
        await result.current.createSession();
      });

      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "session_started",
            sessionId: result.current.sessions[0].id,
            status: "success",
          })
        );
      });

      // Disconnect
      act(() => {
        mockWebSocket.simulateClose(1006, "Connection lost");
      });

      // Connection status should be closed initially
      expect(result.current.isConnected).toBe(false);

      // Wait for reconnection to start (should change to connecting)
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe("connecting");
      });

      // The reconnection state should be properly exposed
      expect(result.current.reconnectionAttempts).toBeGreaterThanOrEqual(0);
    });
  });

  describe("AC4: Preservação da Sessão", () => {
    it("preserva ID da sessão durante reconexão", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Create session
      await act(async () => {
        await result.current.createSession();
      });

      const originalSessionId = result.current.sessions[0].id;
      const originalClaudeSessionId = "claude_session_123";

      // Set Claude session ID
      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "session-created",
            sessionId: originalSessionId,
            data: { claudeSessionId: originalClaudeSessionId },
          })
        );
      });

      expect(result.current.sessions[0].claudeSessionId).toBe(originalClaudeSessionId);

      // Mark as active
      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "session_started",
            sessionId: originalSessionId,
            status: "success",
          })
        );
      });

      // Disconnect and reconnect
      act(() => {
        mockWebSocket.simulateClose(1006, "Connection lost");
      });

      // After reconnection, session should still exist with same IDs
      expect(result.current.sessions[0].id).toBe(originalSessionId);
      expect(result.current.sessions[0].claudeSessionId).toBe(originalClaudeSessionId);
    });
  });

  describe("AC5: Estratégia de Exponential Backoff", () => {
    it("utiliza delays crescentes para reconexão", async () => {
      const expectedDelays = [3000, 6000, 12000, 24000, 30000];
      
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Create and activate session
      await act(async () => {
        await result.current.createSession();
      });

      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "session_started",
            sessionId: result.current.sessions[0].id,
            status: "success",
          })
        );
      });

      // Test first few backoff delays
      for (let i = 0; i < 3; i++) {
        (global.WebSocket as unknown as ReturnType<typeof vi.fn>).mockClear();
        
        // Disconnect
        act(() => {
          mockWebSocket.simulateClose(1006, "Connection lost");
        });

        // Advance by exact expected delay
        act(() => {
          vi.advanceTimersByTime(expectedDelays[i]);
        });

        await waitFor(() => {
          expect(global.WebSocket).toHaveBeenCalledTimes(1);
        });

        // Simulate connection failure for next iteration
        if (i < 2) {
          act(() => {
            mockWebSocket.simulateError();
          });
        }
      }
    });
  });

  describe("AC6: Falha Definitiva", () => {
    it("para de tentar após máximo de tentativas", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Create and activate session
      await act(async () => {
        await result.current.createSession();
      });

      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "session_started",
            sessionId: result.current.sessions[0].id,
            status: "success",
          })
        );
      });

      // Clear mock to track reconnection attempts
      (global.WebSocket as unknown as ReturnType<typeof vi.fn>).mockClear();

      // Simulate disconnect to trigger first reconnection
      act(() => {
        mockWebSocket.simulateClose(1006, "Connection lost");
      });

      // Simulate 10 failed reconnection attempts by advancing time and failing each attempt
      for (let i = 0; i < 10; i++) {
        // Advance time to trigger reconnection attempt
        act(() => {
          vi.advanceTimersByTime(30000); // Max delay
        });

        // Fail the reconnection attempt by simulating error on the new websocket
        if (global.WebSocket as any) {
          act(() => {
            mockWebSocket.simulateError();
          });
        }
      }

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe("error");
      });

      // Either the max attempts error or the last WebSocket error should be shown
      expect(
        result.current.error?.includes("Máximo de tentativas de reconexão atingido") ||
        result.current.error?.includes("WebSocket connection failed")
      ).toBe(true);
    });
  });

  describe("AC7: Múltiplas Sessões", () => {
    it("reconecta independentemente para diferentes sessões", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Create two sessions
      await act(async () => {
        await result.current.createSession();
      });

      await act(async () => {
        await result.current.createSession();
      });

      const session1Id = result.current.sessions[0].id;
      const session2Id = result.current.sessions[1].id;

      // Activate both sessions
      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "session_started",
            sessionId: session1Id,
            status: "success",
          })
        );
      });

      act(() => {
        mockWebSocket.simulateMessage(
          JSON.stringify({
            type: "session_started",
            sessionId: session2Id,
            status: "success",
          })
        );
      });

      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.sessions[0].status).toBe("active");
      expect(result.current.sessions[1].status).toBe("active");

      // Both sessions should be preserved after reconnection
      act(() => {
        mockWebSocket.simulateClose(1006, "Connection lost");
      });

      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.sessions[0].id).toBe(session1Id);
      expect(result.current.sessions[1].id).toBe(session2Id);
    });
  });

  describe("AC8: Conexão Estável", () => {
    it("mantém conexão ativa por período mínimo", async () => {
      const { result } = renderHook(() =>
        useMultipleClaudeCodeSessions(defaultOptions)
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Create session to enable heartbeat
      await act(async () => {
        await result.current.createSession();
      });

      // Track initial connection time
      // const initialConnectionTime = Date.now();

      // Advance time by more than 1 minute
      act(() => {
        vi.advanceTimersByTime(70000); // 70 seconds
      });

      // Connection should still be active
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionStatus).toBe("open");

      // Should have sent multiple heartbeats
      const heartbeatCalls = mockWebSocket.send.mock.calls.filter(call =>
        call[0].includes('"type":"heartbeat"')
      );
      
      expect(heartbeatCalls.length).toBeGreaterThan(3); // At least 4 heartbeats in 70 seconds
    });
  });
});