import { ClaudeCodeCliService, CommandResult, CommandError, AvailableCommand } from "./claude-code-cli.service";

export interface CommandParseResult {
  command: string;
  args: string[];
  rawInput: string;
  isSlashCommand: boolean;
}

export interface CommandProcessor {
  processSlashCommand(input: string): Promise<CommandResult>;
  parseCommand(input: string): CommandParseResult;
  identifyCommandType(command: string): Promise<"native" | "custom" | "mcp" | "agent" | "unknown">;
  suggestCommands(partial: string): Promise<AvailableCommand[]>;
}

export class ClaudeCodeCommandProcessor implements CommandProcessor {
  private cliService: ClaudeCodeCliService;
  private commandPatterns: Map<string, RegExp> = new Map();

  constructor() {
    this.cliService = ClaudeCodeCliService.getInstance();
    this.initializeCommandPatterns();
  }

  private createCommandError(error: Partial<CommandError>): CommandError {
    return {
      type: error.type || "execution_error",
      message: error.message || "Unknown error",
      suggestions: error.suggestions || [],
      recoverable: error.recoverable ?? true,
      originalError: error.originalError
    } as CommandError;
  }

  private initializeCommandPatterns(): void {
    // Native command pattern: /command args
    this.commandPatterns.set("native", /^\/([a-zA-Z][a-zA-Z0-9_-]*)\s*(.*)?$/);
    
    // MCP command pattern: /mcp__servername__commandname args
    this.commandPatterns.set("mcp", /^\/mcp__([a-zA-Z0-9_-]+)__([a-zA-Z0-9_-]+)\s*(.*)?$/);
    
    // Custom command pattern: /customname args
    this.commandPatterns.set("custom", /^\/([a-zA-Z][a-zA-Z0-9_-]*)\s*(.*)?$/);
    
    // Agent command pattern: /*command or /agent:command
    this.commandPatterns.set("agent", /^\/(\*[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+)\s*(.*)?$/);
  }

  public parseCommand(input: string): CommandParseResult {
    const trimmedInput = input.trim();
    
    if (!trimmedInput.startsWith("/")) {
      return {
        command: "",
        args: [],
        rawInput: input,
        isSlashCommand: false
      };
    }

    // Basic parsing: split on whitespace, respecting quotes
    const parts = this.parseArguments(trimmedInput.slice(1)); // Remove leading /
    const command = parts[0] || "";
    const args = parts.slice(1);

    return {
      command,
      args,
      rawInput: input,
      isSlashCommand: true
    };
  }

  private parseArguments(input: string): string[] {
    const args: string[] = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = "";
    let i = 0;

    while (i < input.length) {
      const char = input[i];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = "";
      } else if (!inQuotes && /\s/.test(char)) {
        if (current) {
          args.push(current);
          current = "";
        }
      } else {
        current += char;
      }
      
      i++;
    }

    if (current) {
      args.push(current);
    }

    return args;
  }

  public async identifyCommandType(command: string): Promise<"native" | "custom" | "mcp" | "agent" | "unknown"> {
    // Check for MCP command pattern
    if (command.startsWith("mcp__") && command.includes("__")) {
      return "mcp";
    }

    // Check for agent command pattern
    if (command.startsWith("*") || command.includes(":")) {
      return "agent";
    }

    // Get available commands to check type
    const availableCommands = this.cliService.getAvailableCommands();
    const fullCommandName = `/${command}`;
    
    const matchedCommand = availableCommands.find(cmd => cmd.name === fullCommandName);
    
    if (matchedCommand) {
      return matchedCommand.type as "native" | "custom" | "mcp" | "agent";
    }

    // If not found in available commands, check if it's a known native command
    const nativeCommands = ["help", "clear", "review", "vim", "settings", "status"];
    if (nativeCommands.includes(command)) {
      return "native";
    }

    return "unknown";
  }

  public async processSlashCommand(input: string): Promise<CommandResult> {
    try {
      // 1. Parse command and arguments
      const parsed = this.parseCommand(input);
      
      if (!parsed.isSlashCommand) {
        throw this.createCommandError({
          type: "parse_error",
          message: "Input is not a valid slash command",
          suggestions: ["Commands must start with /", "Use /help for available commands"],
          recoverable: true
        });
      }

      if (!parsed.command) {
        throw this.createCommandError({
          type: "parse_error",
          message: "No command specified",
          suggestions: ["Use /help for available commands"],
          recoverable: true
        });
      }

      // 2. Determine command type
      const commandType = await this.identifyCommandType(parsed.command);
      
      // 3. Execute appropriate handler
      switch (commandType) {
        case "native":
          return this.executeNativeCommand(parsed);
        case "custom":
          return this.executeCustomCommand(parsed);
        case "mcp":
          return this.executeMcpCommand(parsed);
        case "agent":
          return this.executeAgentCommand(parsed);
        default:
          throw this.createCommandError({
            type: "command_not_found",
            message: `Unknown command: ${parsed.command}`,
            suggestions: await this.getCommandSuggestions(parsed.command),
            recoverable: true
          });
      }
    } catch (error) {
      if (error && typeof error === "object" && "type" in error && "message" in error) {
        const cmdError = error as CommandError;
        return {
          success: false,
          output: cmdError.message,
          error: cmdError.message,
          type: "text",
          metadata: {
            errorType: cmdError.type,
            suggestions: cmdError.suggestions,
            recoverable: cmdError.recoverable
          }
        };
      }

      return {
        success: false,
        output: "An unexpected error occurred",
        error: error instanceof Error ? error.message : String(error),
        type: "text"
      };
    }
  }

