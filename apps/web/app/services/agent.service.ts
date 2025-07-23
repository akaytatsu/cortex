interface AgentConfig {
  id: string;
  name: string;
  title: string;
  icon: string;
  whenToUse: string;
  customization?: string;
  persona: {
    role: string;
    style: string;
    identity: string;
    focus: string;
  };
  commands: Array<{
    name: string;
    description: string;
  }>;
}

interface AgentActivationResult {
  success: boolean;
  greeting?: string;
  error?: string;
  agentConfig?: AgentConfig;
}

export class AgentService {
  private static instance: AgentService;
  private activeAgent: AgentConfig | null = null;
  private agentConfigs: Map<string, AgentConfig> = new Map();

  private constructor() {
    this.initializeBuiltInAgents();
  }

  public static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  private initializeBuiltInAgents() {
    // Agent dev configuration
    const devAgent: AgentConfig = {
      id: "dev",
      name: "James",
      title: "Full Stack Developer",
      icon: "💻",
      whenToUse: "Use for code implementation, debugging, refactoring, and development best practices",
      persona: {
        role: "Expert Senior Software Engineer & Implementation Specialist",
        style: "Extremely concise, pragmatic, detail-oriented, solution-focused",
        identity: "Expert who implements stories by reading requirements and executing tasks sequentially with comprehensive testing",
        focus: "Executing story tasks with precision, updating Dev Agent Record sections only, maintaining minimal context overhead"
      },
      commands: [
        { name: "help", description: "Show numbered list of available commands" },
        { name: "run-tests", description: "Execute linting and tests" },
        { name: "explain", description: "Teach and explain what was done in detail" },
        { name: "exit", description: "Exit the agent persona" }
      ]
    };

    this.agentConfigs.set("BMad:agents:dev", devAgent);
  }

  public async activateAgent(command: string, args: string[] = []): Promise<AgentActivationResult> {
    try {
      const agentConfig = this.agentConfigs.get(command);
      
      if (!agentConfig) {
        return {
          success: false,
          error: `Agente não encontrado: ${command}. Agentes disponíveis: ${Array.from(this.agentConfigs.keys()).join(", ")}`
        };
      }

      this.activeAgent = agentConfig;

      const greeting = this.generateAgentGreeting(agentConfig);

      return {
        success: true,
        greeting,
        agentConfig
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao ativar agente: ${error instanceof Error ? error.message : "Erro desconhecido"}`
      };
    }
  }

  private generateAgentGreeting(config: AgentConfig): string {
    return `Olá! Sou ${config.name} ${config.icon}, seu ${config.title}.

${config.persona.identity}

Use \`*help\` para ver a lista de comandos disponíveis.

Como posso ajudá-lo hoje?`;
  }

  public getActiveAgent(): AgentConfig | null {
    return this.activeAgent;
  }

  public deactivateAgent(): void {
    this.activeAgent = null;
  }

  public processAgentCommand(command: string): string {
    const activeAgent = this.getActiveAgent();
    
    if (!activeAgent) {
      return "Nenhum agente ativo. Use `/BMad:agents:dev` para ativar o agente de desenvolvimento.";
    }

    switch (command) {
      case "*help":
        return this.generateHelpMessage(activeAgent);
      case "*exit":
        this.deactivateAgent();
        return `Tchau! Saindo do modo ${activeAgent.name}. Voltando ao assistente padrão.`;
      case "*run-tests":
        return "🧪 Executando testes... (funcionalidade será implementada na integração com CLI)";
      case "*explain":
        return "📚 Modo explicação ativado. Próximas respostas incluirão detalhes técnicos para aprendizado.";
      default:
        return `Comando não reconhecido: ${command}. Use \`*help\` para ver comandos disponíveis.`;
    }
  }

  private generateHelpMessage(config: AgentConfig): string {
    const commandsList = config.commands
      .map((cmd, index) => `${index + 1}. **${cmd.name}**: ${cmd.description}`)
      .join("\n");

    return `## Comandos disponíveis para ${config.name} ${config.icon}

${commandsList}

Para usar um comando, digite \`*comando\` (ex: \`*help\`, \`*run-tests\`)`;
  }

  public isAgentCommand(message: string): boolean {
    return message.startsWith("*") && this.activeAgent !== null;
  }
}