import { useState, useCallback, useEffect, useRef } from "react";
import type { ClaudeCodeMessage, ClaudeAgent, TerminalSession, AgentListResponse } from "shared-types";
import { useFetcher } from "@remix-run/react";

interface SessionData {
  id: string;
  workspaceName: string;
  workspacePath: string;
  agentName?: string;
  command?: string;
  status: 'connecting' | 'active' | 'inactive' | 'error';
  messages: MessageEntry[];
  lastActivity: Date;
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
  connectionStatus: 'connecting' | 'open' | 'closed' | 'error';
  error: string | null;
  
  // Session management
  selectSession: (sessionId: string) => void;
  createSession: (agent?: ClaudeAgent) => Promise<void>;
  closeSession: (sessionId: string) => Promise<void>;
  
  // Agents
  loadAgents: () => void;
  agents: ClaudeAgent[];
  agentsLoading: boolean;
  agentsError: string | null;
}

export function useMultipleClaudeCodeSessions({
  workspaceName,
  workspacePath,
  userId
}: UseMultipleClaudeCodeSessionsOptions): UseMultipleClaudeCodeSessionsReturn {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [websocketPort, setWebsocketPort] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'open' | 'closed' | 'error'>('closed');
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const agentsFetcher = useFetcher<AgentListResponse | { error: { message: string } }>();

  const isConnected = connectionStatus === 'open';
  const agents = (agentsFetcher.data && 'agents' in agentsFetcher.data) ? agentsFetcher.data.agents : [];
  const agentsLoading = agentsFetcher.state === 'loading';
  const agentsError = (agentsFetcher.data && 'error' in agentsFetcher.data) ? agentsFetcher.data.error.message : null;


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
      console.error("[MultipleClaudeCodeSessions] Error getting WebSocket port:", err);
      throw err;
    }
  }, []);

  // Function to connect to WebSocket
  const connectWebSocket = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      setError(null);

      let port = websocketPort;
      if (!port) {
        port = await getWebSocketPort();
        setWebsocketPort(port);
      }

      // Get authentication token from cookie for WebSocket connection
      const getCookie = (name: string): string | null => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
        return null;
      };

      const sessionCookie = getCookie('__session');
      const wsUrl = `ws://localhost:${port}?type=claude-code&session=${encodeURIComponent(sessionCookie || '')}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.debug("[MultipleClaudeCodeSessions] WebSocket connected");
        setConnectionStatus('open');
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message: ClaudeCodeMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error("[MultipleClaudeCodeSessions] Error parsing message:", err);
        }
      };

      ws.onclose = () => {
        console.debug("[MultipleClaudeCodeSessions] WebSocket disconnected");
        setConnectionStatus('closed');
        wsRef.current = null;
      };

      ws.onerror = (event) => {
        console.error("[MultipleClaudeCodeSessions] WebSocket error:", event);
        setConnectionStatus('error');
        setError("WebSocket connection failed");
      };

    } catch (err) {
      console.error("[MultipleClaudeCodeSessions] Error connecting:", err);
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : "Connection failed");
    }
  }, [websocketPort, getWebSocketPort]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: ClaudeCodeMessage) => {
    setSessions(prevSessions => {
      return prevSessions.map(session => {
        if (session.id === message.sessionId) {
          const messageEntry: MessageEntry = {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            timestamp: new Date(),
            message,
          };

          let newStatus = session.status;
          if (message.type === 'session_started') {
            newStatus = message.status === 'success' ? 'active' : 'error';
          } else if (message.type === 'session_stopped') {
            newStatus = 'inactive';
          } else if (message.type === 'error') {
            newStatus = 'error';
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

  // Send message to WebSocket
  const sendMessage = useCallback((message: ClaudeCodeMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Select a session
  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  // Create a new session
  const createSession = useCallback(async (agent?: ClaudeAgent) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const newSession: SessionData = {
      id: sessionId,
      workspaceName,
      workspacePath,
      agentName: agent?.name,
      command: agent?.command,
      status: 'connecting',
      messages: [],
      lastActivity: new Date(),
    };

    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(sessionId);

    // Send start session message
    const startMessage: ClaudeCodeMessage = {
      type: 'start_session',
      sessionId,
      workspacePath,
      command: agent?.command,
    };

    sendMessage(startMessage);
  }, [workspaceName, workspacePath, sendMessage]);

  // Close a session
  const closeSession = useCallback(async (sessionId: string) => {
    // Send stop session message
    const stopMessage: ClaudeCodeMessage = {
      type: 'stop_session',
      sessionId,
    };

    sendMessage(stopMessage);

    // Remove session from state
    setSessions(prev => prev.filter(s => s.id !== sessionId));

    // If this was the current session, clear selection
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [sendMessage, currentSessionId]);

  // Load agents for the workspace
  const loadAgents = useCallback(() => {
    agentsFetcher.load(`/api/agents/${encodeURIComponent(workspaceName)}`);
  }, [workspaceName, agentsFetcher]);

  // Connect to WebSocket on mount
  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);


  return {
    sessions: sessions,
    currentSessionId,
    isConnected,
    connectionStatus,
    error,
    selectSession,
    createSession,
    closeSession,
    loadAgents,
    agents,
    agentsLoading,
    agentsError,
  };
}