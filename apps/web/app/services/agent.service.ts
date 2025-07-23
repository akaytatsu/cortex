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

    // Agent sm configuration
    const smAgent: AgentConfig = {
      id: "sm",
      name: "Sarah",
      title: "Story Manager",
      icon: "📋",
      whenToUse: "Use for story creation, management, and requirements gathering",
      persona: {
        role: "Product Owner & Story Management Specialist",
        style: "Structured, detail-oriented, user-focused, strategic thinking",
        identity: "Expert who creates and manages user stories, defines acceptance criteria, and ensures requirements are clear",
        focus: "Creating well-defined stories, managing backlogs, and facilitating requirements gathering"
      },
      commands: [
        { name: "help", description: "Show numbered list of available commands" },
        { name: "create-story", description: "Create a new user story" },
        { name: "review-story", description: "Review and refine existing stories" },
        { name: "exit", description: "Exit the agent persona" }
      ]
    };

    this.agentConfigs.set("BMad:agents:sm", smAgent);
  }

  public async activateAgent(command: string, args: string[] = []): Promise<AgentActivationResult> {
    try {
      let agentConfig = this.agentConfigs.get(command);
      
      // If agent not found in cache, try to discover it dynamically
      if (!agentConfig) {
        agentConfig = await this.discoverAgent(command);
        
        if (agentConfig) {
          this.agentConfigs.set(command, agentConfig);
        }
      }
      
      if (!agentConfig) {
        return {
          success: false,
          error: `Agente não encontrado: ${command}. Tente comandos como /BMad:agents:dev ou /BMad:agents:sm`
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

  private async discoverAgent(command: string): Promise<AgentConfig | null> {
    try {
      // Try to discover agent via API
      const workspaceName = 'webdev'; // This should be passed or derived contextually
      const response = await fetch(`${this.getApiBaseUrl()}/api/workspaces/${workspaceName}/agents/${encodeURIComponent(command)}`);
      
      if (response.ok) {
        const agentData = await response.json();
        return this.createAgentConfigFromData(command, agentData);
      }
    } catch (error) {
      console.warn(`Failed to discover agent ${command} via API:`, error);
    }

    // Fallback: Only create generic agents for very specific patterns and avoid unknown agents
    // This is disabled for now to prevent false positives - all agents should be properly configured
    return null;
  }

  private getApiBaseUrl(): string {
    return typeof window !== "undefined" ? window.location.origin : "";
  }

  private createAgentConfigFromData(command: string, data: any): AgentConfig {
    const agentId = command.split(':').pop() || 'unknown';
    
    return {
      id: agentId,
      name: data.name || this.capitalizeFirst(agentId),
      title: data.title || `${this.capitalizeFirst(agentId)} Agent`,
      icon: data.icon || "🤖",
      whenToUse: data.whenToUse || `Use for ${agentId}-related tasks`,
      customization: data.customization,
      persona: {
        role: data.persona?.role || `${this.capitalizeFirst(agentId)} Specialist`,
        style: data.persona?.style || "Professional, helpful, efficient",
        identity: data.persona?.identity || `Expert ${agentId} agent`,
        focus: data.persona?.focus || `${agentId} tasks and assistance`
      },
      commands: data.commands || [
        { name: "help", description: "Show available commands" },
        { name: "exit", description: "Exit the agent persona" }
      ]
    };
  }

  private createGenericAgent(command: string): AgentConfig {
    // Extract agent name from different patterns
    let agentId: string;
    let agentName: string;
    let namespace: string | null = null;
    
    if (command.includes(':')) {
      const parts = command.split(':');
      namespace = parts[0];
      agentId = parts.pop() || 'unknown';
      
      // Handle namespace:agents:name pattern
      if (parts.length > 1 && parts[1] === 'agents') {
        agentName = this.capitalizeFirst(agentId);
      } else {
        agentName = this.capitalizeFirst(agentId);
      }
    } else {
      agentId = command;
      agentName = this.capitalizeFirst(agentId);
    }
    
    // Choose appropriate icon based on agent name/type
    const icon = this.getAgentIcon(agentId, namespace);
    const title = this.getAgentTitle(agentId, namespace);
    
    return {
      id: agentId,
      name: agentName,
      title,
      icon,
      whenToUse: `Use for ${agentId}-related tasks and assistance`,
      persona: {
        role: `${agentName} Specialist`,
        style: "Professional, helpful, adaptive to user needs",
        identity: `Intelligent agent specialized in ${agentId} tasks`,
        focus: `Providing expert assistance with ${agentId} related activities`
      },
      commands: [
        { name: "help", description: "Show available commands for this agent" },
        { name: "status", description: "Show current agent status" },
        { name: "exit", description: "Exit the agent persona" }
      ]
    };
  }

  private getAgentIcon(agentId: string, namespace: string | null): string {
    // Predefined icons for common agent types
    const iconMap: Record<string, string> = {
      'dev': '💻',
      'developer': '💻',
      'sm': '📋',
      'story': '📋',
      'pm': '📊',
      'product': '📊',
      'qa': '🧪',
      'test': '🧪',
      'design': '🎨',
      'ui': '🎨',
      'ux': '🎨',
      'data': '📊',
      'analytics': '📈',
      'ml': '🤖',
      'ai': '🤖',
      'docs': '📚',
      'writer': '✍️',
      'security': '🔒',
      'devops': '⚙️',
      'ops': '⚙️'
    };
    
    return iconMap[agentId.toLowerCase()] || '🤖';
  }

  private getAgentTitle(agentId: string, namespace: string | null): string {
    // Predefined titles for common agent types
    const titleMap: Record<string, string> = {
      'dev': 'Development Agent',
      'developer': 'Development Agent',
      'sm': 'Story Manager',
      'story': 'Story Manager',
      'pm': 'Product Manager',
      'product': 'Product Manager',
      'qa': 'Quality Assurance Agent',
      'test': 'Testing Agent',
      'design': 'Design Agent',
      'ui': 'UI Designer',
      'ux': 'UX Designer',
      'data': 'Data Analyst',
      'analytics': 'Analytics Agent',
      'ml': 'Machine Learning Agent',
      'ai': 'AI Assistant',
      'docs': 'Documentation Agent',
      'writer': 'Content Writer',
      'security': 'Security Agent',
      'devops': 'DevOps Agent',
      'ops': 'Operations Agent'
    };
    
    const baseTitle = titleMap[agentId.toLowerCase()] || `${this.capitalizeFirst(agentId)} Agent`;
    
    if (namespace && namespace !== 'BMad') {
      return `${baseTitle} (${namespace})`;
    }
    
    return baseTitle;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private isValidAgentPattern(command: string): boolean {
    // Support multiple agent command patterns:
    // 1. BMad:agents:* (BMad custom agents)
    // 2. namespace:agents:* (other namespaced agents)  
    // 3. namespace:name pattern (but not simple single words which could be CLI commands)
    return !!(
      command.match(/^[^:]+:agents:\w+$/) ||           // namespace:agents:name
      command.match(/^[^:]+:[a-zA-Z][a-zA-Z0-9_-]*$/) // namespace:name
    );
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
      return "Nenhum agente ativo. Use comandos como `/BMad:agents:dev` ou `/BMad:agents:sm` para ativar um agente.";
    }

    switch (command) {
      case "*help":
        return this.generateHelpMessage(activeAgent);
      case "*exit":
        this.deactivateAgent();
        return `Tchau! Saindo do modo ${activeAgent.name}. Voltando ao assistente padrão.`;
      case "*status":
        return this.generateStatusMessage(activeAgent);
      case "*run-tests":
        return "🧪 Executando testes... (funcionalidade será implementada na integração com CLI)";
      case "*explain":
        return "📚 Modo explicação ativado. Próximas respostas incluirão detalhes técnicos para aprendizado.";
      default:
        // Check if the command matches any of the agent's specific commands
        const commandName = command.replace("*", "");
        const agentCommand = activeAgent.commands.find(cmd => cmd.name === commandName);
        
        if (agentCommand) {
          return `🤖 Executando comando **${commandName}** do agente ${activeAgent.name}...\n\n*Esta funcionalidade será implementada em breve.*`;
        }
        
        return `Comando não reconhecido: ${command}. Use \`*help\` para ver comandos disponíveis para ${activeAgent.name}.`;
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

  private generateStatusMessage(config: AgentConfig): string {
    return `## Status do Agente ${config.name} ${config.icon}

**Nome**: ${config.name}
**Título**: ${config.title}
**Função**: ${config.persona.role}
**Estilo**: ${config.persona.style}
**Foco**: ${config.persona.focus}

**Comandos disponíveis**: ${config.commands.length}
**Quando usar**: ${config.whenToUse}

Use \`*help\` para ver a lista completa de comandos.`;
  }

  public isAgentCommand(message: string): boolean {
    // Check if it's an agent command (starts with *) and we have an active agent
    if (message.startsWith("*") && this.activeAgent !== null) {
      return true;
    }
    
    // Check if it's an agent activation command using the same patterns
    return this.isAgentActivationCommand(message);
  }

  private isAgentActivationCommand(command: string): boolean {
    return this.isValidAgentPattern(command);
  }
}