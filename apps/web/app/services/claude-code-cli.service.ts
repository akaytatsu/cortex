// Client-side service that communicates with the server-side CLI
// Server-side imports are handled separately

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  type: "text" | "markdown" | "json" | "help";
  metadata?: Record<string, unknown>;
}

export interface CommandArgument {
  name: string;
  type: "string" | "number" | "boolean" | "file" | "directory";
  description: string;
  required: boolean;
  default?: unknown;
}

export interface NativeCommand {
  name: string;
  description: string;
  category: "core" | "workflow" | "config" | "debug";
  args?: CommandArgument[];
  examples?: string[];
}

export interface CustomCommand {
  name: string;
  filePath: string;
  description?: string;
  allowedTools?: string[];
  argumentHint?: string;
  frontmatter?: Record<string, unknown>;
}

export interface McpServer {
  name: string;
  type: "stdio" | "sse" | "http";
  description?: string;
  commands: McpCommand[];
  resources: McpResource[];
  status: "connected" | "disconnected" | "error";
}

export interface McpCommand {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface AvailableCommand {
  name: string;
  type: "native" | "custom" | "mcp" | "agent";
  description: string;
  category?: string;
  source?: string;
}

export interface CommandError {
  type: "cli_not_available" | "command_not_found" | "execution_error" | "timeout" | "mcp_error" | "parse_error";
  message: string;
  suggestions?: string[];
  recoverable: boolean;
  originalError?: Error;
}

export interface ProcessedCommand {
  command: string;
  args: string[];
  type: "native" | "custom" | "mcp" | "agent";
  metadata?: Record<string, unknown>;
}

export class ClaudeCodeCliService {
  private static instance: ClaudeCodeCliService;
  private sessionId: string;
  private workspacePath: string;
  private isInitialized: boolean = false;
  private commandCache: Map<string, CommandResult> = new Map();
  private availableCommands: AvailableCommand[] = [];
  private mcpServers: McpServer[] = [];
  private apiBaseUrl: string;
  
  private createCommandError(error: Partial<CommandError>): CommandError {
    return {
      type: error.type || "execution_error",
      message: error.message || "Unknown error",
      suggestions: error.suggestions || [],
      recoverable: error.recoverable ?? true,
      originalError: error.originalError
    } as CommandError;
  }
  
  // Native Claude Code CLI commands
  private nativeCommands: Map<string, NativeCommand> = new Map([
    ["help", {
      name: "help",
      description: "Show help information for Claude Code CLI",
      category: "core",
      examples: ["/help", "/help commands"]
    }],
    ["clear", {
      name: "clear",
      description: "Clear conversation history",
      category: "workflow",
      examples: ["/clear"]
    }],
    ["review", {
      name: "review",
      description: "Request code review for changes",
      category: "workflow",
      args: [
        {
          name: "path",
          type: "file",
          description: "Path to file or directory to review",
          required: false
        }
      ],
      examples: ["/review", "/review src/components"]
    }],
    ["vim", {
      name: "vim",
      description: "Enable vim-style editing mode",
      category: "config",
      examples: ["/vim on", "/vim off"]
    }],
    ["settings", {
      name: "settings",
      description: "Manage Claude Code settings",
      category: "config",
      args: [
        {
          name: "key",
          type: "string",
          description: "Setting key to modify",
          required: false
        },
        {
          name: "value",
          type: "string",
          description: "New value for the setting",
          required: false
        }
      ],
      examples: ["/settings", "/settings theme dark"]
    }],
    ["status", {
      name: "status",
      description: "Show current session status and information",
      category: "debug",
      examples: ["/status"]
    }]
  ]);

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.workspacePath = "";
    this.apiBaseUrl = typeof window !== "undefined" ? window.location.origin : "";
  }

  public static getInstance(): ClaudeCodeCliService {
    if (!ClaudeCodeCliService.instance) {
      ClaudeCodeCliService.instance = new ClaudeCodeCliService();
    }
    return ClaudeCodeCliService.instance;
  }

  private generateSessionId(): string {
    return `claude-cli-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public async startSession(workspacePath: string): Promise<void> {
    if (this.isInitialized && this.workspacePath === workspacePath) {
      return;
    }

    this.workspacePath = workspacePath;
    
    try {
      // Check CLI availability via API
      await this.checkCliAvailability();
      
      // Discover available commands
      await this.discoverCommands();
      
      // Initialize MCP servers
      await this.initializeMcpServers();
      
      this.isInitialized = true;
    } catch (error) {
      throw this.createCommandError({
        type: "cli_not_available",
        message: "Failed to initialize Claude Code CLI session",
        suggestions: [
          "Ensure Claude Code CLI is installed",
          "Check if the workspace path is valid",
          "Verify CLI permissions"
        ],
        recoverable: true,
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  private async checkCliAvailability(): Promise<void> {
    const workspaceName = this.workspacePath.split('/').pop() || 'default';
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/workspaces/${workspaceName}/cli-status`);
      
      if (!response.ok) {
        throw new Error(`CLI status check failed: ${response.statusText}`);
      }
      
      const status = await response.json();
      
