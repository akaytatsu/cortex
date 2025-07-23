import { useEffect, useRef } from "react";
import type { ClaudeCodeMessage } from "shared-types";
import { MessageBubble } from "./MessageBubble";

interface ConversationHistoryProps {
  messages: ClaudeCodeMessage[];
  isLoading?: boolean;
}

export function ConversationHistory({ messages, isLoading = false }: ConversationHistoryProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end" 
      });
    }
  }, [messages.length]);

  // Smooth scroll effect for loading states
  useEffect(() => {
    if (isLoading && bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ 
        behavior: "smooth",
        block: "end" 
      });
    }
  }, [isLoading]);

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 scroll-smooth"
      style={{
        scrollBehavior: "smooth"
      }}
    >
      {messages.map((message, index) => (
        <div key={message.id} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <MessageBubble message={message} />
          {/* Add visual separator between conversation sessions if needed */}
          {index < messages.length - 1 && messages[index + 1].timestamp.getTime() - message.timestamp.getTime() > 300000 && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center space-x-2 text-xs text-gray-400 dark:text-gray-500">
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                <span className="px-2 bg-gray-50 dark:bg-gray-800 rounded">
                  Nova sessão
                </span>
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
              </div>
            </div>
          )}
        </div>
      ))}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-start space-y-1 mb-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <div className="max-w-[85%] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Claude está digitando...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Invisible element to scroll to */}
      <div ref={bottomRef} className="h-0"></div>
    </div>
  );
}