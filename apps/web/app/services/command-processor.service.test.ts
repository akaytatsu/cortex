import { describe, it, expect, beforeEach, vi } from "vitest";
import { ClaudeCodeCommandProcessor } from "./command-processor.service";
import { ClaudeCodeCliService } from "./claude-code-cli.service";

// Mock ClaudeCodeCliService
vi.mock("./claude-code-cli.service", () => ({
  ClaudeCodeCliService: {
    getInstance: vi.fn(() => ({
      getAvailableCommands: vi.fn(() => [
        { name: "/help", type: "native", description: "Show help information", category: "core" },
        { name: "/clear", type: "native", description: "Clear conversation", category: "workflow" },
        { name: "/review", type: "native", description: "Request code review", category: "workflow" },
        { name: "/custom-task", type: "custom", description: "Execute custom task", source: "/path/to/custom-task.md" },
        { name: "/mcp__server1__command1", type: "mcp", description: "MCP command", source: "server1" }
      ]),
      executeNativeCommand: vi.fn(() => Promise.resolve({
        success: true,
        output: "Command executed",  
        type: "text"
      })),
      executeCustomCommand: vi.fn(() => Promise.resolve({
        success: true,
        output: "Custom command executed",
        type: "text"
      })),
      executeMcpCommand: vi.fn(() => Promise.resolve({
        success: true,
        output: "MCP command executed",
        type: "text" 
      })),
      discoverCommands: vi.fn(() => Promise.resolve([]))
    }))
  }
}));