      if (!status.available) {
        throw new Error("Claude Code CLI is not available");
      }
    } catch (error) {
      throw new Error(`Failed to check CLI availability: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  public async executeCommand(command: string, args: string[] = []): Promise<CommandResult> {
    if (!this.isInitialized) {
      throw this.createCommandError({
        type: "cli_not_available",
        message: "CLI session not initialized",
        suggestions: ["Call startSession() first"],
        recoverable: true
      });
    }

    const cacheKey = `${command}:${args.join(":")}`;
    
    // Check cache for read-only commands
    if (this.isReadOnlyCommand(command) && this.commandCache.has(cacheKey)) {
      return this.commandCache.get(cacheKey)!;
    }

    try {
      const result = await this.executeCommandInternal(command, args);
      
      // Cache result for read-only commands
      if (this.isReadOnlyCommand(command)) {
        this.commandCache.set(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      throw this.handleExecutionError(error, command, args);
    }
  }

  private async executeCommandInternal(command: string, args: string[]): Promise<CommandResult> {
    const workspaceName = this.workspacePath.split('/').pop() || 'default';
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/workspaces/${workspaceName}/cli-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          args,
          sessionId: this.sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Command execution failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: result.success,
        output: result.output || "",
        type: this.determineOutputType(command, result.output || ""),
        metadata: {
          command,
          args,
          executionTime: Date.now(),
          ...result.metadata
        }
      };
    } catch (error) {
      throw new Error(`Failed to execute command: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  public async executeNativeCommand(command: string, args: string[] = []): Promise<CommandResult> {
    const nativeCmd = this.nativeCommands.get(command);
    
    if (!nativeCmd) {
      throw this.createCommandError({
        type: "command_not_found",
        message: `Native command not found: ${command}`,
        suggestions: Array.from(this.nativeCommands.keys()),
        recoverable: true
      });
    }

    // Special handling for specific native commands
    switch (command) {
      case "help":
        return this.executeHelpCommand(args);
      case "clear":
        return this.executeClearCommand();
      case "status":
        return this.executeStatusCommand();
      default:
        return this.executeCommand(command, args);
    }
  }

  public async executeCustomCommand(command: CustomCommand, args: string[] = []): Promise<CommandResult> {
    try {
      // Execute custom command via API
      return this.executeCommand("custom", [command.name, ...args]);
    } catch (error) {
      throw this.createCommandError({
        type: "execution_error",
        message: `Failed to execute custom command: ${command.name}`,
        suggestions: ["Check if the command file exists", "Verify command syntax"],
        recoverable: true,
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  public async executeMcpCommand(server: string, command: string, args: string[] = []): Promise<CommandResult> {
    const mcpServer = this.mcpServers.find(s => s.name === server);
    
    if (!mcpServer) {
      throw this.createCommandError({
        type: "mcp_error",
        message: `MCP server not found: ${server}`,
        suggestions: this.mcpServers.map(s => s.name),
        recoverable: true
      });
    }

    if (mcpServer.status !== "connected") {
      throw this.createCommandError({
        type: "mcp_error",
        message: `MCP server ${server} is not connected`,
        suggestions: ["Check server configuration", "Restart MCP server"],
        recoverable: true
      });
    }

    return this.executeCommand("mcp", [server, command, ...args]);
  }

  public async discoverCommands(): Promise<AvailableCommand[]> {
    const commands: AvailableCommand[] = [];

    // Add native commands
    for (const [name, cmd] of this.nativeCommands) {
      commands.push({
        name: `/${name}`,
        type: "native",
        description: cmd.description,
        category: cmd.category
      });
    }

    // Discover custom commands
    try {
      const customCommands = await this.discoverCustomCommands();
      commands.push(...customCommands);
    } catch (error) {
      console.warn("Failed to discover custom commands:", error);
    }

    // Add MCP commands
    for (const server of this.mcpServers) {
      for (const cmd of server.commands) {
        commands.push({
          name: `/mcp__${server.name}__${cmd.name}`,
          type: "mcp",
          description: cmd.description || `MCP command from ${server.name}`,
          source: server.name
        });
      }
    }

    this.availableCommands = commands;
    return commands;
  }

  private async discoverCustomCommands(): Promise<AvailableCommand[]> {
    const workspaceName = this.workspacePath.split('/').pop() || 'default';
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/workspaces/${workspaceName}/custom-commands`);
      
      if (!response.ok) {
        console.warn("Failed to fetch custom commands");
        return [];
      }
      
      const commands = await response.json();
      return commands.map((cmd: any) => ({
        name: `/${cmd.name}`,
        type: "custom",
        description: cmd.description || `Custom command: ${cmd.name}`,
        source: cmd.filePath
      }));
    } catch (error) {
      console.warn("Custom commands discovery failed:", error);
      return [];
    }
  }

  public async listMcpServers(): Promise<McpServer[]> {
    // This would typically query the actual Claude Code CLI for MCP servers
    // For now, return cached servers
    return this.mcpServers;
  }

  private async initializeMcpServers(): Promise<void> {
    const workspaceName = this.workspacePath.split('/').pop() || 'default';
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/workspaces/${workspaceName}/mcp-servers`);
      
      if (!response.ok) {
        console.warn("Failed to fetch MCP servers");
        this.mcpServers = [];
        return;
      }
      
      this.mcpServers = await response.json();
    } catch (error) {
      console.warn("Failed to initialize MCP servers:", error);
      this.mcpServers = [];
    }
  }

  private parseMcpServers(_output: string): McpServer[] {
    // This would parse the actual CLI output
    // For now, return empty array as MCP integration needs actual CLI
    return [];
  }

  private async executeHelpCommand(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return {
        success: true,
        output: this.generateGeneralHelp(),
        type: "help"
      };
    }

    const topic = args[0];
    const command = this.nativeCommands.get(topic);
    
    if (command) {
      return {
        success: true,
        output: this.generateCommandHelp(command),
        type: "help"
      };
    }

    return {
      success: false,
      output: `Help topic not found: ${topic}`,
      error: `Available topics: ${Array.from(this.nativeCommands.keys()).join(", ")}`,
      type: "text"
    };
  }

  private executeClearCommand(): CommandResult {
    this.commandCache.clear();
    return {
      success: true,
      output: "Conversation history cleared",
      type: "text"
    };
  }

  private executeStatusCommand(): CommandResult {
    const status = {
      sessionId: this.sessionId,
      workspacePath: this.workspacePath,
      initialized: this.isInitialized,
      availableCommands: this.availableCommands.length,
      mcpServers: this.mcpServers.length,
      cacheSize: this.commandCache.size
    };

    return {
      success: true,
      output: JSON.stringify(status, null, 2),
      type: "json",
      metadata: status
    };
  }

  private generateGeneralHelp(): string {
    const sections = [
      "# Claude Code CLI - Web Interface Help",
      "",
      "## Available Commands",
      "",
      ...Array.from(this.nativeCommands.values()).map(cmd => 
        `**/${cmd.name}** - ${cmd.description}`
      ),
      "",
      "## Custom Commands",
      ...this.availableCommands
        .filter(cmd => cmd.type === "custom")
        .map(cmd => `**${cmd.name}** - ${cmd.description}`),
      "",
      "## Usage",
      "Type `/command` to execute a command.",
      "Use `/help <command>` for detailed help on specific commands."
    ];

    return sections.join("\n");
  }

  private generateCommandHelp(command: NativeCommand): string {
    const sections = [
      `# /${command.name}`,
      "",
      command.description,
      ""
    ];

    if (command.args && command.args.length > 0) {
      sections.push("## Arguments");
      sections.push("");
      command.args.forEach(arg => {
        const required = arg.required ? "(required)" : "(optional)";
        sections.push(`**${arg.name}** ${required} - ${arg.description}`);
      });
      sections.push("");
    }

    if (command.examples && command.examples.length > 0) {
      sections.push("## Examples");
      sections.push("");
      command.examples.forEach(example => {
        sections.push(`\`${example}\``);
      });
    }

    return sections.join("\n");
  }

  private isReadOnlyCommand(command: string): boolean {
    const readOnlyCommands = ["help", "status", "list"];
    return readOnlyCommands.includes(command);
  }

  private determineOutputType(command: string, output: string): "text" | "markdown" | "json" | "help" {
    if (command === "help") return "help";
    if (command === "status") return "json";
    
    try {
      JSON.parse(output);
      return "json";
    } catch {
      // Check if output contains markdown formatting
      if (output.includes("##") || output.includes("**") || output.includes("```")) {
        return "markdown";
      }
      return "text";
    }
  }

  private handleExecutionError(error: unknown, command: string, _args: string[]): CommandError {
    if (error && typeof error === "object" && "type" in error && "message" in error) {
      return error as CommandError;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("timeout")) {
      return this.createCommandError({
        type: "timeout",
        message: `Command timed out: ${command}`,
        suggestions: ["Try a simpler command", "Check system resources"],
        recoverable: true,
        originalError: error instanceof Error ? error : new Error(errorMessage)
      });
    }

    if (errorMessage.includes("not found") || errorMessage.includes("command not found")) {
      return this.createCommandError({
        type: "command_not_found",
        message: `Command not found: ${command}`,
        suggestions: Array.from(this.nativeCommands.keys()),
        recoverable: true,
        originalError: error instanceof Error ? error : new Error(errorMessage)
      });
    }

    return this.createCommandError({
      type: "execution_error",
      message: `Execution failed: ${errorMessage}`,
      suggestions: ["Check command syntax", "Verify workspace permissions"],
      recoverable: true,
      originalError: error instanceof Error ? error : new Error(errorMessage)
    });
  }

  public getAvailableCommands(): AvailableCommand[] {
    return [...this.availableCommands];
  }

  public getSessionInfo() {
    return {
      sessionId: this.sessionId,
      workspacePath: this.workspacePath,
      isInitialized: this.isInitialized,
      commandCount: this.availableCommands.length,
      mcpServerCount: this.mcpServers.length
    };
  }

  public async cleanup(): Promise<void> {
    this.commandCache.clear();
    this.isInitialized = false;
  }
}