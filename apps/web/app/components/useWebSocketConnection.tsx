import { useRef, useState, useEffect, useCallback } from "react";
import type { ClaudeCodeMessage } from "shared-types";

export interface ConnectionState {
  status: "disconnected" | "connecting" | "connected" | "reconnecting" | "failed";
  error?: string;
  lastConnected?: Date;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
}

export interface WebSocketConnectionHook {
  connectionState: ConnectionState;
  isConnected: boolean;
  sendMessage: (message: ClaudeCodeMessage) => boolean;
  reconnect: () => void;
  disconnect: () => void;
  updateHeartbeat: () => void;
}

interface UseWebSocketConnectionProps {
  url: string;
  sessionId: string;
  userId?: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  onMessage?: (message: ClaudeCodeMessage) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  autoConnect?: boolean;
}

export function useWebSocketConnection({
  url,
  sessionId,
  userId,
  maxReconnectAttempts = 5,
  reconnectDelay = 1000,
  heartbeatInterval = 15000,
  onMessage,
  onConnectionChange,
  autoConnect = true,
}: UseWebSocketConnectionProps): WebSocketConnectionHook {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const shouldReconnectRef = useRef(true);

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: "disconnected",
    reconnectAttempt: 0,
    maxReconnectAttempts,
  });

  const updateConnectionState = useCallback(
    (updates: Partial<ConnectionState>) => {
      setConnectionState(prev => {
        const newState = { ...prev, ...updates };
        onConnectionChange?.(newState);
        return newState;
      });
    },
    [onConnectionChange]
  );

  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const heartbeatMessage: ClaudeCodeMessage = {
        type: "heartbeat",
        sessionId,
        timestamp: Date.now(),
      };
      wsRef.current.send(JSON.stringify(heartbeatMessage));
      
      // Schedule next heartbeat
      heartbeatTimeoutRef.current = setTimeout(sendHeartbeat, heartbeatInterval);
    }
  }, [heartbeatInterval]);

  const updateHeartbeat = useCallback(() => {
    // Reset heartbeat timer when activity occurs
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    heartbeatTimeoutRef.current = setTimeout(sendHeartbeat, heartbeatInterval);
  }, [sendHeartbeat, heartbeatInterval]);

  const connect = useCallback(() => {
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    isConnectingRef.current = true;
    clearTimeouts();

    const isReconnecting = connectionState.reconnectAttempt > 0;
    updateConnectionState({
      status: isReconnecting ? "reconnecting" : "connecting",
      error: undefined,
    });

    try {
      const wsUrl = userId ? `${url}?type=claude-code&userId=${encodeURIComponent(userId)}` : `${url}?type=claude-code`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        updateConnectionState({
          status: "connected",
          error: undefined,
          lastConnected: new Date(),
          reconnectAttempt: 0,
        });

        // Start heartbeat mechanism
        updateHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const message: ClaudeCodeMessage = JSON.parse(event.data);
          
          // Handle heartbeat response
          if (message.type === "heartbeat") {
            updateHeartbeat();
            return;
          }

          onMessage?.(message);
          updateHeartbeat(); // Update heartbeat on any message activity
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        clearTimeouts();

        // Check if we should attempt reconnection
        if (
          shouldReconnectRef.current &&
          event.code !== 1000 && // Normal closure
          event.code !== 1001 && // Going away
          connectionState.reconnectAttempt < maxReconnectAttempts
        ) {
          const nextAttempt = connectionState.reconnectAttempt + 1;
          const delay = Math.min(reconnectDelay * Math.pow(2, nextAttempt - 1), 30000); // Exponential backoff, max 30s

          updateConnectionState({
            status: "reconnecting",
            reconnectAttempt: nextAttempt,
            error: `Connection lost (code: ${event.code}). Reconnecting in ${Math.round(delay / 1000)}s...`,
          });

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          // Max attempts reached or intentional disconnect
          const status = connectionState.reconnectAttempt >= maxReconnectAttempts ? "failed" : "disconnected";
          const error = status === "failed" 
            ? `Failed to reconnect after ${maxReconnectAttempts} attempts`
            : undefined;

          updateConnectionState({
            status,
            error,
          });
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        isConnectingRef.current = false;
        
        updateConnectionState({
          status: "disconnected",
          error: "Connection error occurred",
        });
      };

    } catch (error) {
      isConnectingRef.current = false;
      updateConnectionState({
        status: "disconnected",
        error: `Failed to create WebSocket connection: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }, [
    url,
    userId,
    sessionId,
    connectionState.reconnectAttempt,
    maxReconnectAttempts,
    reconnectDelay,
    onMessage,
    updateConnectionState,
    updateHeartbeat,
    clearTimeouts,
  ]);

  const sendMessage = useCallback((message: ClaudeCodeMessage): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        updateHeartbeat(); // Update heartbeat when sending messages
        return true;
      } catch (error) {
        console.error("Error sending WebSocket message:", error);
        return false;
      }
    }
    return false;
  }, [updateHeartbeat]);

  const reconnect = useCallback(() => {
    shouldReconnectRef.current = true;
    updateConnectionState({ reconnectAttempt: 0 });
    connect();
  }, [connect, updateConnectionState]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearTimeouts();
    
    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect");
      wsRef.current = null;
    }
    
    updateConnectionState({
      status: "disconnected",
      error: undefined,
      reconnectAttempt: 0,
    });
  }, [clearTimeouts, updateConnectionState]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      shouldReconnectRef.current = false;
      clearTimeouts();
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
    };
  }, [autoConnect, connect, clearTimeouts]);

  // Update connection URL when dependencies change
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Gracefully close existing connection and reconnect with new parameters
      wsRef.current.close(1000, "Parameters changed");
    }
  }, [url, userId]);

  return {
    connectionState,
    isConnected: connectionState.status === "connected",
    sendMessage,
    reconnect,
    disconnect,
    updateHeartbeat,
  };
}