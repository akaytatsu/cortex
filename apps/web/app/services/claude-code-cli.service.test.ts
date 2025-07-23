import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ClaudeCodeCliService, CommandError } from "./claude-code-cli.service";
import { spawn } from "child_process";
import { promises as fs } from "fs";

// Mock child_process
vi.mock("child_process", () => ({
  spawn: vi.fn()
}));

// Mock fs promises
vi.mock("fs", () => ({
  promises: {
    readdir: vi.fn(),
    readFile: vi.fn()
  }
}));

const mockSpawn = vi.mocked(spawn);
const mockFs = vi.mocked(fs);

describe("ClaudeCodeCliService", () => {
  let cliService: ClaudeCodeCliService;

  beforeEach(() => {
    // Reset singleton for testing
    (ClaudeCodeCliService as any).instance = undefined;
    cliService = ClaudeCodeCliService.getInstance();
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Singleton Pattern", () => {
    it("should return same instance", () => {
      const instance1 = ClaudeCodeCliService.getInstance();
      const instance2 = ClaudeCodeCliService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("Session Management", () => {
    it("should initialize session successfully", async () => {
      // Mock successful CLI check
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(0), 10);
          }
        }),
        kill: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);
      mockFs.readdir.mockResolvedValue([]);

      await cliService.startSession("/test/workspace");

      expect(mockSpawn).toHaveBeenCalledWith("claude-code", ["--version"], {
        cwd: "/test/workspace",
        stdio: ["pipe", "pipe", "pipe"]
      });
    });

    it("should throw error when CLI is not available", async () => {
      // Mock failed CLI check
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(1), 10);
          }
        }),
        kill: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      await expect(cliService.startSession("/test/workspace")).rejects.toThrow();
    });

    it("should return session info", () => {
      const info = cliService.getSessionInfo();

      expect(info).toHaveProperty("sessionId");
      expect(info).toHaveProperty("workspacePath");
      expect(info).toHaveProperty("isInitialized");
      expect(info).toHaveProperty("commandCount");
      expect(info).toHaveProperty("mcpServerCount");
    });
  });

  describe("Native Commands", () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(0), 10);
          }
        }),
        kill: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);
      mockFs.readdir.mockResolvedValue([]);

      await cliService.startSession("/test/workspace");
    });

    it("should execute help command", async () => {
      const result = await cliService.executeNativeCommand("help");

      expect(result.success).toBe(true);
      expect(result.type).toBe("help");
      expect(result.output).toContain("Claude Code CLI - Web Interface Help");
    });

    it("should execute clear command", async () => {
      const result = await cliService.executeNativeCommand("clear");

      expect(result.success).toBe(true);
      expect(result.type).toBe("text");
      expect(result.output).toBe("Conversation history cleared");
    });

    it("should execute status command", async () => {
      const result = await cliService.executeNativeCommand("status");

      expect(result.success).toBe(true);
      expect(result.type).toBe("json");
      expect(result.metadata).toHaveProperty("sessionId");
    });

    it("should throw error for unknown native command", async () => {
      try {
        await cliService.executeNativeCommand("unknown");
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.type).toBe("command_not_found");
        expect(error.message).toContain("Native command not found: unknown");
      }
    });

    it("should provide help for specific command", async () => {
      const result = await cliService.executeNativeCommand("help", ["review"]);

      expect(result.success).toBe(true);
      expect(result.output).toContain("/review");
      expect(result.output).toContain("Request code review");
    });
  });

  describe("Command Discovery", () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(0), 10);
          }
        }),
        kill: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);
      mockFs.readdir.mockResolvedValue([]);

      await cliService.startSession("/test/workspace");
    });

    it("should discover native commands", async () => {
      const commands = await cliService.discoverCommands();

      const nativeCommands = commands.filter(cmd => cmd.type === "native");
      expect(nativeCommands.length).toBeGreaterThan(0);
      
      const helpCommand = nativeCommands.find(cmd => cmd.name === "/help");
      expect(helpCommand).toBeDefined();
      expect(helpCommand?.description).toContain("help");
    });

    it("should discover custom commands", async () => {
      // Mock custom commands directory
      mockFs.readdir.mockResolvedValue(["custom-task.md", "review-pr.md"] as any);
      mockFs.readFile.mockImplementation((filePath: string) => {
        if (filePath.includes("custom-task.md")) {
          return Promise.resolve(`---
description: "Execute custom development task"
---

Custom task implementation...
`);
        }
        if (filePath.includes("review-pr.md")) {
          return Promise.resolve("Review pull request implementation...");
        }
        return Promise.resolve("");
      });

      const commands = await cliService.discoverCommands();

      const customCommands = commands.filter(cmd => cmd.type === "custom");
      expect(customCommands.length).toBe(2);
      
      const customTask = customCommands.find(cmd => cmd.name === "/custom-task");
      expect(customTask).toBeDefined();
      expect(customTask?.description).toBe("Execute custom development task");
    });

    it("should handle missing custom commands directory gracefully", async () => {
      mockFs.readdir.mockRejectedValue(new Error("Directory not found"));

      const commands = await cliService.discoverCommands();

      // Should still return native commands
      const nativeCommands = commands.filter(cmd => cmd.type === "native");
      expect(nativeCommands.length).toBeGreaterThan(0);
    });
  });

  describe("Custom Command Execution", () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(0), 10);
          }
        }),
        kill: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);
      mockFs.readdir.mockResolvedValue([]);

      await cliService.startSession("/test/workspace");
    });

    it("should execute custom command with arguments", async () => {
      const customCommand = {
        name: "test-command",
        filePath: "/path/to/command.md",
        description: "Test command"
      };

      mockFs.readFile.mockResolvedValue("Execute task with args: $ARGUMENTS");

      // Mock CLI execution
      const mockExecProcess = {
        stdout: { on: vi.fn((event, callback) => callback("Task executed successfully")) },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(0), 10);
          }
        }),
        kill: vi.fn()
      };

      mockSpawn.mockReturnValue(mockExecProcess as any);

      const result = await cliService.executeCustomCommand(customCommand, ["arg1", "arg2"]);

      expect(result.success).toBe(true);
      expect(mockFs.readFile).toHaveBeenCalledWith("/path/to/command.md", "utf-8");
    });

    it("should handle file read errors", async () => {
      const customCommand = {
        name: "test-command",
        filePath: "/nonexistent/command.md",
        description: "Test command"
      };

      mockFs.readFile.mockRejectedValue(new Error("File not found"));

      try {
        await cliService.executeCustomCommand(customCommand, []);
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.type).toBe("execution_error");
        expect(error.message).toContain("Failed to execute custom command");
      }
    });
  });

  describe("MCP Integration", () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(0), 10);
          }
        }),
        kill: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);
      mockFs.readdir.mockResolvedValue([]);

      await cliService.startSession("/test/workspace");
    });

    it("should list MCP servers", async () => {
      const servers = await cliService.listMcpServers();

      expect(Array.isArray(servers)).toBe(true);
    });

    it("should execute MCP command", async () => {
      // Mock MCP server
      (cliService as any).mcpServers = [
        {
          name: "test-server",
          type: "stdio",
          status: "connected",
          commands: [{ name: "test-command" }],
          resources: []
        }
      ];

      // Mock CLI execution
      const mockProcess = {
        stdout: { on: vi.fn((event, callback) => callback("MCP command result")) },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(0), 10);
          }
        }),
        kill: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await cliService.executeMcpCommand("test-server", "test-command");

      expect(result.success).toBe(true);
    });

    it("should throw error for unknown MCP server", async () => {
      try {
        await cliService.executeMcpCommand("unknown-server", "command");
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.type).toBe("mcp_error");
        expect(error.message).toContain("MCP server not found");
      }
    });

    it("should throw error for disconnected MCP server", async () => {
      (cliService as any).mcpServers = [
        {
          name: "test-server",
          type: "stdio",
          status: "disconnected",
          commands: [],
          resources: []
        }
      ];

      try {
        await cliService.executeMcpCommand("test-server", "command");
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.type).toBe("mcp_error");
        expect(error.message).toContain("is not connected");
      }
    });
  });

  describe("Error Handling", () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(0), 10);
          }
        }),
        kill: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);
      mockFs.readdir.mockResolvedValue([]);

      await cliService.startSession("/test/workspace");
    });

    it("should handle timeout errors", async () => {
      // Mock process that never responds
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      // Set very short timeout for testing
      (cliService as any).sessionTimeout = 100;

      try {
        await cliService.executeCommand("slow-command");
        expect.fail("Should have thrown timeout error");
      } catch (error: any) {
        expect(error.type).toBe("timeout");
        expect(error.message).toContain("Command timed out");
      }
    });

    it("should handle command not found errors", async () => {
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn((event, callback) => callback("command not found")) },
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(1), 10);
          }
        }),
        kill: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      try {
        await cliService.executeCommand("nonexistent");
        expect.fail("Should have thrown command not found error");
      } catch (error: any) {
        expect(error.type).toBe("command_not_found");
        expect(error.message).toContain("Command not found");
      }
    });
  });

  describe("Caching", () => {
    beforeEach(async () => {
      // Mock successful initialization
      const mockProcess = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn((event, callback) => {
          if (event === "close") {
            setTimeout(() => callback(0), 10);
          }
        }),
        kill: vi.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);
      mockFs.readdir.mockResolvedValue([]);

      await cliService.startSession("/test/workspace");
    });

    it("should cache results for read-only commands", async () => {
      // First call
      const result1 = await cliService.executeNativeCommand("help");
      
      // Second call should use cache (no additional CLI calls)
      const result2 = await cliService.executeNativeCommand("help");

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.output).toBe(result2.output);
    });
  });

  describe("Cleanup", () => {
    it("should cleanup resources", async () => {
      // Mock process
      const mockProcess = {
        kill: vi.fn()
      };

      (cliService as any).process = mockProcess;
      (cliService as any).isInitialized = true;

      await cliService.cleanup();

      expect(mockProcess.kill).toHaveBeenCalled();
      expect(cliService.getSessionInfo().isInitialized).toBe(false);
    });
  });
});