import { useState, useEffect } from "react";
import { X, Minus, MessageSquare } from "lucide-react";
import type { ClaudeCodeConversation, ClaudeCodeMessage } from "shared-types";
import { ConversationHistory } from "./ConversationHistory";
import { MessageInput } from "./MessageInput";
import { StatusIndicator } from "./StatusIndicator";
import { useClaudeCodeService } from "./ClaudeCodeService";
import { ClaudeCodeCliService } from "../services/claude-code-cli.service";
import { ClaudeCodeCommandProcessor } from "../services/command-processor.service";
import { AgentService } from "../services/agent.service";

interface ClaudeCodePanelProps {
  workspaceName: string;
  workspacePath: string;
  isVisible: boolean;
  onToggleVisibility: (visible: boolean) => void;
}

export function ClaudeCodePanel({
  workspaceName,
  workspacePath,
  isVisible,
  onToggleVisibility,
}: ClaudeCodePanelProps) {
  const [conversation, setConversation] = useState<ClaudeCodeConversation>({
    id: "default",
    sessionId: "default",
    messages: [],
    status: "idle",
    workspacePath,
  });

  const { isCliAvailable, cliVersion, sendMessage } = useClaudeCodeService({
    workspaceName,
    workspacePath,
    conversation,
    onConversationUpdate: setConversation,
  });

  const [cliService] = useState(() => ClaudeCodeCliService.getInstance());
  const [commandProcessor] = useState(() => new ClaudeCodeCommandProcessor());
  const [agentService] = useState(() => AgentService.getInstance());
  const [isCliInitialized, setIsCliInitialized] = useState(false);
  const [activeAgent, setActiveAgent] = useState(agentService.getActiveAgent());

  // Initialize CLI service when workspace changes
  useEffect(() => {
    const initializeCli = async () => {
      try {
        await cliService.startSession(workspacePath);
        setIsCliInitialized(true);
      } catch (error) {
        console.warn("Failed to initialize Claude Code CLI:", error);
        setIsCliInitialized(false);
      }
    };

    if (workspacePath && isCliAvailable) {
      initializeCli();
    }

    return () => {
      cliService.cleanup();
    };
  }, [workspacePath, isCliAvailable, cliService]);

  // Update active agent state when it changes
  useEffect(() => {
    const interval = setInterval(() => {
      const currentAgent = agentService.getActiveAgent();
      setActiveAgent(currentAgent);
    }, 100);

    return () => clearInterval(interval);
  }, [agentService]);

  const addMessageToConversation = (content: string, type: "user" | "assistant") => {
    const newMessage: ClaudeCodeMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      status: "sent"
    };

    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
  };

  const handleSendMessage = async (message: string) => {
    // Add user message to conversation
    addMessageToConversation(message, "user");

    // Check if it's a slash command
    if (message.trim().startsWith("/")) {
      await handleSlashCommand(message);
      return;
    }

    // Otherwise, send to Claude Code CLI
    await sendMessage(message);
  };

  const handleSlashCommand = async (commandInput: string) => {
    try {
      // Check if it's an agent activation command 
      const commandWithoutSlash = commandInput.slice(1); // Remove leading /
      
      if (agentService.isAgentCommand(commandWithoutSlash)) {
        // This is an agent activation command - use AgentService
        const result = await agentService.activateAgent(commandWithoutSlash, []);
        
        if (result.success && result.greeting) {
          addMessageToConversation(result.greeting, "assistant");
        } else if (result.error) {
          addMessageToConversation(`❌ ${result.error}`, "assistant");
        }
        return;
      }

      // Check if it's an agent command (starts with *)
      if (commandWithoutSlash.startsWith("*")) {
        // This is an agent command - use AgentService
        const response = agentService.processAgentCommand(commandWithoutSlash);
        addMessageToConversation(response, "assistant");
        return;
      }

      if (!isCliInitialized) {
        addMessageToConversation("❌ Claude Code CLI não está inicializado", "assistant");
        return;
      }

      // Process as regular CLI command
      const result = await commandProcessor.processSlashCommand(commandInput);
      
      if (result.success) {
        // Format output based on type
        let formattedOutput = result.output;
        
        if (result.type === "help") {
          formattedOutput = `## Ajuda\n\n${result.output}`;
        } else if (result.type === "json" && result.metadata) {
          formattedOutput = `\`\`\`json\n${JSON.stringify(result.metadata, null, 2)}\n\`\`\``;
        }
        
        addMessageToConversation(formattedOutput, "assistant");
      } else {
        let errorMessage = `❌ ${result.output}`;
        
        if (result.metadata?.suggestions && Array.isArray(result.metadata.suggestions) && result.metadata.suggestions.length > 0) {
          errorMessage += `\n\n**Sugestões:**\n${result.metadata.suggestions.map((s: string) => `• ${s}`).join("\n")}`;
        }
        
        addMessageToConversation(errorMessage, "assistant");
      }
    } catch (error) {
      addMessageToConversation(`❌ Erro ao processar comando: ${error instanceof Error ? error.message : "Erro desconhecido"}`, "assistant");
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-96 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {activeAgent ? `${activeAgent.name} ${activeAgent.icon}` : "Claude Code Assistant"}
            </h2>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {activeAgent ? activeAgent.title : "AI pair programming companion"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onToggleVisibility(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Minimizar painel"
          >
            <Minus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={() => onToggleVisibility(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Fechar painel"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <StatusIndicator 
            status={conversation.status} 
            message={
              isCliAvailable === false 
                ? "Claude Code CLI não disponível" 
                : isCliAvailable === true && cliVersion
                ? `Claude Code v${cliVersion} ${isCliInitialized ? "✓ Inicializado" : "⚠ Não inicializado"}`
                : undefined
            }
          />
          {isCliAvailable === null && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Verificando CLI...
            </div>
          )}
          {isCliAvailable && !isCliInitialized && (
            <div className="text-xs text-yellow-600 dark:text-yellow-400">
              Inicializando sessão CLI...
            </div>
          )}
        </div>
      </div>

      {/* Conversation Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-800">
        {conversation.messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl flex items-center justify-center mb-6">
              <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Olá! Como posso ajudar?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
              Sou seu assistente de desenvolvimento com Claude Code.<br />
              Use comandos com <code>/</code> para funcionalidades especiais ou faça perguntas sobre código.
            </p>
            <div className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">
                Comandos disponíveis:
              </p>
              <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 text-left">
                <li>• <code>/help</code> - Mostrar ajuda</li>
                <li>• <code>/clear</code> - Limpar conversa</li>
                <li>• <code>/review [arquivo]</code> - Revisar código</li>
                <li>• <code>/status</code> - Status da sessão</li>
              </ul>
            </div>
          </div>
        ) : (
          <ConversationHistory 
            messages={conversation.messages}
            isLoading={conversation.status === "thinking"}
          />
        )}

        {/* Input Area */}
        <MessageInput
          onSendMessage={handleSendMessage}
          onSlashCommand={(command, args) => handleSlashCommand(`/${command} ${args.join(" ")}`)}
          placeholder={
            activeAgent 
              ? `Fale com ${activeAgent.name} ${activeAgent.icon}...` 
              : "Digite / para comandos ou faça uma pergunta..."
          }
          isDisabled={conversation.status === "thinking"}
        />
      </div>
    </div>
  );
}