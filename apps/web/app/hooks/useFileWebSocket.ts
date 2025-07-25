import { useEffect, useRef, useState, useCallback } from "react";
import type {
  WSFileMessage,
  FileContentMessage,
  SaveRequestMessage,
  SaveConfirmationMessage,
  ErrorMessage,
  ConnectionStatusMessage,
  TextChangeMessage,
  TextChangeAckMessage,
  ExternalChangeMessage,
  TextDelta,
} from "shared-types";
import { useThrottleCallback } from "./useDebounce";

interface UseFileWebSocketOptions {
  workspaceName: string;
  onFileContent?: (message: FileContentMessage) => void;
  onSaveConfirmation?: (message: SaveConfirmationMessage) => void;
  onError?: (message: ErrorMessage) => void;
  onConnectionChange?: (
    status: "connected" | "disconnected" | "reconnecting"
  ) => void;
  onTextChangeAck?: (message: TextChangeAckMessage) => void;
  onExternalChange?: (message: ExternalChangeMessage) => void;
}

interface UseFileWebSocketReturn {
  isConnected: boolean;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  error: string | null;
  requestFileContent: (filePath: string) => Promise<void>;
  saveFile: (
    filePath: string,
    content: string,
    lastKnownModified?: Date
  ) => Promise<void>;
  sendTextChanges: (
    filePath: string,
    changes: TextDelta[],
    version: number
  ) => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
}

