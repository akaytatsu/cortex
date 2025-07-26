import { useState, useCallback, useEffect, useRef } from "react";
import type {
  ClaudeCodeMessage,
  ClaudeAgent,
  AgentListResponse,
} from "shared-types";
import { useFetcher } from "@remix-run/react";

interface SessionData {
  id: string;
  workspaceName: string;
  workspacePath: string;
  agentName?: string;
  command?: string;
  status: "connecting" | "active" | "inactive" | "error";
  messages: MessageEntry[];
  lastActivity: Date;
  claudeSessionId?: string;
}

interface MessageEntry {
  id: string;
  timestamp: Date;
  message: ClaudeCodeMessage;
}

interface UseMultipleClaudeCodeSessionsOptions {
  workspaceName: string;
  workspacePath: string;
  userId: string;
}

interface UseMultipleClaudeCodeSessionsReturn {
  sessions: SessionData[];
  currentSessionId: string | null;
  isConnected: boolean;
  connectionStatus: "connecting" | "open" | "closed" | "error";
  error: string | null;
  
  // Reconnection state
  isReconnecting: boolean;
  reconnectionAttempts: number;
  pendingMessagesCount: number;

  // Session management
  selectSession: (sessionId: string) => void;
  createSession: (agent?: ClaudeAgent) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;

  // Command sending
  sendCommand: (sessionId: string, command: string) => void;

  // Agents
  loadAgents: () => void;
  agents: ClaudeAgent[];
  agentsLoading: boolean;
  agentsError: string | null;
}

