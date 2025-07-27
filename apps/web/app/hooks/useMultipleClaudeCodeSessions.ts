import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
  sendCommand: (sessionId: string, command: string, imageIds?: string[]) => void;

  // Agents
  loadAgents: () => void;
  agents: ClaudeAgent[];
  agentsLoading: boolean;
  agentsError: string | null;
}

// Configuration constants
const HEARTBEAT_INTERVAL = 15000; // 15 seconds
const RECONNECTION_DELAYS = [3000, 6000, 12000, 24000, 30000]; // Exponential backoff
const MAX_RECONNECTION_ATTEMPTS = 10;

export function useMultipleClaudeCodeSessions({
  workspaceName,
  workspacePath,
}: UseMultipleClaudeCodeSessionsOptions): UseMultipleClaudeCodeSessionsReturn {
  // State management
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "open" | "closed" | "error"
  >("connecting");
  const [error, setError] = useState<string | null>(null);
  
  // Reconnection state
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<ClaudeCodeMessage[]>([]);
  
  // WebSocket and timers refs
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetcher for agents
  const agentsFetcher = useFetcher<
    AgentListResponse | { error: { message: string } }
  >();

  // Computed values
  const isConnected = connectionStatus === "open";
  const agents = useMemo(
    () =>
      agentsFetcher.data && "agents" in agentsFetcher.data
        ? agentsFetcher.data.agents
        : [],
    [agentsFetcher.data]
  );
  const agentsLoading = agentsFetcher.state === "loading";
  const agentsError =
    agentsFetcher.data && "error" in agentsFetcher.data
      ? agentsFetcher.data.error.message
      : null;

  // Get reconnection delay with exponential backoff
  const getReconnectionDelay = useCallback((attemptNumber: number): number => {
    const delayIndex = Math.min(attemptNumber, RECONNECTION_DELAYS.length - 1);
    return RECONNECTION_DELAYS[delayIndex];
  }, []);

  // Clear timers utilities
  const clearHeartbeatInterval = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const clearReconnectionTimeout = useCallback(() => {
    if (reconnectionTimeoutRef.current) {
      clearTimeout(reconnectionTimeoutRef.current);
      reconnectionTimeoutRef.current = null;
    }
  }, []);

  // Start heartbeat to keep connection alive
  const startHeartbeat = useCallback(() => {
    clearHeartbeatInterval();
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === 1) { // WebSocket.OPEN = 1
        const heartbeatMessage: ClaudeCodeMessage = {
          type: "heartbeat",
          sessionId: currentSessionId || "heartbeat",
          timestamp: Date.now(),
        };
        
        console.debug("[MultipleClaudeCodeSessions] Sending heartbeat");
        try {
          wsRef.current.send(JSON.stringify(heartbeatMessage));
        } catch (error) {
          console.error("[MultipleClaudeCodeSessions] Failed to send heartbeat:", error);
          clearHeartbeatInterval();
        }
      }
    }, HEARTBEAT_INTERVAL);
  }, [clearHeartbeatInterval, currentSessionId]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: ClaudeCodeMessage) => {
    console.debug("[MultipleClaudeCodeSessions] Received message:", { 
      type: message.type, 
      sessionId: message.sessionId 
    });
    
    // Handle session lifecycle messages
    if (message.type === "session_started") {
      setSessions(prev => prev.map(session => 
        session.id === message.sessionId
          ? { ...session, status: message.status === "success" ? "active" : "error" }
          : session
      ));
      return;
    }
    
    if (message.type === "session_stopped" || message.type === "process_exit") {
      setSessions(prev => prev.map(session => 
        session.id === message.sessionId
          ? { ...session, status: "inactive" }
          : session
      ));
      return;
    }
    
    // Handle claude-response messages (aligned with claudecodeui)
    if ('type' in message && (message as { type: string }).type === "claude-response" && message.data) {
      const response = message.data as Record<string, unknown>;
      let convertedMessage: ClaudeCodeMessage | null = null;
      
      switch (response.type) {
        case 'system':
          if (response.subtype === 'init' && response.session_id) {
            setSessions(prev => prev.map(s => 
              s.id === message.sessionId 
                ? { ...s, claudeSessionId: response.session_id }
                : s
            ));
          }
          return; // Skip system messages
          
        case 'message':
        case 'assistant':
        case 'result': {
          let text = '';
          if (response.message?.content) {
            text = response.message.content
              .filter((item: unknown) => typeof item === 'object' && item !== null && 'type' in item && item.type === 'text')
              .map((item: unknown) => typeof item === 'object' && item !== null && 'text' in item ? (item as { text?: string }).text || '' : '')
              .join('');
          } else if (Array.isArray(response.content)) {
            text = response.content
              .filter((item: unknown) => typeof item === 'object' && item !== null && 'type' in item && item.type === 'text')
              .map((item: unknown) => typeof item === 'object' && item !== null && 'text' in item ? (item as { text?: string }).text || '' : '')
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
        }
          
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
          setSessions(prev => prev.map(session => 
            session.id === message.sessionId
              ? { ...session, status: "error" }
              : session
          ));
          break;
      }
      
      if (convertedMessage) {
        message = convertedMessage;
      }
    }
    
    // Store Claude session ID if provided
    if ('type' in message && (message as { type: string }).type === "session-created" && 
        message.data && typeof message.data === 'object' && 'claudeSessionId' in message.data) {
      setSessions(prev => prev.map(s => 
        s.id === message.sessionId 
          ? { ...s, claudeSessionId: (message.data as { claudeSessionId?: string })?.claudeSessionId }
          : s
      ));
      return;
    }
    
    // Add message to session history
    setSessions(prevSessions => {
      return prevSessions.map(session => {
        if (session.id === message.sessionId) {
          const messageEntry: MessageEntry = {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            timestamp: new Date(),
            message,
          };

          return {
            ...session,
            messages: [...session.messages, messageEntry],
            lastActivity: new Date(),
          };
        }
        return session;
      });
    });
  }, []);

  // Forward declaration for attemptReconnection
  const attemptReconnectionRef = useRef<() => void>();

  // Send message through WebSocket
  const sendMessage = useCallback((message: ClaudeCodeMessage) => {
    console.debug("[MultipleClaudeCodeSessions] sendMessage called", { 
      wsRef: !!wsRef.current, 
      readyState: wsRef.current?.readyState,
      WebSocketOPEN: WebSocket.OPEN,
      isOpen: wsRef.current?.readyState === WebSocket.OPEN,
      connectionStatus 
    });
    
    if (wsRef.current && wsRef.current.readyState === 1) { // WebSocket.OPEN = 1
      console.debug("[MultipleClaudeCodeSessions] Sending message via WebSocket");
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message if WebSocket is not connected
      console.log("[MultipleClaudeCodeSessions] WebSocket not connected, queuing message");
      setPendingMessages(prev => [...prev, message]);
      
      // Attempt to reconnect if not already doing so
      if (!isReconnecting && connectionStatus !== "connecting" && attemptReconnectionRef.current) {
        attemptReconnectionRef.current();
      }
    }
  }, [isReconnecting, connectionStatus]);

  // WebSocket connection management
  const connectWebSocket = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState === 1) { // WebSocket.OPEN = 1
      return;
    }

    try {
      setConnectionStatus("connecting");
      setError(null);

      // Get WebSocket port
      const portResponse = await fetch("/api/terminal-port");
      if (!portResponse.ok) {
        throw new Error(`Failed to get WebSocket port: ${portResponse.statusText}`);
      }
      const { port } = await portResponse.json();

      // Check authentication
      const authResponse = await fetch("/api/current-user", {
        credentials: "include",
      });
      
      if (!authResponse.ok) {
        throw new Error("Failed to check authentication");
      }
      
      const authData = await authResponse.json();
      if (!authData.authenticated) {
        setConnectionStatus("error");
        setError("User not authenticated. Please login.");
        return;
      }

      // Create WebSocket connection
      const wsUrl = `ws://localhost:${port}?type=claude-code&userId=${encodeURIComponent(authData.userId)}`;
      console.debug("[MultipleClaudeCodeSessions] Connecting to:", wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        wsRef.current = ws;
        console.debug("[MultipleClaudeCodeSessions] WebSocket connected");
        setConnectionStatus("open");
        setError(null);
        setIsReconnecting(false);
        setReconnectionAttempts(0);
        clearReconnectionTimeout();
        
        // Start heartbeat
        startHeartbeat();
        
        // Process pending messages after a small delay to ensure state updates
        setTimeout(() => {
          if (pendingMessages.length > 0) {
            console.log(`[MultipleClaudeCodeSessions] Processing ${pendingMessages.length} pending messages`);
            pendingMessages.forEach(message => {
              if (ws.readyState === 1) { // WebSocket.OPEN = 1
                ws.send(JSON.stringify(message));
              }
            });
            setPendingMessages([]);
          }
        }, 0);
      };

      ws.onmessage = event => {
        try {
          const message: ClaudeCodeMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error("[MultipleClaudeCodeSessions] Error parsing message:", err);
        }
      };

      ws.onclose = event => {
        console.debug("[MultipleClaudeCodeSessions] WebSocket disconnected", { 
          code: event.code, 
          reason: event.reason 
        });
        setConnectionStatus("closed");
        wsRef.current = null;
        clearHeartbeatInterval();
        
        // Only reconnect on unexpected disconnect with active sessions
        const hasActiveSessions = sessions.some(s => s.status === "active" || s.status === "connecting");
        
        if (event.code !== 1000 && !isReconnecting && reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS && hasActiveSessions && attemptReconnectionRef.current) {
          console.log("[MultipleClaudeCodeSessions] Starting automatic reconnection");
          attemptReconnectionRef.current();
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
  }, [
    handleMessage, 
    pendingMessages, 
    clearReconnectionTimeout, 
    startHeartbeat, 
    clearHeartbeatInterval, 
    isReconnecting, 
    reconnectionAttempts, 
    sessions
  ]);

  // Reconnection with exponential backoff
  const attemptReconnection = useCallback(() => {
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
        if (reconnectionAttempts + 1 < MAX_RECONNECTION_ATTEMPTS && attemptReconnectionRef.current) {
          attemptReconnectionRef.current();
        } else {
          setIsReconnecting(false);
          setConnectionStatus("error");
          setError("Falha na reconexão após múltiplas tentativas");
        }
      }
    }, delay);
  }, [reconnectionAttempts, getReconnectionDelay, connectWebSocket]);

  // Assign the ref after declaration
  attemptReconnectionRef.current = attemptReconnection;

  // Public API methods
  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  const createSession = useCallback(async (agent?: ClaudeAgent) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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

    const startMessage: ClaudeCodeMessage = {
      type: "start_session",
      sessionId,
      workspacePath,
      command: selectedAgent?.command,
    };

    sendMessage(startMessage);
  }, [workspaceName, workspacePath, sendMessage, agents]);

  const closeSession = useCallback(async (sessionId: string) => {
    const stopMessage: ClaudeCodeMessage = {
      type: "stop_session",
      sessionId,
    };

    sendMessage(stopMessage);
    setSessions(prev => prev.filter(s => s.id !== sessionId));

    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [sendMessage, currentSessionId]);

  const sendCommand = useCallback((sessionId: string, command: string, imageIds?: string[]) => {
    const session = sessions.find(s => s.id === sessionId);
    
    const inputMessage: ClaudeCodeMessage = {
      type: "input",
      data: command,
      sessionId,
      workspacePath,
      imageIds,
      ...(session?.claudeSessionId ? { claudeSessionId: session.claudeSessionId } : {})
    };

    // Add input message to session for UI feedback
    handleMessage(inputMessage);

    // Send to WebSocket
    sendMessage(inputMessage);
  }, [sendMessage, handleMessage, sessions, workspacePath]);

  const loadAgents = useCallback(() => {
    agentsFetcher.load(`/api/agents/${encodeURIComponent(workspaceName)}`);
  }, [workspaceName, agentsFetcher]);

  // Connect on mount and cleanup on unmount
  useEffect(() => {
    connectWebSocket();

    return () => {
      clearReconnectionTimeout();
      clearHeartbeatInterval();
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array for mount/unmount only - functions are stable

  return {
    sessions,
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