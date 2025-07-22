import { useState, useCallback } from "react";
import { Plus, X, Terminal as TerminalIcon } from "lucide-react";
import { Button } from "../ui/Button";

export interface TerminalSession {
  id: string;
  name: string;
  isActive: boolean;
  workspaceName: string;
  workspacePath: string;
  isConnected?: boolean;
}

interface TerminalTabsProps {
  sessions: TerminalSession[];
  onSessionCreate: () => void;
  onSessionClose: (sessionId: string) => void;
  onSessionSelect: (sessionId: string) => void;
}

export function TerminalTabs({
  sessions,
  onSessionCreate,
  onSessionClose,
  onSessionSelect,
}: TerminalTabsProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSession = useCallback(() => {
    setIsCreating(true);
    onSessionCreate();
    setTimeout(() => setIsCreating(false), 100);
  }, [onSessionCreate]);

  const handleCloseSession = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      onSessionClose(sessionId);
    },
    [onSessionClose]
  );

  return (
    <div className="flex items-center bg-gray-800 border-b border-gray-600 overflow-x-auto">
      {/* Terminal Sessions Tabs */}
      <div className="flex min-w-0 flex-1">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSessionSelect(session.id)}
            className={`
              group relative flex items-center space-x-2 px-3 py-2 text-sm font-medium transition-colors
              min-w-0 flex-shrink-0 max-w-48
              ${
                session.isActive
                  ? "bg-gray-700 text-white border-b-2 border-blue-500"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
              }
            `}
          >
            <TerminalIcon className="w-4 h-4 flex-shrink-0" />
            
            <span className="truncate">
              {session.name}
            </span>
            
            {/* Connection status indicator */}
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                session.isConnected ? "bg-green-400" : "bg-red-400"
              }`}
              title={session.isConnected ? "Connected" : "Disconnected"}
            />
            
            {/* Close button */}
            <button
              onClick={(e) => handleCloseSession(e, session.id)}
              className="w-4 h-4 flex-shrink-0 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-600 transition-opacity"
              title="Close terminal"
            >
              <X className="w-3 h-3" />
            </button>
          </button>
        ))}
      </div>

      {/* Add new terminal button */}
      <div className="flex-shrink-0 border-l border-gray-600">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateSession}
          disabled={isCreating}
          className="h-10 px-3 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-none"
          title="New terminal"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}