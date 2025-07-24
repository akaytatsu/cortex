import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";

interface CommandInputProps {
  onSendCommand: (command: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CommandInput({
  onSendCommand,
  isDisabled = false,
  placeholder = "Digite um comando...",
  className = "",
}: CommandInputProps) {
  const [currentCommand, setCurrentCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentCommand.trim() || isDisabled) {
      return;
    }

    // Add to history (avoid duplicates)
    setCommandHistory(prev => {
      const newHistory = [currentCommand, ...prev.filter(cmd => cmd !== currentCommand)];
      return newHistory.slice(0, 50); // Keep only last 50 commands
    });

    // Send command
    onSendCommand(currentCommand);
    
    // Reset input
    setCurrentCommand("");
    setHistoryIndex(-1);
  }, [currentCommand, isDisabled, onSendCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand("");
      }
    }
  }, [historyIndex, commandHistory]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentCommand(e.target.value);
    setHistoryIndex(-1); // Reset history navigation when typing
  }, []);

  // Focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <form 
      onSubmit={handleSubmit} 
      className={cn("flex gap-2 p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700", className)}
    >
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={currentCommand}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          className={cn(
            "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md",
            "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100",
            "placeholder-gray-500 dark:placeholder-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent",
            "disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
        {commandHistory.length > 0 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 pointer-events-none select-none">
            ↑↓
          </div>
        )}
      </div>
      <Button
        type="submit"
        disabled={isDisabled || !currentCommand.trim()}
        className="px-4 py-2 text-sm"
      >
        Enviar
      </Button>
    </form>
  );
}