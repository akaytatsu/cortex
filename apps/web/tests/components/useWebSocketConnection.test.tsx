import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useWebSocketConnection } from "../../app/components/useWebSocketConnection";
import type { ClaudeCodeMessage } from "shared-types";

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event("open"));
    }, 10);
  }

  send(_data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }
    // Mock sending data - in real tests you might want to track this
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      const closeEvent = new CloseEvent("close", { code: code || 1000, reason });
      this.onclose?.(closeEvent);
    }, 10);
  }

  // Helper methods for testing
  simulateError() {
    this.onerror?.(new Event("error"));
  }

  simulateMessage(data: ClaudeCodeMessage) {
    const messageEvent = new MessageEvent("message", {
      data: JSON.stringify(data),
    });
    this.onmessage?.(messageEvent);
  }

  simulateUnexpectedClose(code: number = 1006) {
    this.readyState = MockWebSocket.CLOSED;
    const closeEvent = new CloseEvent("close", { code, reason: "Unexpected close" });
    this.onclose?.(closeEvent);
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

describe("useWebSocketConnection", () => {
  const defaultProps = {
    url: "ws://localhost:8000",
    sessionId: "test-session",
    userId: "test-user",
    maxReconnectAttempts: 3,
    reconnectDelay: 100, // Faster for testing
    heartbeatInterval: 1000, // Faster for testing
    autoConnect: true,
  };

  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("should initialize with disconnected state", () => {
    const { result } = renderHook(() => useWebSocketConnection({
      ...defaultProps,
      autoConnect: false,
    }));

    expect(result.current.connectionState.status).toBe("disconnected");
    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState.reconnectAttempt).toBe(0);
  });

  it("should auto-connect when autoConnect is true", async () => {
    const { result } = renderHook(() => useWebSocketConnection(defaultProps));

    // Initially connecting
    expect(result.current.connectionState.status).toBe("connecting");

    // Wait for connection to establish
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.connectionState.status).toBe("connected");
      expect(result.current.isConnected).toBe(true);
    });
  });

  it("should send messages when connected", async () => {
    const { result } = renderHook(() => useWebSocketConnection(defaultProps));

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const message: ClaudeCodeMessage = {
      type: "input",
      sessionId: "test-session",
      data: "test message",
    };

    const sent = result.current.sendMessage(message);
    expect(sent).toBe(true);
  });

  it("should not send messages when disconnected", () => {
    const { result } = renderHook(() => useWebSocketConnection({
      ...defaultProps,
      autoConnect: false,
    }));

    const message: ClaudeCodeMessage = {
      type: "input",
      sessionId: "test-session",
      data: "test message",
    };

    const sent = result.current.sendMessage(message);
    expect(sent).toBe(false);
  });

  it("should implement exponential backoff on reconnection", async () => {
    const onConnectionChange = vi.fn();
    const { result } = renderHook(() => useWebSocketConnection({
      ...defaultProps,
      onConnectionChange,
    }));

    // Wait for initial connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate unexpected disconnect
    const mockWs = (global.WebSocket as unknown as { mock?: { instances?: MockWebSocket[] } }).mock?.instances?.[0];
    if (mockWs) {
      act(() => {
        mockWs.simulateUnexpectedClose(1006);
      });
    }

    // Should start reconnecting
    await waitFor(() => {
      expect(result.current.connectionState.status).toBe("reconnecting");
      expect(result.current.connectionState.reconnectAttempt).toBe(1);
    });

    // First reconnect attempt (100ms delay)
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Simulate another failure
    const mockWs2 = (global.WebSocket as any).mock?.instances?.[1];
    if (mockWs2) {
      act(() => {
        mockWs2.simulateUnexpectedClose(1006);
      });
    }

    // Should have increased delay (200ms for second attempt)
    await waitFor(() => {
      expect(result.current.connectionState.reconnectAttempt).toBe(2);
    });

    // Verify exponential backoff
    expect(onConnectionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "reconnecting",
        reconnectAttempt: 2,
      })
    );
  });

  it("should fail after max reconnect attempts", async () => {
    const { result } = renderHook(() => useWebSocketConnection({
      ...defaultProps,
      maxReconnectAttempts: 2,
    }));

    // Wait for initial connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate multiple failed reconnections
    for (let i = 0; i < 3; i++) {
      const mockWs = (global.WebSocket as any).mock?.instances?.[i];
      if (mockWs) {
        act(() => {
          mockWs.simulateUnexpectedClose(1006);
        });
      }

      if (i < 2) {
        // Wait for reconnection attempt
        await act(async () => {
          vi.advanceTimersByTime(100 * Math.pow(2, i));
        });
      }
    }

    // Should eventually fail
    await waitFor(() => {
      expect(result.current.connectionState.status).toBe("failed");
      expect(result.current.connectionState.reconnectAttempt).toBe(2);
    });
  });

  it("should handle heartbeat mechanism", async () => {
    const { result } = renderHook(() => useWebSocketConnection({
      ...defaultProps,
      heartbeatInterval: 500,
    }));

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Test updateHeartbeat method
    act(() => {
      result.current.updateHeartbeat();
    });

    // Advance time to trigger heartbeat
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // WebSocket should still be connected (heartbeat working)
    expect(result.current.isConnected).toBe(true);
  });

  it("should handle manual reconnect", async () => {
    const { result } = renderHook(() => useWebSocketConnection({
      ...defaultProps,
      autoConnect: false,
    }));

    expect(result.current.connectionState.status).toBe("disconnected");

    // Manual reconnect
    act(() => {
      result.current.reconnect();
    });

    expect(result.current.connectionState.status).toBe("connecting");

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it("should handle manual disconnect", async () => {
    const { result } = renderHook(() => useWebSocketConnection(defaultProps));

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Manual disconnect
    act(() => {
      result.current.disconnect();
    });

    expect(result.current.connectionState.status).toBe("disconnected");
    expect(result.current.isConnected).toBe(false);
  });

  it("should call onMessage callback when receiving messages", async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() => useWebSocketConnection({
      ...defaultProps,
      onMessage,
    }));

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const testMessage: ClaudeCodeMessage = {
      type: "output",
      sessionId: "test-session",
      data: "test output",
    };

    // Simulate receiving a message
    const mockWs = (global.WebSocket as any).mock?.instances?.[0];
    if (mockWs) {
      act(() => {
        mockWs.simulateMessage(testMessage);
      });
    }

    expect(onMessage).toHaveBeenCalledWith(testMessage);
  });

  it("should preserve session ID in URL", () => {
    renderHook(() => useWebSocketConnection({
      ...defaultProps,
      sessionId: "custom-session-123",
      userId: "user-456",
    }));

    // Check that WebSocket was created with correct URL
    const mockWs = (global.WebSocket as unknown as { mock?: { instances?: { url?: string }[] } }).mock?.instances?.[0];
    expect(mockWs?.url).toBe(
      "ws://localhost:8000?type=claude-code&userId=user-456"
    );
  });
});