describe("ClaudeCodeCommandProcessor", () => {
  let processor: ClaudeCodeCommandProcessor;
  let mockCliService: ReturnType<typeof ClaudeCodeCliService.getInstance>;

  beforeEach(() => {
    processor = new ClaudeCodeCommandProcessor();
    mockCliService = ClaudeCodeCliService.getInstance();
    vi.clearAllMocks();
  });

  describe("Command Parsing", () => {
    it("should parse simple slash command", () => {
      const result = processor.parseCommand("/help");

      expect(result.isSlashCommand).toBe(true);
      expect(result.command).toBe("help");
      expect(result.args).toEqual([]);
      expect(result.rawInput).toBe("/help");
    });

    it("should parse command with arguments", () => {
      const result = processor.parseCommand("/review src/components file.ts");

      expect(result.isSlashCommand).toBe(true);
      expect(result.command).toBe("review");
      expect(result.args).toEqual(["src/components", "file.ts"]);
    });

    it("should parse command with quoted arguments", () => {
      const result = processor.parseCommand('/review "src/my components" \'another file.ts\'');

      expect(result.isSlashCommand).toBe(true);
      expect(result.command).toBe("review");
      expect(result.args).toEqual(["src/my components", "another file.ts"]);
    });

    it("should handle non-slash commands", () => {
      const result = processor.parseCommand("regular message");

      expect(result.isSlashCommand).toBe(false);
      expect(result.command).toBe("");
      expect(result.args).toEqual([]);
    });

    it("should handle empty input", () => {
      const result = processor.parseCommand("");

      expect(result.isSlashCommand).toBe(false);
      expect(result.command).toBe("");
      expect(result.args).toEqual([]);
    });

    it("should handle slash command without command name", () => {
      const result = processor.parseCommand("/");

      expect(result.isSlashCommand).toBe(true);
      expect(result.command).toBe("");
      expect(result.args).toEqual([]);
    });
  });

  describe("Command Type Identification", () => {
    it("should identify native commands", async () => {
      const type = await processor.identifyCommandType("help");
      expect(type).toBe("native");
    });

    it("should identify custom commands", async () => {
      const type = await processor.identifyCommandType("custom-task");
      expect(type).toBe("custom");
    });

    it("should identify MCP commands", async () => {
      const type = await processor.identifyCommandType("mcp__server1__command1");
      expect(type).toBe("mcp");
    });

    it("should identify agent commands with asterisk", async () => {
      const type = await processor.identifyCommandType("*help");
      expect(type).toBe("agent");
    });

    it("should identify agent commands with colon", async () => {
      const type = await processor.identifyCommandType("BMad:agents:dev");
      expect(type).toBe("agent");
    });

    it("should identify unknown commands", async () => {
      const type = await processor.identifyCommandType("unknown-command");
      expect(type).toBe("unknown");
    });
  });

  describe("Command Execution", () => {
    it("should execute native command", async () => {
      mockCliService.executeNativeCommand.mockResolvedValue({
        success: true,
        output: "Help information",
        type: "help"
      });

      const result = await processor.processSlashCommand("/help");

      expect(result.success).toBe(true);
      expect(result.output).toBe("Help information");
      expect(mockCliService.executeNativeCommand).toHaveBeenCalledWith("help", []);
    });

    it("should execute native command with arguments", async () => {
      mockCliService.executeNativeCommand.mockResolvedValue({
        success: true,
        output: "Review help",
        type: "help"
      });

      const result = await processor.processSlashCommand("/help review");

      expect(result.success).toBe(true);
      expect(mockCliService.executeNativeCommand).toHaveBeenCalledWith("help", ["review"]);
    });

    it("should execute custom command", async () => {
      mockCliService.executeCustomCommand.mockResolvedValue({
        success: true,
        output: "Custom task executed",
        type: "text"
      });

      const result = await processor.processSlashCommand("/custom-task arg1 arg2");

      expect(result.success).toBe(true);
      expect(result.output).toBe("Custom task executed");
      expect(mockCliService.executeCustomCommand).toHaveBeenCalledWith(
        {
          name: "custom-task",
          filePath: "/path/to/custom-task.md",
          description: "Execute custom task"
        },
        ["arg1", "arg2"]
      );
    });

    it("should execute MCP command", async () => {
      mockCliService.executeMcpCommand.mockResolvedValue({
        success: true,
        output: "MCP command result",
        type: "text"
      });

      const result = await processor.processSlashCommand("/mcp__server1__command1 arg");

      expect(result.success).toBe(true);
      expect(result.output).toBe("MCP command result");
      expect(mockCliService.executeMcpCommand).toHaveBeenCalledWith("server1", "command1", ["arg"]);
    });

    it("should handle agent commands", async () => {
      const result = await processor.processSlashCommand("/*help");

      expect(result.success).toBe(true);
      expect(result.output).toBe("Agent command: *help");
      expect(result.metadata?.commandType).toBe("agent");
    });

    it("should handle agent activation commands", async () => {
      const result = await processor.processSlashCommand("/BMad:agents:dev");

      expect(result.success).toBe(true);
      expect(result.output).toBe("Activating agent: BMad:agents:dev");
      expect(result.metadata?.commandType).toBe("agent_activation");
    });

    it("should handle unknown commands", async () => {
      const result = await processor.processSlashCommand("/unknown-command");

      expect(result.success).toBe(false);
      expect(result.output).toContain("Unknown command: unknown-command");
      expect(result.metadata?.errorType).toBe("command_not_found");
    });

    it("should handle non-slash commands", async () => {
      const result = await processor.processSlashCommand("regular message");

      expect(result.success).toBe(false);
      expect(result.output).toBe("Input is not a valid slash command");
    });

    it("should handle empty slash command", async () => {
      const result = await processor.processSlashCommand("/");

      expect(result.success).toBe(false);
      expect(result.output).toBe("No command specified");
    });

    it("should handle invalid MCP command format", async () => {
      const result = await processor.processSlashCommand("/mcp__invalid");

      expect(result.success).toBe(false);
      expect(result.output).toContain("Invalid MCP command format");
    });

    it("should handle invalid agent command format", async () => {
      const result = await processor.processSlashCommand("/invalid-agent-format");

      expect(result.success).toBe(false);
      expect(result.output).toContain("Unknown command");
    });
  });

  describe("Command Suggestions", () => {
    it("should suggest commands based on partial input", async () => {
      const suggestions = await processor.suggestCommands("he");

      expect(suggestions.length).toBeGreaterThan(0);
      const helpCommand = suggestions.find(cmd => cmd.name === "/help");
      expect(helpCommand).toBeDefined();
    });

    it("should prioritize exact matches", async () => {
      const suggestions = await processor.suggestCommands("help");

      expect(suggestions[0].name).toBe("/help");
    });

    it("should return all commands for empty input", async () => {
      const suggestions = await processor.suggestCommands("");

      expect(suggestions.length).toBe(5); // Limited to first 10, we have 5 mocked
    });

    it("should return empty array for no matches", async () => {
      const suggestions = await processor.suggestCommands("xyz123nonexistent");

      expect(suggestions.length).toBe(0);
    });

    it("should match command descriptions", async () => {
      const suggestions = await processor.suggestCommands("task");

      const customTask = suggestions.find(cmd => cmd.name === "/custom-task");
      expect(customTask).toBeDefined();
    });

    it("should limit suggestions to 8 results", async () => {
      // Mock more commands
      mockCliService.getAvailableCommands.mockReturnValue(
        Array.from({ length: 20 }, (_, i) => ({
          name: `/command${i}`,
          type: "native",
          description: `Command ${i} description`,
          category: "test"
        }))
      );

      const suggestions = await processor.suggestCommands("command");

      expect(suggestions.length).toBe(8);
    });
  });

  describe("Utility Methods", () => {
    it("should detect slash commands", () => {
      expect(ClaudeCodeCommandProcessor.isSlashCommand("/help")).toBe(true);
      expect(ClaudeCodeCommandProcessor.isSlashCommand("  /help  ")).toBe(true);
      expect(ClaudeCodeCommandProcessor.isSlashCommand("help")).toBe(false);
      expect(ClaudeCodeCommandProcessor.isSlashCommand("")).toBe(false);
    });

    it("should validate command names", () => {
      expect(ClaudeCodeCommandProcessor.isValidCommandName("help")).toBe(true);
      expect(ClaudeCodeCommandProcessor.isValidCommandName("custom-task")).toBe(true);
      expect(ClaudeCodeCommandProcessor.isValidCommandName("task_name")).toBe(true);
      expect(ClaudeCodeCommandProcessor.isValidCommandName("command123")).toBe(true);
      
      expect(ClaudeCodeCommandProcessor.isValidCommandName("123command")).toBe(false);
      expect(ClaudeCodeCommandProcessor.isValidCommandName("command.name")).toBe(false);
      expect(ClaudeCodeCommandProcessor.isValidCommandName("command@name")).toBe(false);
      expect(ClaudeCodeCommandProcessor.isValidCommandName("")).toBe(false);
    });

    it("should get command help", async () => {
      mockCliService.executeNativeCommand.mockResolvedValue({
        success: true,
        output: "Help for review command",
        type: "help"
      });

      const result = await processor.getCommandHelp("review");

      expect(result.success).toBe(true);
      expect(result.output).toBe("Help for review command");
      expect(mockCliService.executeNativeCommand).toHaveBeenCalledWith("help", ["review"]);
    });

    it("should refresh commands", async () => {
      await processor.refreshCommands();

      expect(mockCliService.discoverCommands).toHaveBeenCalled();
    });

    it("should get available commands", async () => {
      const commands = await processor.getAvailableCommands();

      expect(commands).toEqual(mockCliService.getAvailableCommands());
    });
  });

  describe("Error Handling", () => {
    it("should handle CLI service errors gracefully", async () => {
      mockCliService.executeNativeCommand.mockRejectedValue(new Error("CLI error"));

      const result = await processor.processSlashCommand("/help");

      expect(result.success).toBe(false);
      expect(result.output).toBe("An unexpected error occurred");
      expect(result.error).toBe("CLI error");
    });

    it("should handle custom command not found", async () => {
      // Mock command not in available commands
      mockCliService.getAvailableCommands.mockReturnValue([
        { name: "/help", type: "native", description: "Help", category: "core" }
      ]);

      const result = await processor.processSlashCommand("/nonexistent-custom");

      expect(result.success).toBe(false);
      expect(result.output).toContain("Unknown command: nonexistent-custom");
    });
  });
});