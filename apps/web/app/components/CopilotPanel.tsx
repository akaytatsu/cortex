import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { ClaudeCodeMessage, ClaudeAgent } from "shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { ScrollArea } from "./ui/ScrollArea";
import { cn } from "../lib/utils";
import { useMultipleClaudeCodeSessions } from "../hooks/useMultipleClaudeCodeSessions";
import { SessionManager } from "./SessionManager";
import { NewSessionModal } from "./NewSessionModal";
import { CommandInput } from "./CommandInput";

interface CopilotPanelProps {
  workspaceName: string;
  workspacePath: string;
  userId: string;
  className?: string;
}

interface MessageEntry {
  id: string;
  timestamp: Date;
  message: ClaudeCodeMessage;
}

export function CopilotPanel({
  workspaceName,
  workspacePath,
  userId,
  className = "",
}: CopilotPanelProps) {
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    sessions,
    currentSessionId,
    connectionStatus,
    error,
    isReconnecting,
    reconnectionAttempts,
    pendingMessagesCount,
    selectSession,
    createSession,
    closeSession,
    sendCommand,
    loadAgents,
    agents,
    agentsLoading,
    agentsError,
  } = useMultipleClaudeCodeSessions({ workspaceName, workspacePath, userId });

  // Get current session data (memoized to prevent dependency issues)
  const currentSession = useMemo(
    () => sessions.find(s => s.id === currentSessionId),
    [sessions, currentSessionId]
  );
  const messages = useMemo(
    () => currentSession?.messages || [],
    [currentSession?.messages]
  );
  const isProcessing = currentSession?.status === "connecting";

  // Handle new session creation
  const handleNewSession = useCallback(() => {
    setIsNewSessionModalOpen(true);
    loadAgents();
  }, [loadAgents]);

  const handleCreateSession = useCallback(
    async (agent?: ClaudeAgent) => {
      await createSession(agent);
      setIsNewSessionModalOpen(false);
    },
    [createSession]
  );

  // Handle command input
  const handleSendCommand = useCallback(
    (command: string) => {
      if (currentSessionId) {
        sendCommand(currentSessionId, command);
      }
    },
    [currentSessionId, sendCommand]
  );

  // Convert sessions for SessionManager component
  const terminalSessions = sessions.map(session => ({
    id: session.id,
    workspaceName: session.workspaceName,
    workspacePath: session.workspacePath,
    userId,
    status:
      session.status === "active"
        ? ("active" as const)
        : session.status === "connecting"
          ? ("active" as const)
          : ("inactive" as const),
    createdAt: session.lastActivity,
  }));

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer =
        scrollAreaRef.current.querySelector(
          "[data-radix-scroll-area-viewport]"
        ) ||
        scrollAreaRef.current.querySelector(".overflow-auto") ||
        scrollAreaRef.current;

      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Function to render message content based on type
  const renderMessageContent = (messageEntry: MessageEntry) => {
    const { message } = messageEntry;

    if (!message.data) {
      return (
        <div className="text-xs text-gray-500 dark:text-gray-400 italic">
          {message.type} - {message.status || "No data"}
        </div>
      );
    }

    // Special formatting for user input commands
    if (message.type === "input") {
      return (
        <div className="font-mono text-sm">
          <span className="text-blue-600 dark:text-blue-400 font-semibold">{">"} </span>
          <span className="text-gray-900 dark:text-gray-100">{message.data}</span>
        </div>
      );
    }

    // Ensure we have a string for ReactMarkdown
    const content = typeof message.data === 'string' 
      ? message.data 
      : message.data 
        ? JSON.stringify(message.data) 
        : '';

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  };

  // Function to get message type badge color
  const getMessageTypeBadge = (type: string) => {
    const colors = {
      output: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      stdout:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      stderr:
        "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      input: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };

    return (
      colors[type as keyof typeof colors] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    );
  };

  return (
    <div className={cn("flex h-full min-w-0 space-x-4", className)}>
      {/* Session Manager Sidebar */}
      <div className="w-80 flex-shrink-0">
        <SessionManager
          sessions={terminalSessions}
          currentSessionId={currentSessionId || undefined}
          onSessionSelect={selectSession}
          onSessionClose={closeSession}
          onNewSession={handleNewSession}
          className="h-full"
        />
      </div>

      {/* Main Chat Panel */}
      <Card className="flex flex-col h-full min-w-0 flex-1">
        <CardHeader className="pb-2 px-3 py-2 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 min-w-0">
              <CardTitle className="text-sm md:text-base truncate">
                {currentSession
                  ? `${currentSession.agentName || "Sessão Padrão"} - ${workspaceName}`
                  : "Copilot Panel"}
              </CardTitle>
              {currentSessionId && (
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:inline">
                  {currentSessionId.substring(0, 8)}...
                </span>
              )}
            </div>
            {isReconnecting && (
              <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                  Reconectando... ({reconnectionAttempts}/10)
                </span>
              </div>
            )}
            {!isReconnecting && isProcessing && (
              <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                  Processing...
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-2 md:p-4">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <strong>Erro de Conexão:</strong> {error}
                  </div>
                </div>
              </div>
            )}

            {isReconnecting && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse flex-shrink-0" />
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    <strong>Reconectando:</strong> Tentativa {reconnectionAttempts}/10...
                    {pendingMessagesCount > 0 && (
                      <span className="ml-2">({pendingMessagesCount} mensagens pendentes)</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {messages.length === 0 && !error ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center px-2">
                  <div className="text-2xl md:text-4xl mb-2">🤖</div>
                  <p className="text-xs md:text-sm">
                    Aguardando mensagens do copiloto...
                  </p>
                  <p className="text-xs mt-1 hidden sm:block">
                    {currentSessionId
                      ? "Conectado, aguardando atividade..."
                      : "Selecione uma sessão ativa para começar"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pr-2 md:pr-4">
                {messages.map(messageEntry => (
                  <Card key={messageEntry.id} className="p-2 md:p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span
                          className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            getMessageTypeBadge(messageEntry.message.type)
                          )}
                        >
                          {messageEntry.message.type}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {messageEntry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs md:text-sm">
                      {renderMessageContent(messageEntry)}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>

        {/* Status Bar */}
        <div className="px-2 py-1 md:px-4 md:py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 md:space-x-2 text-xs text-gray-600 dark:text-gray-400">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  connectionStatus === "open"
                    ? "bg-green-400"
                    : connectionStatus === "connecting"
                      ? "bg-yellow-400 animate-pulse"
                      : connectionStatus === "error"
                        ? "bg-red-400"
                        : "bg-gray-400"
                )}
              />
              <span className="hidden sm:inline">
                {isReconnecting
                  ? `Reconectando (${reconnectionAttempts}/10)`
                  : connectionStatus === "open"
                    ? "Conectado"
                    : connectionStatus === "connecting"
                      ? "Conectando..."
                      : connectionStatus === "error"
                        ? "Erro"
                        : "Desconectado"}
              </span>
              {currentSessionId && (
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:inline">
                  • {currentSessionId.substring(0, 8)}...
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <span>
                {messages.length}
                <span className="hidden sm:inline">
                  {" "}
                  mensagen{messages.length !== 1 ? "s" : ""}
                </span>
              </span>
              {pendingMessagesCount > 0 && (
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-xs">
                  {pendingMessagesCount} pendente{pendingMessagesCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Command Input */}
        {currentSessionId && (
          <CommandInput
            onSendCommand={handleSendCommand}
            isDisabled={connectionStatus !== "open" || isProcessing}
            placeholder="Digite um comando para enviar ao copiloto..."
            className="border-0 rounded-none rounded-b-lg"
          />
        )}
      </Card>

      {/* New Session Modal */}
      <NewSessionModal
        isOpen={isNewSessionModalOpen}
        onClose={() => setIsNewSessionModalOpen(false)}
        agents={agents}
        isLoading={agentsLoading}
        error={agentsError || undefined}
        onCreateSession={handleCreateSession}
      />
    </div>
  );
}
