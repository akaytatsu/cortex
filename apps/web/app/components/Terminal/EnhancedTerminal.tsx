import { useState, useCallback, useEffect } from "react";
import { TerminalTabs, type TerminalSession } from "./TerminalTabs";
import { TerminalCore } from "./TerminalCore";

interface EnhancedTerminalProps {
  workspaceName: string;
  workspacePath: string;
}

export function EnhancedTerminal({ workspaceName, workspacePath }: EnhancedTerminalProps) {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionCounter, setSessionCounter] = useState(1);

  // Create initial session
  useEffect(() => {
    if (sessions.length === 0) {
      createNewSession();
    }
  }, [sessions.length, createNewSession]);

  const createNewSession = useCallback(() => {
    const sessionId = `terminal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const newSession: TerminalSession = {
      id: sessionId,
      name: `Terminal ${sessionCounter}`,
      isActive: false,
      workspaceName,
      workspacePath,
      isConnected: false,
    };

    setSessions(prevSessions => {
      const updatedSessions = prevSessions.map(session => ({
        ...session,
        isActive: false,
      }));
      return [...updatedSessions, { ...newSession, isActive: true }];
    });

    setActiveSessionId(sessionId);
    setSessionCounter(prev => prev + 1);
  }, [sessionCounter, workspaceName, workspacePath]);

  const closeSession = useCallback((sessionId: string) => {
    setSessions(prevSessions => {
      const filteredSessions = prevSessions.filter(session => session.id !== sessionId);
      
      // If we're closing the active session, select another one
      if (sessionId === activeSessionId) {
        if (filteredSessions.length > 0) {
          const newActiveSession = filteredSessions[0];
          newActiveSession.isActive = true;
          setActiveSessionId(newActiveSession.id);
        } else {
          setActiveSessionId(null);
          // Create a new session if all were closed
          setTimeout(createNewSession, 0);
        }
      }
      
      return filteredSessions;
    });
  }, [activeSessionId, createNewSession]);

  const selectSession = useCallback((sessionId: string) => {
    setSessions(prevSessions =>
      prevSessions.map(session => ({
        ...session,
        isActive: session.id === sessionId,
      }))
    );
    setActiveSessionId(sessionId);
  }, []);

  const updateSessionConnection = useCallback((sessionId: string, isConnected: boolean) => {
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId ? { ...session, isConnected } : session
      )
    );
  }, []);

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId ? { ...session, name: title } : session
      )
    );
  }, []);

  const activeSession = sessions.find(session => session.id === activeSessionId);

  if (sessions.length === 0 || !activeSession) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Inicializando terminal...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Terminal Tabs */}
      <TerminalTabs
        sessions={sessions}
        onSessionCreate={createNewSession}
        onSessionClose={closeSession}
        onSessionSelect={selectSession}
      />

      {/* Active Terminal Content */}
      <div className="flex-1 relative">
        {sessions.map(session => (
          <div
            key={session.id}
            className={`absolute inset-0 ${session.isActive ? 'block' : 'hidden'}`}
          >
            <TerminalCore
              sessionId={session.id}
              workspaceName={session.workspaceName}
              workspacePath={session.workspacePath}
              onConnectionChange={(isConnected) => 
                updateSessionConnection(session.id, isConnected)
              }
              onTitleChange={(title) => 
                updateSessionTitle(session.id, title)
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}