  private async executeNativeCommand(parsed: CommandParseResult): Promise<CommandResult> {
    return this.cliService.executeNativeCommand(parsed.command, parsed.args);
  }

  private async executeCustomCommand(parsed: CommandParseResult): Promise<CommandResult> {
    // Find the custom command
    const availableCommands = this.cliService.getAvailableCommands();
    const commandName = `/${parsed.command}`;
    const customCommand = availableCommands.find(
      cmd => cmd.name === commandName && cmd.type === "custom"
    );

    if (!customCommand || !customCommand.source) {
      throw this.createCommandError({
        type: "command_not_found",
        message: `Custom command not found: ${parsed.command}`,
        suggestions: availableCommands
          .filter(cmd => cmd.type === "custom")
          .map(cmd => cmd.name),
        recoverable: true
      });
    }

    const customCommandObj = {
      name: parsed.command,
      filePath: customCommand.source,
      description: customCommand.description
    };

    return this.cliService.executeCustomCommand(customCommandObj, parsed.args);
  }

  private async executeMcpCommand(parsed: CommandParseResult): Promise<CommandResult> {
    // Parse MCP command: mcp__servername__commandname
    const mcpMatch = parsed.command.match(/^mcp__([a-zA-Z0-9_-]+)__([a-zA-Z0-9_-]+)$/);
    
    if (!mcpMatch) {
      throw this.createCommandError({
        type: "parse_error",
        message: `Invalid MCP command format: ${parsed.command}`,
        suggestions: ["Use format: /mcp__servername__commandname"],
        recoverable: true
      });
    }

    const [, serverName, commandName] = mcpMatch;
    return this.cliService.executeMcpCommand(serverName, commandName, parsed.args);
  }

  private async executeAgentCommand(parsed: CommandParseResult): Promise<CommandResult> {
    // Agent commands are handled differently - they might need special processing
    // For now, treat them as a special case that returns information about agent activation
    
    if (parsed.command.startsWith("*")) {
      // Internal agent command (like *help, *exit)
      return {
        success: true,
        output: `Agent command: ${parsed.command}`,
        type: "text",
        metadata: {
          commandType: "agent",
          agentCommand: parsed.command,
          args: parsed.args
        }
      };
    }

    if (parsed.command.includes(":")) {
      // Agent activation command (like BMad:agents:dev)
      return {
        success: true,
        output: `Activating agent: ${parsed.command}`,
        type: "text",
        metadata: {
          commandType: "agent_activation",
          agentId: parsed.command,
          args: parsed.args
        }
      };
    }

    throw this.createCommandError({
      type: "parse_error",
      message: `Invalid agent command format: ${parsed.command}`,
      suggestions: ["Use *command for agent commands", "Use namespace:agent:name for activation"],
      recoverable: true
    });
  }

  public async suggestCommands(partial: string): Promise<AvailableCommand[]> {
    const availableCommands = this.cliService.getAvailableCommands();
    const searchTerm = partial.toLowerCase().replace(/^\//, "");

    if (!searchTerm) {
      return availableCommands.slice(0, 10); // Return first 10 commands
    }

    // Score and sort commands by relevance
    const scoredCommands = availableCommands
      .map(cmd => {
        const name = cmd.name.toLowerCase().replace(/^\//, "");
        const description = cmd.description.toLowerCase();
        
        let score = 0;
        
        // Exact match
        if (name === searchTerm) score += 100;
        
        // Starts with
        if (name.startsWith(searchTerm)) score += 80;
        
        // Contains
        if (name.includes(searchTerm)) score += 40;
        
        // Description contains
        if (description.includes(searchTerm)) score += 20;
        
        // Category match (if available)
        if (cmd.category && cmd.category.toLowerCase().includes(searchTerm)) score += 10;

        return { command: cmd, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8) // Limit to 8 suggestions
      .map(item => item.command);

    return scoredCommands;
  }

  private async getCommandSuggestions(command: string): Promise<string[]> {
    const suggestions = await this.suggestCommands(command);
    return suggestions.map(cmd => cmd.name);
  }

  public async getAvailableCommands(): Promise<AvailableCommand[]> {
    return this.cliService.getAvailableCommands();
  }

  public async refreshCommands(): Promise<void> {
    await this.cliService.discoverCommands();
  }

  // Utility method to check if input looks like a command
  public static isSlashCommand(input: string): boolean {
    return input.trim().startsWith("/");
  }

  // Utility method to validate command name
  public static isValidCommandName(name: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name);
  }

  // Get command help
  public async getCommandHelp(commandName: string): Promise<CommandResult> {
    return this.cliService.executeNativeCommand("help", [commandName]);
  }
}