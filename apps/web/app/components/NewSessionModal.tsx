import { useState } from "react";
import type { ClaudeAgent } from "shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { ScrollArea } from "./ui/ScrollArea";
import { cn } from "../lib/utils";

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: ClaudeAgent[];
  isLoading: boolean;
  error?: string;
  onCreateSession: (agent?: ClaudeAgent) => void;
}

export function NewSessionModal({
  isOpen,
  onClose,
  agents,
  isLoading,
  error,
  onCreateSession
}: NewSessionModalProps) {
  const [selectedAgent, setSelectedAgent] = useState<ClaudeAgent | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSession = async () => {
    try {
      setIsCreating(true);
      await onCreateSession(selectedAgent || undefined);
      onClose();
      setSelectedAgent(null);
    } catch (error) {
      console.error("Erro ao criar sessão:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedAgent(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={handleClose}
        onKeyDown={(e) => e.key === 'Escape' && handleClose()}
        role="button"
        tabIndex={0}
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Nova Sessão</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Carregando agentes...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                <div className="text-sm text-red-700 dark:text-red-300">
                  <strong>Erro:</strong> {error}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Selecione um agente para iniciar a sessão:
              </p>

              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {/* Default Session Option */}
                  <Card 
                    className={cn(
                      "p-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
                      selectedAgent === null && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    )}
                    onClick={() => setSelectedAgent(null)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Sessão Padrão
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Inicia uma sessão Claude Code padrão sem agente específico
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Agent Options */}
                  {agents.map((agent) => (
                    <Card 
                      key={agent.name}
                      className={cn(
                        "p-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
                        selectedAgent?.name === agent.name && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      )}
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {agent.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {agent.description}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                            {agent.command}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}

                  {agents.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Nenhum agente encontrado no workspace
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateSession}
                  disabled={isCreating}
                >
                  {isCreating ? "Criando..." : "Criar Sessão"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}