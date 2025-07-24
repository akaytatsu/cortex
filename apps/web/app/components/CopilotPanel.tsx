import { useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { ClaudeCodeMessage } from "shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { ScrollArea } from "./ui/ScrollArea";
import { cn } from "../lib/utils";
import { useCopilotWebSocket } from "../hooks/useCopilotWebSocket";

interface CopilotPanelProps {
  sessionId?: string;
  className?: string;
}

interface MessageEntry {
  id: string;
  timestamp: Date;
  message: ClaudeCodeMessage;
}

export function CopilotPanel({ sessionId, className = "" }: CopilotPanelProps) {
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleMessage = useCallback((message: ClaudeCodeMessage) => {
    const messageEntry: MessageEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      message,
    };

    setMessages(prev => [...prev, messageEntry]);
  }, []);

  const handleError = useCallback((error: string) => {
    console.error("[CopilotPanel] WebSocket error:", error);
  }, []);

  const {
    connectionStatus,
    error,
    isProcessing,
  } = useCopilotWebSocket({
    sessionId,
    onMessage: handleMessage,
    onError: handleError,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') 
        || scrollAreaRef.current.querySelector('.overflow-auto')
        || scrollAreaRef.current;
      
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
          {message.type} - {message.status || 'No data'}
        </div>
      );
    }

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{message.data}</ReactMarkdown>
      </div>
    );
  };

  // Function to get message type badge color
  const getMessageTypeBadge = (type: string) => {
    const colors = {
      'output': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'error': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'stdout': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'stderr': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'input': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  return (
    <Card className={cn("flex flex-col h-full min-w-0", className)}>
      <CardHeader className="pb-2 px-3 py-2 md:px-6 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <CardTitle className="text-sm md:text-base truncate">Copilot Panel</CardTitle>
            {sessionId && (
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:inline">
                Session: {sessionId}
              </span>
            )}
          </div>
          {isProcessing && (
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
          
          {messages.length === 0 && !error ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-center px-2">
                <div className="text-2xl md:text-4xl mb-2">🤖</div>
                <p className="text-xs md:text-sm">Aguardando mensagens do copiloto...</p>
                <p className="text-xs mt-1 hidden sm:block">
                  {sessionId ? 'Conectado, aguardando atividade...' : 'Selecione uma sessão ativa para começar'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pr-2 md:pr-4">
              {messages.map((messageEntry) => (
                <Card key={messageEntry.id} className="p-2 md:p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-medium",
                        getMessageTypeBadge(messageEntry.message.type)
                      )}>
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
      <div className="px-2 py-1 md:px-4 md:py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 md:space-x-2 text-xs text-gray-600 dark:text-gray-400">
            <div className={cn(
              "w-2 h-2 rounded-full",
              connectionStatus === 'open' ? 'bg-green-400' :
              connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              connectionStatus === 'error' ? 'bg-red-400' :
              'bg-gray-400'
            )} />
            <span className="hidden sm:inline">
              {connectionStatus === 'open' ? 'Conectado' :
               connectionStatus === 'connecting' ? 'Conectando...' :
               connectionStatus === 'error' ? 'Erro' :
               'Desconectado'}
            </span>
            {sessionId && (
              <span className="text-xs text-gray-500 dark:text-gray-400 hidden md:inline">
                • {sessionId.substring(0, 8)}...
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {messages.length}
            <span className="hidden sm:inline">
              {' '}mensagen{messages.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}