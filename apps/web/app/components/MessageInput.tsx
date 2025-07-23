import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onSlashCommand?: (command: string, args: string[]) => void;
  isDisabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSendMessage,
  onSlashCommand,
  isDisabled = false,
  placeholder = "Ask Claude Code anything...",
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isSlashCommand = (text: string): boolean => {
    return text.startsWith("/") && text.includes(":");
  };

  const parseSlashCommand = (text: string): { command: string; args: string[] } => {
    const parts = text.slice(1).split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);
    return { command, args };
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (message.trim() && !isDisabled) {
      const trimmedMessage = message.trim();
      
      if (isSlashCommand(trimmedMessage) && onSlashCommand) {
        const { command, args } = parseSlashCommand(trimmedMessage);
        onSlashCommand(command, args);
      } else {
        onSendMessage(trimmedMessage);
      }
      
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // ~5 lines
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [message]);

  const isCurrentlySlashCommand = isSlashCommand(message);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
      <div className="p-4">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isDisabled}
              className={`w-full p-3 pr-4 text-sm bg-gray-50 dark:bg-gray-700 border rounded-xl resize-none focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400 ${
                isCurrentlySlashCommand 
                  ? "border-purple-300 dark:border-purple-600 focus:ring-purple-500 bg-purple-50 dark:bg-purple-900/20" 
                  : "border-gray-200 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent"
              }`}
              style={{ minHeight: "44px", maxHeight: "120px" }}
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={!message.trim() || isDisabled}
            className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-xl transition-all duration-200 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
            aria-label="Enviar mensagem"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-2">
          {isCurrentlySlashCommand ? (
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              🤖 Comando de agente detectado
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs border border-gray-200 dark:border-gray-600">
                Enter
              </kbd>{" "}
              para enviar,{" "}
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs border border-gray-200 dark:border-gray-600">
                Shift+Enter
              </kbd>{" "}
              para nova linha
            </p>
          )}
          {message && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {message.length} caracteres
            </p>
          )}
        </div>
      </div>
    </div>
  );
}