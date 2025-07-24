import { useState } from "react";
import type { TerminalSession } from "shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { ScrollArea } from "./ui/ScrollArea";
import { cn } from "../lib/utils";

interface SessionManagerProps {
  sessions: TerminalSession[];
  currentSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onSessionClose: (sessionId: string) => void;
  onNewSession: () => void;
  className?: string;
}

export function SessionManager({
  sessions,
  currentSessionId,
  onSessionSelect,
  onSessionClose,
  onNewSession,
  className = ""
}: SessionManagerProps) {
  const [isClosing, setIsClosing] = useState<string | null>(null);

  const handleCloseSession = async (sessionId: string) => {
    try {
      setIsClosing(sessionId);
      await onSessionClose(sessionId);
    } catch (error) {
      console.error("Erro ao fechar sessão:", error);
    } finally {
      setIsClosing(null);
    }
  };

  const formatSessionName = (session: TerminalSession) => {
    return `${session.workspaceName} (${session.id.substring(0, 8)})`;
  };

  const getStatusColor = (status: TerminalSession['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'terminated':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2 px-3 py-2 md:px-6 md:py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm md:text-base">Sessões Ativas</CardTitle>
          <Button 
            onClick={onNewSession}
            size="sm" 
            className="text-xs md:text-sm"
          >
            Nova Sessão
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-2 md:p-4">
        <ScrollArea className="h-full">
          {sessions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-center px-2">
                <div className="text-2xl md:text-4xl mb-2">📋</div>
                <p className="text-xs md:text-sm">Nenhuma sessão ativa</p>
                <p className="text-xs mt-1">Clique em &quot;Nova Sessão&quot; para começar</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <Card 
                  key={session.id} 
                  className={cn(
                    "p-2 md:p-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
                    currentSessionId === session.id && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  )}
                  onClick={() => onSessionSelect(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-medium truncate">
                          {formatSessionName(session)}
                        </h3>
                        <span className={cn(
                          "px-2 py-1 rounded text-xs font-medium flex-shrink-0",
                          getStatusColor(session.status)
                        )}>
                          {session.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        Criada em {session.createdAt.toLocaleString()}
                      </p>
                      {session.pid && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          PID: {session.pid}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseSession(session.id);
                      }}
                      disabled={isClosing === session.id}
                      className="text-xs flex-shrink-0"
                    >
                      {isClosing === session.id ? "Fechando..." : "Fechar"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}