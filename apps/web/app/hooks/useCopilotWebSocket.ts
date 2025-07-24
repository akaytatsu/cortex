import { useEffect, useRef, useState, useCallback } from "react";
import type { ClaudeCodeMessage } from "shared-types";

interface UseCopilotWebSocketOptions {
  sessionId?: string;
  onMessage?: (message: ClaudeCodeMessage) => void;
  onError?: (error: string) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

export type ConnectionStatus = 'connecting' | 'open' | 'closed' | 'error';

interface UseCopilotWebSocketReturn {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  error: string | null;
  lastMessage: ClaudeCodeMessage | null;
  isProcessing: boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: ClaudeCodeMessage) => void;
}

export function useCopilotWebSocket(
  options: UseCopilotWebSocketOptions = {}
): UseCopilotWebSocketReturn {
  const {
    sessionId,
    onMessage,
    onError,
    onConnectionChange,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('closed');
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<ClaudeCodeMessage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [websocketPort, setWebsocketPort] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const messageQueue = useRef<ClaudeCodeMessage[]>([]);

  const isConnected = connectionStatus === 'open';

  // Function to get WebSocket port from server
  const getWebSocketPort = useCallback(async (): Promise<number> => {
    try {
      console.debug("[CopilotWebSocket] Fetching WebSocket port from server...");
      const response = await fetch("/api/terminal-port");
      if (!response.ok) {
        throw new Error(`Failed to get WebSocket port: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.message || data.error);
      }
      console.debug("[CopilotWebSocket] WebSocket port received:", data.port);
      return data.port;
    } catch (err) {
      console.error("[CopilotWebSocket] Error getting WebSocket port:", err);
      throw err;
    }
  }, []);

  // Function to update connection status
  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    onConnectionChange?.(status);
  }, [onConnectionChange]);

  // Function to handle error
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  // Function to process queued messages
  const processMessageQueue = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    while (messageQueue.current.length > 0) {
      const message = messageQueue.current.shift();
      if (message) {
        try {
          wsRef.current.send(JSON.stringify(message));
          console.debug("[CopilotWebSocket] Sent queued message:", message.type);
        } catch (err) {
          console.error("[CopilotWebSocket] Error sending queued message:", err);
          handleError("Failed to send queued message");
          break;
        }
      }
    }
  }, [handleError]);

  // Function to connect WebSocket
  const connect = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.debug("[CopilotWebSocket] Already connected, skipping");
      return;
    }

    if (!sessionId) {
      console.debug("[CopilotWebSocket] No sessionId provided, cannot connect");
      return;
    }

    try {
      console.debug("[CopilotWebSocket] Starting connection process");
      updateConnectionStatus('connecting');
      setError(null);

      // Get WebSocket port if not already retrieved
      let port = websocketPort;
      if (!port) {
        port = await getWebSocketPort();
        setWebsocketPort(port);
      }

      // TODO: Implement JWT token authentication
      // For now, we'll connect without authentication
      const wsUrl = `ws://localhost:${port}`;
      console.debug("[CopilotWebSocket] Creating WebSocket connection", { port, sessionId });

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.debug("[CopilotWebSocket] Connection opened");
        updateConnectionStatus('open');
        setError(null);
        reconnectAttempts.current = 0;

        // Process any queued messages
        processMessageQueue();
      };

      ws.onmessage = (event) => {
        try {
          const message: ClaudeCodeMessage = JSON.parse(event.data);
          console.debug("[CopilotWebSocket] Received message:", message.type);

          setLastMessage(message);

          // Handle processing indicators
          if (message.type === 'start_processing') {
            setIsProcessing(true);
          } else if (message.type === 'end_processing') {
            setIsProcessing(false);
          }

          onMessage?.(message);
        } catch (err) {
          console.error("[CopilotWebSocket] Error parsing message:", err);
          handleError("Failed to parse WebSocket message");
        }
      };

      ws.onclose = (event) => {
        console.debug("[CopilotWebSocket] Connection closed", {
          code: event.code,
          reason: event.reason,
        });

        wsRef.current = null;
        setIsProcessing(false);
        updateConnectionStatus('closed');

        // Don't attempt reconnect for normal closures
        if (event.code === 1000 || event.code === 1001) {
          return;
        }

        // Attempt to reconnect if not manually disconnected
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            10000
          );
          reconnectAttempts.current++;

          console.debug(
            `[CopilotWebSocket] Reconnecting in ${delay}ms... (${reconnectAttempts.current}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            console.debug(
              `[CopilotWebSocket] Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`
            );
            connect();
          }, delay);
        } else {
          handleError("Failed to reconnect after multiple attempts");
          updateConnectionStatus('error');
        }
      };

      ws.onerror = (event) => {
        console.error("[CopilotWebSocket] WebSocket error:", event);
        handleError("WebSocket connection failed");
        updateConnectionStatus('error');
        setIsProcessing(false);
      };

    } catch (err) {
      console.error("[CopilotWebSocket] Error connecting to WebSocket:", err);
      handleError(err instanceof Error ? err.message : "Connection failed");
      updateConnectionStatus('error');
    }
  }, [
    sessionId,
    websocketPort,
    getWebSocketPort,
    updateConnectionStatus,
    handleError,
    processMessageQueue,
    onMessage,
  ]);

  // Function to disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, "Client disconnecting");
      }
      wsRef.current = null;
    }

    updateConnectionStatus('closed');
    setError(null);
    setIsProcessing(false);
    setLastMessage(null);
    reconnectAttempts.current = maxReconnectAttempts; // Prevent auto-reconnect
  }, [updateConnectionStatus]);

  // Function to send message
  const sendMessage = useCallback((message: ClaudeCodeMessage) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.debug("[CopilotWebSocket] WebSocket not ready, queuing message");
      messageQueue.current.push(message);
      return;
    }

    try {
      wsRef.current.send(JSON.stringify(message));
      console.debug("[CopilotWebSocket] Message sent:", message.type);
    } catch (err) {
      console.error("[CopilotWebSocket] Error sending message:", err);
      handleError("Failed to send message");
    }
  }, [handleError]);

  // Auto-connect when sessionId changes
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (sessionId) {
      console.debug("[CopilotWebSocket] Session ID provided, connecting...", sessionId);
      connect();
    } else {
      console.debug("[CopilotWebSocket] No session ID, disconnecting...");
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionStatus,
    isConnected,
    error,
    lastMessage,
    isProcessing,
    connect,
    disconnect,
    sendMessage,
  };
}