export function useMultipleClaudeCodeSessions({
  workspaceName,
  workspacePath,
}: UseMultipleClaudeCodeSessionsOptions): UseMultipleClaudeCodeSessionsReturn {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [websocketPort, setWebsocketPort] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "open" | "closed" | "error"
  >("closed");
  const [error, setError] = useState<string | null>(null);
  
  // Reconnection state management
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<ClaudeCodeMessage[]>([]);
  
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reconnection configuration
  const MAX_RECONNECTION_ATTEMPTS = 10;
  const RECONNECTION_DELAYS = [3000, 6000, 12000, 24000, 30000]; // Backoff exponencial
  const HEARTBEAT_INTERVAL = 15000; // 15 segundos

  const wsRef = useRef<WebSocket | null>(null);
  const agentsFetcher = useFetcher<
    AgentListResponse | { error: { message: string } }
  >();

  const isConnected = connectionStatus === "open";
  const agents =
    agentsFetcher.data && "agents" in agentsFetcher.data
      ? agentsFetcher.data.agents
      : [];
  const agentsLoading = agentsFetcher.state === "loading";
  const agentsError =
    agentsFetcher.data && "error" in agentsFetcher.data
      ? agentsFetcher.data.error.message
      : null;

  // Function to get reconnection delay with exponential backoff
  const getReconnectionDelay = useCallback((attemptNumber: number): number => {
    const delayIndex = Math.min(attemptNumber, RECONNECTION_DELAYS.length - 1);
    return RECONNECTION_DELAYS[delayIndex];
  }, []);

  // Clear reconnection timeout
  const clearReconnectionTimeout = useCallback(() => {
    if (reconnectionTimeoutRef.current) {
      clearTimeout(reconnectionTimeoutRef.current);
      reconnectionTimeoutRef.current = null;
    }
  }, []);

  // Clear heartbeat interval
  const clearHeartbeatInterval = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Start heartbeat to keep connection alive
  const startHeartbeat = useCallback(() => {
    clearHeartbeatInterval(); // Clear any existing heartbeat
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Use the current session ID or a generic one
        const activeSession = sessions.find(s => s.status === "active" || s.status === "connecting");
        const heartbeatMessage: ClaudeCodeMessage = {
          type: "heartbeat",
          sessionId: activeSession?.id || "heartbeat", // Use active session ID or "heartbeat"
          timestamp: Date.now(),
        };
        
        console.debug("[MultipleClaudeCodeSessions] Sending heartbeat", { sessionId: heartbeatMessage.sessionId });
        try {
          wsRef.current.send(JSON.stringify(heartbeatMessage));
        } catch (error) {
          console.error("[MultipleClaudeCodeSessions] Failed to send heartbeat:", error);
          clearHeartbeatInterval();
        }
      } else {
        console.debug("[MultipleClaudeCodeSessions] WebSocket not ready for heartbeat, clearing interval");
        clearHeartbeatInterval();
      }
    }, HEARTBEAT_INTERVAL);
  }, [clearHeartbeatInterval, HEARTBEAT_INTERVAL, sessions]);

  // Function to get WebSocket port
  const getWebSocketPort = useCallback(async (): Promise<number> => {
    try {
      const response = await fetch("/api/terminal-port");
      if (!response.ok) {
        throw new Error(`Failed to get WebSocket port: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.message || data.error);
      }
      return data.port;
    } catch (err) {
      console.error(
        "[MultipleClaudeCodeSessions] Error getting WebSocket port:",
        err
      );
      throw err;
    }
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: ClaudeCodeMessage) => {
    console.debug("[MultipleClaudeCodeSessions] handleMessage received:", { type: message.type, sessionId: message.sessionId, hasData: !!message.data });
    
    // Special handling for claude_response type
    if (message.type === "claude_response" && message.data) {
      // Parse the JSON string
      const response = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
      console.debug("[MultipleClaudeCodeSessions] Parsed claude_response:", { responseType: response.type, hasContent: !!response.content });
      
      // Convert to standard message format
      let convertedMessage: ClaudeCodeMessage;
      
      switch (response.type) {
        case 'system':
          if (response.subtype === 'init' && response.session_id) {
            // Store Claude session ID for resume
            setSessions(prev => prev.map(s => 
              s.id === message.sessionId 
                ? { ...s, claudeSessionId: response.session_id }
                : s
            ));
          }
          // Skip system messages - they are internal only
          return; // Don't process system messages as visible output
          
        case 'message':
        case 'assistant':
        case 'result':
          let text = '';
          if (response.message?.content) {
            text = response.message.content
              .filter((item: any) => item.type === 'text')
              .map((item: any) => item.text || '')
              .join('');
          } else if (Array.isArray(response.content)) {
            text = response.content
              .filter((item: any) => item.type === 'text')
              .map((item: any) => item.text || '')
              .join('');
          } else if (typeof response.content === 'string') {
            text = response.content;
          } else if (response.result) {
            text = response.result;
          }
          
          convertedMessage = {
            type: "stdout",
            data: text,
            sessionId: message.sessionId
          };
          break;
          
        case 'tool_use':
          convertedMessage = {
            type: "stdout",
            data: `\n🛠️ Using tool: ${response.name}\n`,
            sessionId: message.sessionId
          };
          break;
          
        case 'tool_result':
          convertedMessage = {
            type: "stdout",
            data: `✅ Tool result received\n`,
            sessionId: message.sessionId
          };
          break;
          
        case 'error':
          convertedMessage = {
            type: "error",
            data: response.content || JSON.stringify(response),
            sessionId: message.sessionId
          };
          break;
          
        default:
          convertedMessage = message;
      }
      
      // Process the converted message
      message = convertedMessage;
      console.debug("[MultipleClaudeCodeSessions] Converted message:", { type: message.type, data: message.data?.substring(0, 100) });
    }
    
    setSessions(prevSessions => {
      return prevSessions.map(session => {
        if (session.id === message.sessionId) {
          const messageEntry: MessageEntry = {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            timestamp: new Date(),
            message,
          };

          let newStatus = session.status;
          if (message.type === "session_started") {
            newStatus = message.status === "success" ? "active" : "error";
          } else if (message.type === "session_stopped" || message.type === "process_exit") {
            newStatus = "inactive";
            // If this is the current session and it ended normally, don't trigger unnecessary reconnections
            if (session.id === currentSessionId && message.type === "process_exit") {
              console.log("[MultipleClaudeCodeSessions] Current session process exited normally");
            }
          } else if (message.type === "error") {
            newStatus = "error";
          }

          return {
            ...session,
            status: newStatus,
            messages: [...session.messages, messageEntry],
            lastActivity: new Date(),
          };
        }
        return session;
      });
    });
  }, []);

  // Function to connect to WebSocket
  const connectWebSocket = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus("connecting");
      setError(null);

      let port = websocketPort;
      if (!port) {
        port = await getWebSocketPort();
        setWebsocketPort(port);
      }


      // Get user authentication via API (since cookie is httpOnly)
      console.log("=== AUTH DEBUG START ===");
      
      let userId: string | null = null;
      try {
        const authResponse = await fetch("/api/current-user", {
          credentials: "include", // Include httpOnly cookies
        });
        
        if (authResponse.ok) {
          const authData = await authResponse.json();
          userId = authData.authenticated ? authData.userId : null;
          console.log("Authentication result:", authData);
        } else {
          console.warn("Authentication failed:", authResponse.status);
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
      }
      
      if (!userId) {
        console.warn("[MultipleClaudeCodeSessions] User not authenticated");
        setConnectionStatus("error");
        setError("User not authenticated. Please login.");
        return;
      }
      
      console.log("=== AUTH DEBUG END ===");
      
      // Connect WebSocket with user authentication confirmed
      const wsUrl = `ws://localhost:${port}?type=claude-code&userId=${encodeURIComponent(userId)}`;
      console.debug("[MultipleClaudeCodeSessions] Connecting to:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.debug("[MultipleClaudeCodeSessions] WebSocket connected");
        setConnectionStatus("open");
        setError(null);
        setIsReconnecting(false);
        setReconnectionAttempts(0);
        clearReconnectionTimeout();
        
        // Start heartbeat to keep connection alive
        startHeartbeat();
        
        // Process pending messages after successful connection
        if (pendingMessages.length > 0) {
          console.log(`[MultipleClaudeCodeSessions] Processing ${pendingMessages.length} pending messages`);
          pendingMessages.forEach(message => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(message));
            }
          });
          setPendingMessages([]);
        }
      };

      ws.onmessage = event => {
        try {
          const message: ClaudeCodeMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error(
            "[MultipleClaudeCodeSessions] Error parsing message:",
            err
          );
        }
      };

      ws.onclose = (event) => {
        console.debug("[MultipleClaudeCodeSessions] WebSocket disconnected", { code: event.code, reason: event.reason });
        setConnectionStatus("closed");
        wsRef.current = null;
        
        // Stop heartbeat
        clearHeartbeatInterval();
        
        // Only reconnect if it was an unexpected disconnect (not code 1000 which is normal closure)
        // and we're not already reconnecting, and we have active sessions
        const hasActiveSessions = sessions.some(s => s.status === "active" || s.status === "connecting");
        
        if (event.code !== 1000 && !isReconnecting && reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS && hasActiveSessions) {
          console.log("[MultipleClaudeCodeSessions] Starting automatic reconnection for unexpected disconnect");
          attemptReconnection();
        } else if (event.code === 1000) {
          console.log("[MultipleClaudeCodeSessions] Normal WebSocket closure, not reconnecting");
          setIsReconnecting(false);
          setReconnectionAttempts(0);
        } else if (!hasActiveSessions) {
          console.log("[MultipleClaudeCodeSessions] No active sessions, skipping reconnection");
          setIsReconnecting(false);
          setReconnectionAttempts(0);
        }
      };

      ws.onerror = event => {
        console.error("[MultipleClaudeCodeSessions] WebSocket error:", event);
        setConnectionStatus("error");
        setError("WebSocket connection failed");
      };
    } catch (err) {
      console.error("[MultipleClaudeCodeSessions] Error connecting:", err);
      setConnectionStatus("error");
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  }, [websocketPort, getWebSocketPort, handleMessage, pendingMessages, clearReconnectionTimeout, startHeartbeat, clearHeartbeatInterval, isReconnecting, reconnectionAttempts, sessions, currentSessionId]);

  // Reconnection function with exponential backoff
  const attemptReconnection = useCallback(async () => {
    if (reconnectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
      console.error("[MultipleClaudeCodeSessions] Max reconnection attempts reached");
      setIsReconnecting(false);
      setConnectionStatus("error");
      setError("Máximo de tentativas de reconexão atingido. Verifique sua conexão.");
      return;
    }

    const delay = getReconnectionDelay(reconnectionAttempts);
    console.log(`[MultipleClaudeCodeSessions] Attempting reconnection ${reconnectionAttempts + 1}/${MAX_RECONNECTION_ATTEMPTS} in ${delay}ms`);
    
    setIsReconnecting(true);
    setConnectionStatus("connecting");
    
    reconnectionTimeoutRef.current = setTimeout(async () => {
      try {
        setReconnectionAttempts(prev => prev + 1);
        await connectWebSocket();
      } catch (error) {
        console.error("[MultipleClaudeCodeSessions] Reconnection failed:", error);
        if (reconnectionAttempts + 1 < MAX_RECONNECTION_ATTEMPTS) {
          attemptReconnection();
        } else {
          setIsReconnecting(false);
          setConnectionStatus("error");
          setError("Falha na reconexão após múltiplas tentativas");
        }
      }
    }, delay);
  }, [reconnectionAttempts, MAX_RECONNECTION_ATTEMPTS, getReconnectionDelay, connectWebSocket]);

  // Send message to WebSocket with queuing for offline scenarios
  const sendMessage = useCallback((message: ClaudeCodeMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message if WebSocket is not connected
      console.log("[MultipleClaudeCodeSessions] WebSocket not connected, queuing message");
      setPendingMessages(prev => [...prev, message]);
      
      // Attempt to reconnect if not already doing so
      if (!isReconnecting && connectionStatus !== "connecting") {
        attemptReconnection();
      }
    }
  }, [isReconnecting, connectionStatus, attemptReconnection]);

  // Select a session
  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  // Create a new session
  const createSession = useCallback(
    async (agent?: ClaudeAgent) => {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Use the first available agent as default if none specified
      const selectedAgent = agent || agents[0];

      const newSession: SessionData = {
        id: sessionId,
        workspaceName,
        workspacePath,
        agentName: selectedAgent?.name,
        command: selectedAgent?.command,
        status: "connecting",
        messages: [],
        lastActivity: new Date(),
      };

      setSessions(prev => [...prev, newSession]);
      setCurrentSessionId(sessionId);

      // Send start session message
      const startMessage: ClaudeCodeMessage = {
        type: "start_session",
        sessionId,
        workspacePath,
        command: selectedAgent?.command,
      };

      sendMessage(startMessage);
    },
    [workspaceName, workspacePath, sendMessage, agents]
  );

  // Close a session
  const closeSession = useCallback(
    async (sessionId: string) => {
      // Send stop session message
      const stopMessage: ClaudeCodeMessage = {
        type: "stop_session",
        sessionId,
      };

      sendMessage(stopMessage);

      // Remove session from state
      setSessions(prev => prev.filter(s => s.id !== sessionId));

      // If this was the current session, clear selection
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
    },
    [sendMessage, currentSessionId]
  );

  // Send command to a specific session
  const sendCommand = useCallback(
    (sessionId: string, command: string, imageIds?: string[]) => {
      // Find session to get Claude session ID if available
      const session = sessions.find(s => s.id === sessionId);
      
      const inputMessage: ClaudeCodeMessage = {
        type: "input",
        data: command,
        sessionId,
        workspacePath,
        imageIds,
        // Include Claude session ID for resume if available
        ...(session?.claudeSessionId ? { claudeSessionId: session.claudeSessionId } : {})
      };

      // Add the user input message to the session immediately for UI feedback
      handleMessage(inputMessage);

      // Send the message to the WebSocket
      sendMessage(inputMessage);
    },
    [sendMessage, handleMessage, sessions, workspacePath]
  );

  // Load agents for the workspace
  const loadAgents = useCallback(() => {
    agentsFetcher.load(`/api/agents/${encodeURIComponent(workspaceName)}`);
  }, [workspaceName, agentsFetcher]);

  // Connect to WebSocket on mount
  useEffect(() => {
    connectWebSocket();

    return () => {
      clearReconnectionTimeout();
      clearHeartbeatInterval();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket, clearReconnectionTimeout, clearHeartbeatInterval]);

  return {
    sessions: sessions,
    currentSessionId,
    isConnected,
    connectionStatus,
    error,
    isReconnecting,
    reconnectionAttempts,
    pendingMessagesCount: pendingMessages.length,
    selectSession,
    createSession,
    closeSession,
    sendCommand,
    loadAgents,
    agents,
    agentsLoading,
    agentsError,
  };
}