export function useFileWebSocket(
  options: UseFileWebSocketOptions
): UseFileWebSocketReturn {
  const {
    workspaceName,
    onFileContent,
    onSaveConfirmation,
    onError,
    onConnectionChange,
    onTextChangeAck,
    onExternalChange,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "reconnecting"
  >("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [websocketPort, setWebsocketPort] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const pendingRequests = useRef(
    new Map<string, (response: WSFileMessage) => void>()
  );
  const lastRequestTime = useRef<{ [key: string]: number }>({});
  const messageQueue = useRef<WSFileMessage[]>([]);
  const isProcessingQueue = useRef(false);

  // Function to generate unique message ID
  const generateMessageId = useCallback(() => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Function to get WebSocket port from server
  const getWebSocketPort = useCallback(async (): Promise<number> => {
    try {
      console.debug("Fetching WebSocket port from server...");
      const response = await fetch("/api/file-websocket-port");
      if (!response.ok) {
        throw new Error(`Failed to get WebSocket port: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.message || data.error);
      }
      console.debug("WebSocket port received:", data.port);
      return data.port;
    } catch (err) {
      console.error("Error getting WebSocket port:", err);
      throw err;
    }
  }, []);

  // Function to process message queue
  const processMessageQueue = useCallback(async () => {
    if (isProcessingQueue.current || messageQueue.current.length === 0) {
      return;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.debug("WebSocket not ready, keeping messages in queue", {
        queueLength: messageQueue.current.length,
        websocketState: wsRef.current?.readyState,
      });
      return;
    }

    isProcessingQueue.current = true;
    console.debug("Processing message queue", {
      queueLength: messageQueue.current.length,
    });

    try {
      while (
        messageQueue.current.length > 0 &&
        wsRef.current?.readyState === WebSocket.OPEN
      ) {
        const message = messageQueue.current.shift();
        if (message) {
          console.debug("Sending queued message", {
            type: message.type,
            messageId: message.messageId,
          });
          wsRef.current.send(JSON.stringify(message));

          // Small delay to prevent overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    } catch (error) {
      console.error("Error processing message queue:", error);
    } finally {
      isProcessingQueue.current = false;
    }
  }, []);

  // Function to send message and handle response
  const sendMessage = useCallback(
    (message: WSFileMessage): Promise<WSFileMessage> => {
      return new Promise((resolve, reject) => {
        const messageId = message.messageId || generateMessageId();
        message.messageId = messageId;

        // Store the promise resolver
        pendingRequests.current.set(messageId, resolve);

        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.warn("WebSocket not available - adding message to queue", {
            websocketExists: !!wsRef.current,
            readyState: wsRef.current?.readyState,
            isConnected,
            messageType: message.type,
          });

          // Add to queue for later processing
          messageQueue.current.push(message);

          // Try to process queue (in case connection comes back)
          setTimeout(() => processMessageQueue(), 100);

          // For now, we'll still reject if not connected
          // In a more sophisticated implementation, you might want to keep the promise pending
          reject(new Error("WebSocket is not connected - message queued"));
          return;
        }

        try {
          // Send the message immediately if connected
          wsRef.current.send(JSON.stringify(message));
          console.debug("Message sent immediately", {
            type: message.type,
            messageId,
          });
        } catch (error) {
          console.error("Error sending message, adding to queue", {
            error,
            messageType: message.type,
          });
          messageQueue.current.push(message);
          reject(error);
          return;
        }

        // Set timeout for request
        setTimeout(() => {
          if (pendingRequests.current.has(messageId)) {
            pendingRequests.current.delete(messageId);
            console.warn("WebSocket request timeout", {
              messageId,
              messageType: message.type,
            });
            reject(
              new Error(`Request timeout for ${message.type} (${messageId})`)
            );
          }
        }, 15000); // 15 second timeout
      });
    },
    [generateMessageId, processMessageQueue]
  );

  // Function to connect WebSocket
  const connect = useCallback(async () => {
    // Simple check - don't connect if already connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("useFileWebSocket: Already connected, skipping");
      return;
    }

    try {
      console.log("useFileWebSocket: Starting connection process");
      setConnectionStatus("reconnecting");
      setError(null);

      // Get WebSocket port if not already retrieved
      let port = websocketPort;
      if (!port) {
        port = await getWebSocketPort();
        setWebsocketPort(port);
      }

      console.debug("Creating WebSocket connection", { port, workspaceName });

      // Add a small delay to ensure server is fully ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const ws = new WebSocket(`ws://localhost:${port}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("File WebSocket connected to port", port);

        // Send initial workspace registration first
        console.debug("Sending workspace registration", { workspaceName });
        ws.send(
          JSON.stringify({
            type: "connection_status",
            payload: {
              workspaceName,
            },
          } as WSFileMessage)
        );

        // Then set connection status
        setIsConnected(true);
        setConnectionStatus("connected");
        setError(null);
        reconnectAttempts.current = 0;

        console.log("useFileWebSocket: Connection established", {
          workspaceName,
          port,
        });
        onConnectionChange?.("connected");

        // Process any queued messages
        setTimeout(() => processMessageQueue(), 100);
      };

      ws.onmessage = event => {
        try {
          console.log("useFileWebSocket: Received message", event.data);
          const message: WSFileMessage = JSON.parse(event.data);
          console.log("useFileWebSocket: Parsed message", {
            type: message.type,
            messageId: message.messageId,
          });

          // Handle request/response correlation
          if (
            message.messageId &&
            pendingRequests.current.has(message.messageId)
          ) {
            console.log(
              "useFileWebSocket: Handling correlated response",
              message.messageId
            );
            const resolver = pendingRequests.current.get(message.messageId);
            if (resolver) {
              resolver(message);
              pendingRequests.current.delete(message.messageId);
            }
            // Don't return here - still process the message normally
          }

          // Handle different message types
          switch (message.type) {
            case "file_content":
              console.log("useFileWebSocket: Handling file_content message");
              onFileContent?.(message as FileContentMessage);
              break;
            case "save_confirmation":
              console.log(
                "useFileWebSocket: Handling save_confirmation message"
              );
              onSaveConfirmation?.(message as SaveConfirmationMessage);
              break;
            case "error":
              console.log("useFileWebSocket: Handling error message");
              onError?.(message as ErrorMessage);
              break;
            case "connection_status": {
              console.log(
                "useFileWebSocket: Handling connection_status message"
              );
              const statusMsg = message as ConnectionStatusMessage;
              setConnectionStatus(statusMsg.payload.status);
              onConnectionChange?.(statusMsg.payload.status);
              break;
            }
            case "text_change_ack":
              console.log("useFileWebSocket: Handling text_change_ack message");
              onTextChangeAck?.(message as TextChangeAckMessage);
              break;
            case "external_change":
              console.log("useFileWebSocket: Handling external_change message");
              onExternalChange?.(message as ExternalChangeMessage);
              break;
            default:
              console.log(
                "useFileWebSocket: Unknown message type:",
                message.type
              );
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onclose = event => {
        console.log("File WebSocket disconnected", {
          code: event.code,
          reason: event.reason,
        });
        setIsConnected(false);
        setConnectionStatus("disconnected");
        wsRef.current = null;
        onConnectionChange?.("disconnected");

        // Don't attempt reconnect for certain close codes (client initiated, etc.)
        if (event.code === 1000 || event.code === 1001) {
          return; // Normal closure or going away
        }

        // Attempt to reconnect if not manually disconnected
        if (reconnectAttempts.current < maxReconnectAttempts) {
          setConnectionStatus("reconnecting");
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000
          );
          reconnectAttempts.current++;

          console.log(
            `WebSocket disconnected. Reconnecting in ${delay}ms... (${reconnectAttempts.current}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(
              `Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`
            );
            connect();
          }, delay);
        } else {
          setError(
            "Failed to reconnect after maximum attempts. Falling back to HTTP mode."
          );
          setConnectionStatus("disconnected");
          console.warn(
            "WebSocket connection failed persistently, using HTTP fallback"
          );
        }
      };

      ws.onerror = event => {
        console.error("File WebSocket error:", event);
        setError("WebSocket connection error");
      };
    } catch (err) {
      console.error("Error connecting to WebSocket:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
      setConnectionStatus("disconnected");
    }
  }, [
    websocketPort,
    workspaceName,
    getWebSocketPort,
    onFileContent,
    onSaveConfirmation,
    onError,
    onConnectionChange,
  ]);

  // Function to disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, "Component unmounting"); // Normal closure
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus("disconnected");
    reconnectAttempts.current = maxReconnectAttempts; // Prevent auto-reconnect
  }, []);

  // Function to manually reconnect
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0; // Reset attempts for manual reconnect
    connect();
  }, [disconnect, connect]);

  // Throttled function to request file content (prevent too many rapid requests)
  const throttledRequestFileContent = useThrottleCallback(
    async (filePath: string) => {
      try {
        console.log("useFileWebSocket: throttledRequestFileContent called", {
          filePath,
          isConnected,
          connectionStatus,
          wsReadyState: wsRef.current?.readyState,
        });

        if (!isConnected || connectionStatus !== "connected") {
          throw new Error(
            `WebSocket is not ready (connected: ${isConnected}, status: ${connectionStatus})`
          );
        }

        // Additional check for WebSocket state
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          throw new Error(
            `WebSocket state is not OPEN (readyState: ${wsRef.current?.readyState})`
          );
        }

        // Check if we've requested this file too recently
        const requestKey = `file_content_${filePath}`;
        const now = Date.now();
        const lastRequest = lastRequestTime.current[requestKey];

        if (lastRequest && now - lastRequest < 500) {
          // 500ms throttle
          console.log("File content request throttled", { filePath });
          return;
        }

        lastRequestTime.current[requestKey] = now;

        console.log("useFileWebSocket: Sending file content request", {
          filePath,
          workspaceName,
        });

        const message: WSFileMessage = {
          type: "file_content",
          payload: { path: filePath, workspaceName },
        };

        await sendMessage(message);
        console.log("useFileWebSocket: File content request sent successfully");
      } catch (err) {
        console.error("Error requesting file content:", {
          filePath,
          error: err,
        });
        throw err;
      }
    },
    100
  ); // 100ms throttle

  // Function to request file content
  const requestFileContent = useCallback(
    async (filePath: string) => {
      return throttledRequestFileContent(filePath);
    },
    [throttledRequestFileContent]
  );

  // Throttled function to save file (prevent rapid save requests)
  const throttledSaveFile = useThrottleCallback(
    async (filePath: string, content: string, lastKnownModified?: Date) => {
      try {
        if (!isConnected || connectionStatus !== "connected") {
          throw new Error(
            `WebSocket is not ready (connected: ${isConnected}, status: ${connectionStatus})`
          );
        }

        // Additional check for WebSocket state
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          throw new Error(
            `WebSocket state is not OPEN (readyState: ${wsRef.current?.readyState})`
          );
        }

        // Check if we've saved this file too recently
        const requestKey = `save_${filePath}`;
        const now = Date.now();
        const lastRequest = lastRequestTime.current[requestKey];

        if (lastRequest && now - lastRequest < 1000) {
          // 1 second throttle for saves
          console.debug("File save request throttled", { filePath });
          return;
        }

        lastRequestTime.current[requestKey] = now;

        console.debug("Saving file via WebSocket", {
          filePath,
          workspaceName,
          contentLength: content.length,
          lastKnownModified,
        });

        const message: SaveRequestMessage = {
          type: "save_request",
          payload: {
            path: filePath,
            content,
            lastKnownModified,
            workspaceName,
          },
          messageId: generateMessageId(),
        };

        await sendMessage(message);
      } catch (err) {
        console.error("Error saving file:", { filePath, error: err });
        throw err;
      }
    },
    500
  ); // 500ms throttle

  // Function to save file
  const saveFile = useCallback(
    async (filePath: string, content: string, lastKnownModified?: Date) => {
      return throttledSaveFile(filePath, content, lastKnownModified);
    },
    [throttledSaveFile]
  );

  // Throttled function to send text changes (prevent rapid text change requests)
  const throttledSendTextChanges = useThrottleCallback(
    async (filePath: string, changes: TextDelta[], version: number) => {
      try {
        if (!isConnected || connectionStatus !== "connected") {
          throw new Error(
            `WebSocket is not ready (connected: ${isConnected}, status: ${connectionStatus})`
          );
        }

        // Additional check for WebSocket state
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          throw new Error(
            `WebSocket state is not OPEN (readyState: ${wsRef.current?.readyState})`
          );
        }

        // Check if we've sent changes for this file too recently
        const requestKey = `text_change_${filePath}`;
        const now = Date.now();
        const lastRequest = lastRequestTime.current[requestKey];

        if (lastRequest && now - lastRequest < 100) {
          // 100ms throttle for text changes
          console.debug("Text change request throttled", { filePath });
          return;
        }

        lastRequestTime.current[requestKey] = now;

        console.debug("Sending text changes via WebSocket", {
          filePath,
          workspaceName,
          changesCount: changes.length,
          version,
        });

        const message: TextChangeMessage = {
          type: "text_change",
          payload: {
            path: filePath,
            changes,
            version,
            timestamp: new Date(),
          },
          messageId: generateMessageId(),
        };

        await sendMessage(message);
      } catch (err) {
        console.error("Error sending text changes:", { filePath, error: err });
        throw err;
      }
    },
    100
  ); // 100ms throttle

  // Function to send text changes
  const sendTextChanges = useCallback(
    async (filePath: string, changes: TextDelta[], version: number) => {
      return throttledSendTextChanges(filePath, changes, version);
    },
    [throttledSendTextChanges]
  );

  // Auto-connect on mount
  useEffect(() => {
    // Simple initialization check
    if (typeof window === "undefined" || wsRef.current) {
      return;
    }

    console.log(
      "useFileWebSocket: Initializing connection for workspace:",
      workspaceName
    );

    // Add small delay to ensure everything is initialized
    const timer = setTimeout(() => {
      connect();
    }, 200);

    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, []); // Empty dependency array - only run once on mount

  return {
    isConnected,
    connectionStatus,
    error,
    requestFileContent,
    saveFile,
    sendTextChanges,
    disconnect,
    reconnect,
  };
}
