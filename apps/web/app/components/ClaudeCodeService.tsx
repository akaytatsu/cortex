import { useState, useEffect } from "react";
import type { ClaudeCodeConversation, ClaudeCodeMessage } from "shared-types";

interface ClaudeCodeServiceProps {
  workspaceName: string;
  workspacePath: string;
  conversation: ClaudeCodeConversation;
  onConversationUpdate: (conversation: ClaudeCodeConversation) => void;
}

export function useClaudeCodeService({
  workspaceName,
  workspacePath,
  conversation,
  onConversationUpdate,
}: ClaudeCodeServiceProps) {
  const [isCliAvailable, setIsCliAvailable] = useState<boolean | null>(null);
  const [cliVersion, setCliVersion] = useState<string | null>(null);

  // Check CLI availability on mount
  useEffect(() => {
    checkCliAvailability();
  }, [workspaceName]);

  const checkCliAvailability = async () => {
    try {
      // TODO: Replace with actual CLI detection service call from Historia 4.1
      // For now, simulate CLI detection
      const response = await fetch(`/api/workspaces/${workspaceName}/cli-status`);
      if (response.ok) {
        const data = await response.json();
        setIsCliAvailable(data.available);
        setCliVersion(data.version);
      } else {
        setIsCliAvailable(false);
      }
    } catch (error) {
      console.warn("Failed to check Claude Code CLI availability:", error);
      setIsCliAvailable(false);
    }
  };

  const sendMessage = async (message: string): Promise<void> => {
    if (!isCliAvailable) {
      // Graceful degradation - show informative message
      const errorMessage: ClaudeCodeMessage = {
        id: Date.now().toString(),
        type: "assistant",
        content: `**Claude Code CLI não está disponível**

Para usar este assistente, você precisa:

1. Instalar o Claude Code CLI
2. Executar o comando de autenticação
3. Reiniciar a aplicação

Enquanto isso, você pode usar este painel para visualizar como seria a experiência completa!`,
        timestamp: new Date(),
      };

      onConversationUpdate({
        ...conversation,
        messages: [...conversation.messages, errorMessage],
        status: "error",
      });
      return;
    }

    // Update conversation with user message
    const userMessage: ClaudeCodeMessage = {
      id: Date.now().toString(),
      type: "user",
      content: message,
      timestamp: new Date(),
      status: "sending",
    };

    onConversationUpdate({
      ...conversation,
      messages: [...conversation.messages, userMessage],
      status: "thinking",
    });

    try {
      // TODO: Replace with actual WebSocket communication to Claude Code CLI
      // For now, simulate the interaction
      await simulateClaudeCodeResponse(userMessage.id, message);
    } catch (error) {
      console.error("Failed to send message to Claude Code:", error);
      
      // Update message status to error
      onConversationUpdate({
        ...conversation,
        messages: conversation.messages.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: "error" as const }
            : msg
        ),
        status: "error",
      });
    }
  };

  const simulateClaudeCodeResponse = async (userMessageId: string, userMessage: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mark user message as sent
    onConversationUpdate({
      ...conversation,
      messages: conversation.messages.map(msg => 
        msg.id === userMessageId 
          ? { ...msg, status: "sent" as const }
          : msg
      ),
    });

    // Simulate Claude Code processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate contextual response based on workspace
    const assistantMessage: ClaudeCodeMessage = {
      id: (Date.now() + 1).toString(),
      type: "assistant",
      content: generateContextualResponse(userMessage, workspaceName, workspacePath),
      timestamp: new Date(),
    };

    onConversationUpdate({
      ...conversation,
      messages: [...conversation.messages, assistantMessage],
      status: "idle",
    });
  };

  const generateContextualResponse = (userMessage: string, workspace: string, path: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes("help") || lowerMessage.includes("ajuda")) {
      return `**Olá! Sou seu assistente Claude Code**

Estou conectado ao workspace **${workspace}** em \`${path}\`.

Posso ajudar com:
- 📖 Análise e explicação de código
- 🔧 Debugging e resolução de problemas  
- ⚡ Refatoração e otimização
- 🧪 Criação de testes
- 📚 Documentação

**Exemplo de comandos:**
\`\`\`
Explique o arquivo src/components/Button.tsx
Encontre bugs no meu código React
Refatore esta função para ser mais eficiente
Crie testes para o service UserService
\`\`\`

O que gostaria de fazer hoje?`;
    }

    if (lowerMessage.includes("code") || lowerMessage.includes("código")) {
      return `Vou analisar o código no workspace **${workspace}**.

\`\`\`typescript
// Exemplo de análise que faria:
function analyzeWorkspace(path: string) {
  console.log(\`Analyzing workspace at: \${path}\`);
  // Lógica de análise real seria executada aqui
  return {
    files: [],
    issues: [],
    suggestions: []
  };
}
\`\`\`

**Próximos passos:**
1. Especifique qual arquivo ou diretório analisar
2. Descreva o problema ou objetivo
3. Receba análise detalhada e sugestões

Que código gostaria que eu analise?`;
    }

    return `Entendi sua mensagem sobre: "${userMessage}"

Como assistente Claude Code para o workspace **${workspace}**, posso ajudar com desenvolvimento, debugging e análise de código.

**Para uma resposta mais específica, me conte:**
- 🎯 Qual é seu objetivo?
- 📁 Em qual arquivo/pasta está trabalhando?
- ❓ Que tipo de ajuda precisa?

Estou aqui para tornar seu desenvolvimento mais eficiente!`;
  };

  return {
    isCliAvailable,
    cliVersion,
    sendMessage,
    checkCliAvailability,
  };
}