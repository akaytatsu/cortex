import { useState, useEffect } from "react";
import { History, Clock, Search } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface CommandHistoryItem {
  command: string;
  timestamp: Date;
  workspaceName: string;
}

interface CommandHistoryProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectCommand: (command: string) => void;
  workspaceName: string;
}

function CommandHistory({
  isVisible,
  onClose,
  onSelectCommand,
  workspaceName,
}: CommandHistoryProps) {
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<CommandHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Load command history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem(`terminal-history-${workspaceName}`);
    if (savedHistory) {
      try {
        const parsed: CommandHistoryItem[] = JSON.parse(savedHistory).map((item: unknown) => {
          const historyItem = item as { command: string; timestamp: string; workspaceName: string };
          return {
            ...historyItem,
            timestamp: new Date(historyItem.timestamp),
          };
        });
        setHistory(parsed);
      } catch (error) {
        console.error("Failed to parse command history:", error);
      }
    }
  }, [workspaceName]);

  // Filter history based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredHistory(history);
    } else {
      const filtered = history.filter(item =>
        item.command.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredHistory(filtered);
    }
  }, [history, searchQuery]);


  const handleSelectCommand = (command: string) => {
    onSelectCommand(command);
    onClose();
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "agora";
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return timestamp.toLocaleDateString();
  };

  // Group commands by frequency
  const commandFrequency = filteredHistory.reduce((acc, item) => {
    acc[item.command] = (acc[item.command] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const popularCommands = Object.entries(commandFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([command]) => command);

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50">
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-200">Histórico de Comandos</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 px-2 text-gray-400 hover:text-gray-200"
          >
            ×
          </Button>
        </div>

        {/* Search */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar comandos..."
              className="pl-8 h-8 text-sm bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Popular Commands */}
        {popularCommands.length > 0 && !searchQuery && (
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-2">Comandos Populares</div>
            <div className="flex flex-wrap gap-2">
              {popularCommands.map((command) => (
                <button
                  key={command}
                  onClick={() => handleSelectCommand(command)}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 transition-colors"
                >
                  {command}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History List */}
        <div className="max-h-64 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-4">
              {searchQuery ? "Nenhum comando encontrado" : "Histórico vazio"}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredHistory.slice(0, 20).map((item, index) => (
                <button
                  key={`${item.command}-${index}`}
                  onClick={() => handleSelectCommand(item.command)}
                  className="w-full text-left px-2 py-1 text-sm hover:bg-gray-700 rounded flex items-center justify-between group transition-colors"
                >
                  <span className="text-gray-200 font-mono truncate flex-1">
                    {item.command}
                  </span>
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(item.timestamp)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>{filteredHistory.length} comandos</span>
            <span>Pressione ↑/↓ para navegar</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Expose addToHistory function for external use
  // This will be used by the terminal component to track commands
}

export { CommandHistory };