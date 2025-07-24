import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useCopilotWebSocket } from "./useCopilotWebSocket";
import type { ClaudeCodeMessage } from "shared-types";

// Mock fetch for getting WebSocket port
global.fetch = vi.fn();

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
    const closeEvent = new CloseEvent('close', { code, reason });
    this.onclose?.(closeEvent);
  }

  simulateError() {
    this.onerror?.(new Event("error"));
  }

  simulateMessage(data: string) {
    const messageEvent = new MessageEvent('message', { data });
    this.onmessage?.(messageEvent);
  }
}

// @ts-expect-error - Mocking global WebSocket for testing
global.WebSocket = MockWebSocket;

describe("useCopilotWebSocket Hook", () => {
  const mockFetch = vi.mocked(fetch);
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful port fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ port: 8000 }),
    } as Response);

    // Capture the WebSocket instance
    const OriginalWebSocket = global.WebSocket;
    global.WebSocket = vi.fn().mockImplementation((url: string) => {
      mockWebSocket = new MockWebSocket(url);
      return mockWebSocket;
    }) as any;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("initializes with correct default values", () => {
    const { result } = renderHook(() => useCopilotWebSocket());

    expect(result.current.connectionStatus).toBe('closed');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.lastMessage).toBe(null);
    expect(result.current.isProcessing).toBe(false);
  });

  it("does not connect without sessionId", () => {
    renderHook(() => useCopilotWebSocket());

    expect(global.WebSocket).not.toHaveBeenCalled();
  });

  it("connects when sessionId is provided", async () => {
    const { result } = renderHook(() => useCopilotWebSocket({ sessionId: "test-session" }));

    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledWith("ws://localhost:8000");
      expect(result.current.connectionStatus).toBe('connecting');
    });
  });

  it("updates connection status when WebSocket opens", async () => {
    const { result } = renderHook(() => useCopilotWebSocket({ sessionId: "test-session" }));

    await waitFor(() => {
      expect(mockWebSocket).toBeDefined();
    });

    act(() => {
      mockWebSocket.simulateOpen();
    });

    expect(result.current.connectionStatus).toBe('open');
    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it("handles WebSocket messages correctly", async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() => 
      useCopilotWebSocket({ sessionId: "test-session", onMessage })
    );

    await waitFor(() => {
      expect(mockWebSocket).toBeDefined();
    });

    act(() => {
      mockWebSocket.simulateOpen();
    });

    const testMessage: ClaudeCodeMessage = {
      type: 'output',
      data: 'Hello world',
      sessionId: 'test-session',
    };

    act(() => {
      mockWebSocket.simulateMessage(JSON.stringify(testMessage));
    });

    expect(onMessage).toHaveBeenCalledWith(testMessage);
    expect(result.current.lastMessage).toEqual(testMessage);
  });

  it("handles start_processing and end_processing messages", async () => {
    const { result } = renderHook(() => useCopilotWebSocket({ sessionId: "test-session" }));

    await waitFor(() => {
      expect(mockWebSocket).toBeDefined();
    });

    act(() => {
      mockWebSocket.simulateOpen();
    });

    // Test start_processing
    act(() => {
      mockWebSocket.simulateMessage(JSON.stringify({
        type: 'start_processing',
        sessionId: 'test-session',
      }));
    });

    expect(result.current.isProcessing).toBe(true);

    // Test end_processing
    act(() => {
      mockWebSocket.simulateMessage(JSON.stringify({
        type: 'end_processing',
        sessionId: 'test-session',
      }));
    });

    expect(result.current.isProcessing).toBe(false);
  });

  it("handles WebSocket close events", async () => {
    const { result } = renderHook(() => useCopilotWebSocket({ sessionId: "test-session" }));

    await waitFor(() => {
      expect(mockWebSocket).toBeDefined();
    });

    act(() => {
      mockWebSocket.simulateOpen();
    });

    expect(result.current.connectionStatus).toBe('open');

    act(() => {
      mockWebSocket.simulateClose(1000, "Normal closure");
    });

    expect(result.current.connectionStatus).toBe('closed');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isProcessing).toBe(false);
  });

  it("handles WebSocket error events", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => 
      useCopilotWebSocket({ sessionId: "test-session", onError })
    );

    await waitFor(() => {
      expect(mockWebSocket).toBeDefined();
    });

    act(() => {
      mockWebSocket.simulateError();
    });

    expect(result.current.connectionStatus).toBe('error');
    expect(result.current.error).toBe('WebSocket connection failed');
    expect(result.current.isProcessing).toBe(false);
    expect(onError).toHaveBeenCalledWith('WebSocket connection failed');
  });

  it("attempts to reconnect on unexpected close", async () => {
    const { result } = renderHook(() => useCopilotWebSocket({ sessionId: "test-session" }));

    await waitFor(() => {
      expect(mockWebSocket).toBeDefined();
    });

    act(() => {
      mockWebSocket.simulateOpen();
    });

    // Simulate unexpected close (not normal closure)
    act(() => {
      mockWebSocket.simulateClose(1006, "Connection lost");
    });

    expect(result.current.connectionStatus).toBe('closed');

    // Check that reconnection is attempted (timer should be set)
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });

  it("does not reconnect on normal close", async () => {
    const { result } = renderHook(() => useCopilotWebSocket({ sessionId: "test-session" }));

    await waitFor(() => {
      expect(mockWebSocket).toBeDefined();
    });

    act(() => {
      mockWebSocket.simulateOpen();
    });

    // Simulate normal close
    act(() => {
      mockWebSocket.simulateClose(1000, "Normal closure");
    });

    expect(result.current.connectionStatus).toBe('closed');
    expect(vi.getTimerCount()).toBe(0);
  });

  it("sends messages when connected", async () => {
    const { result } = renderHook(() => useCopilotWebSocket({ sessionId: "test-session" }));

    await waitFor(() => {
      expect(mockWebSocket).toBeDefined();
    });

    act(() => {
      mockWebSocket.simulateOpen();
    });

    const testMessage: ClaudeCodeMessage = {
      type: 'input',
      data: 'test command',
      sessionId: 'test-session',
    };

    act(() => {
      result.current.sendMessage(testMessage);
    });

    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(testMessage));
  });

  it("queues messages when not connected", async () => {
    const { result } = renderHook(() => useCopilotWebSocket({ sessionId: "test-session" }));

    const testMessage: ClaudeCodeMessage = {
      type: 'input',
      data: 'test command',
      sessionId: 'test-session',
    };

    // Send message before connection is open
    act(() => {
      result.current.sendMessage(testMessage);
    });

    // Message should be queued, not sent immediately
    expect(mockWebSocket?.send).not.toHaveBeenCalled();

    // Now simulate connection opening
    await waitFor(() => {
      expect(mockWebSocket).toBeDefined();
    });

    act(() => {
      mockWebSocket.simulateOpen();
    });

    // Queued message should be sent
    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(testMessage));
  });

  it("disconnects properly", async () => {
    const { result } = renderHook(() => useCopilotWebSocket({ sessionId: "test-session" }));

    await waitFor(() => {
      expect(mockWebSocket).toBeDefined();
    });

    act(() => {
      mockWebSocket.simulateOpen();
    });

    act(() => {
      result.current.disconnect();
    });

    expect(mockWebSocket.close).toHaveBeenCalledWith(1000, "Client disconnecting");
    expect(result.current.connectionStatus).toBe('closed');
    expect(result.current.error).toBe(null);
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.lastMessage).toBe(null);
  });

  it("handles invalid JSON messages gracefully", async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn();
    
    const { result } = renderHook(() => 
      useCopilotWebSocket({ sessionId: "test-session", onError })
    );

    await waitFor(() => {
      expect(mockWebSocket).toBeDefined();
    });

    act(() => {
      mockWebSocket.simulateOpen();
    });

    act(() => {
      mockWebSocket.simulateMessage("invalid json");
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "[CopilotWebSocket] Error parsing message:",
      expect.any(Error)
    );
    expect(onError).toHaveBeenCalledWith("Failed to parse WebSocket message");

    consoleSpy.mockRestore();
  });

  it("calls onConnectionChange callback", async () => {
    const onConnectionChange = vi.fn();
    
    renderHook(() => 
      useCopilotWebSocket({ sessionId: "test-session", onConnectionChange })
    );

    await waitFor(() => {
      expect(onConnectionChange).toHaveBeenCalledWith('connecting');
    });

    await waitFor(() => {
      expect(mockWebSocket).toBeDefined();
    });

    act(() => {
      mockWebSocket.simulateOpen();
    });

    expect(onConnectionChange).toHaveBeenCalledWith('open');
  });

  it("handles port fetch failure", async () => {
    mockFetch.mockRejectedValue(new Error("Failed to fetch port"));
    
    const onError = vi.fn();
    renderHook(() => useCopilotWebSocket({ sessionId: "test-session", onError }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Failed to fetch port");
    });
  });

  it("disconnects when sessionId changes to undefined", async () => {
    const { result, rerender } = renderHook(
      ({ sessionId }) => useCopilotWebSocket({ sessionId }),
      { initialProps: { sessionId: "test-session" } }
    );

    await waitFor(() => {
      expect(mockWebSocket).toBeDefined();
    });

    act(() => {
      mockWebSocket.simulateOpen();
    });

    expect(result.current.connectionStatus).toBe('open');

    // Change sessionId to undefined
    rerender({ sessionId: undefined });

    expect(result.current.connectionStatus).toBe('closed');
  });
});