import { describe, it, expect, beforeEach, vi } from "vitest";
import { AgentService } from "./agent.service";
import type { IFileSystemService, ILogger } from "../types/services";
import type { FileContent } from "shared-types";

// Mock FileSystemService
const mockFileSystemService: IFileSystemService = {
  getDirectoryStructure: vi.fn(),
  getFileContent: vi.fn(),
  saveFileContent: vi.fn(),
};

// Mock Logger
const mockLogger: ILogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  withContext: vi.fn().mockReturnThis(),
};

describe("AgentService", () => {
  let agentService: AgentService;

  beforeEach(() => {
    vi.clearAllMocks();
    agentService = new AgentService(mockFileSystemService, mockLogger);
  });

  describe("validateAgentCommand", () => {
    it("should accept valid commands with allowed prefixes", () => {
      expect(agentService.validateAgentCommand("claude code --help")).toBe(
        true
      );
      expect(agentService.validateAgentCommand("Claude Test run-all")).toBe(
        true
      );
      expect(agentService.validateAgentCommand("CLAUDE REVIEW file.ts")).toBe(
        true
      );
      expect(agentService.validateAgentCommand("claude analyze project")).toBe(
        true
      );
      expect(agentService.validateAgentCommand("claude help")).toBe(true);
    });

    it("should reject commands with disallowed prefixes", () => {
      expect(agentService.validateAgentCommand("rm -rf /")).toBe(false);
      expect(agentService.validateAgentCommand("sudo rm -rf")).toBe(false);
      expect(agentService.validateAgentCommand("npm install malicious")).toBe(
        false
      );
      expect(agentService.validateAgentCommand("curl http://evil.com")).toBe(
        false
      );
      expect(agentService.validateAgentCommand("")).toBe(false);
    });
  });

  describe("loadAgentsFromWorkspace", () => {
    it("should return empty array when file does not exist", async () => {
      vi.mocked(mockFileSystemService.getFileContent).mockRejectedValue(
        new Error("File not found")
      );

      const result = await agentService.loadAgentsFromWorkspace("/valid/path");

      expect(result).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Agent file not found or unreadable",
        expect.any(Object)
      );
    });

    it("should parse valid YAML and return agents", async () => {
      const validYamlContent: FileContent = {
        path: ".claude-agents.yaml",
        content: `
- name: "test-runner"
  description: "Executa testes automatizados"
  command: "claude test run-all"
  
- name: "code-reviewer"
  description: "Revisa código e sugere melhorias"
  command: "claude review --strict"
`,
        mimeType: "text/yaml",
      };

      vi.mocked(mockFileSystemService.getFileContent).mockResolvedValue(
        validYamlContent
      );

      const result = await agentService.loadAgentsFromWorkspace("/valid/path");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: "test-runner",
        description: "Executa testes automatizados",
        command: "claude test run-all",
      });
      expect(result[1]).toEqual({
        name: "code-reviewer",
        description: "Revisa código e sugere melhorias",
        command: "claude review --strict",
      });
    });

    it("should filter out agents with invalid commands", async () => {
      const yamlWithInvalidCommands: FileContent = {
        path: ".claude-agents.yaml",
        content: `
- name: "valid-agent"
  description: "Valid agent"
  command: "claude test run"
  
- name: "malicious-agent"
  description: "This should be filtered"
  command: "rm -rf /"
  
- name: "another-valid"
  description: "Another valid agent"
  command: "claude analyze code"
`,
        mimeType: "text/yaml",
      };

      vi.mocked(mockFileSystemService.getFileContent).mockResolvedValue(
        yamlWithInvalidCommands
      );

      const result = await agentService.loadAgentsFromWorkspace("/valid/path");

      expect(result).toHaveLength(2);
      expect(
        result.find(agent => agent.name === "malicious-agent")
      ).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Invalid agent command rejected",
        expect.objectContaining({
          agentName: "malicious-agent",
          command: "rm -rf /",
        })
      );
    });

    it("should return empty array for invalid YAML structure", async () => {
      const invalidYamlStructure: FileContent = {
        path: ".claude-agents.yaml",
        content: `
invalid_structure: true
not_an_array: "this should be an array"
`,
        mimeType: "text/yaml",
      };

      vi.mocked(mockFileSystemService.getFileContent).mockResolvedValue(
        invalidYamlStructure
      );

      const result = await agentService.loadAgentsFromWorkspace("/valid/path");

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Invalid agent structure in YAML",
        expect.any(Object)
      );
    });

    it("should return empty array for YAML with missing required fields", async () => {
      const incompleteYaml: FileContent = {
        path: ".claude-agents.yaml",
        content: `
- name: "incomplete-agent"
  description: "Missing command field"
  
- command: "claude test"
  description: "Missing name field"
`,
        mimeType: "text/yaml",
      };

      vi.mocked(mockFileSystemService.getFileContent).mockResolvedValue(
        incompleteYaml
      );

      const result = await agentService.loadAgentsFromWorkspace("/valid/path");

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Invalid agent structure in YAML",
        expect.any(Object)
      );
    });

    it("should reject paths with directory traversal", async () => {
      const result = await agentService.loadAgentsFromWorkspace(
        "/valid/../etc/passwd"
      );

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error loading agents",
        expect.any(Error),
        expect.objectContaining({
          workspacePath: "/valid/../etc/passwd",
        })
      );
    });
  });

  describe("cache functionality", () => {
    it("should cache results and return from cache on subsequent calls", async () => {
      const validYamlContent: FileContent = {
        path: ".claude-agents.yaml",
        content: `
- name: "cached-agent"
  description: "Should be cached"
  command: "claude test cache"
`,
        mimeType: "text/yaml",
      };

      vi.mocked(mockFileSystemService.getFileContent).mockResolvedValue(
        validYamlContent
      );

      // First call - should read from file
      const result1 = await agentService.loadAgentsFromWorkspace("/valid/path");
      expect(mockFileSystemService.getFileContent).toHaveBeenCalledTimes(1);

      // Reset the mock to ensure second call doesn't hit the filesystem
      vi.mocked(mockFileSystemService.getFileContent).mockClear();

      // Second call - should use cache
      const result2 = await agentService.loadAgentsFromWorkspace("/valid/path");
      expect(mockFileSystemService.getFileContent).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Cache hit",
        expect.any(Object)
      );

      expect(result1).toEqual(result2);
    });

    it("should invalidate cache when requested", async () => {
      const validYamlContent: FileContent = {
        path: ".claude-agents.yaml",
        content: `
- name: "agent-to-invalidate"
  description: "Will be cached then invalidated"
  command: "claude test invalidate"
`,
        mimeType: "text/yaml",
      };

      vi.mocked(mockFileSystemService.getFileContent).mockResolvedValue(
        validYamlContent
      );

      // First call - populates cache
      await agentService.loadAgentsFromWorkspace("/valid/path");
      expect(mockFileSystemService.getFileContent).toHaveBeenCalledTimes(1);

      // Invalidate cache
      agentService.invalidateCache("/valid/path");
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Cache invalidated",
        expect.objectContaining({
          workspacePath: expect.stringContaining("/valid/path"),
        })
      );

      // Next call should hit filesystem again
      vi.mocked(mockFileSystemService.getFileContent).mockClear();
      await agentService.loadAgentsFromWorkspace("/valid/path");
      expect(mockFileSystemService.getFileContent).toHaveBeenCalledTimes(1);
    });
  });

  describe("getAgentByName", () => {
    it("should return specific agent by name", async () => {
      const validYamlContent: FileContent = {
        path: ".claude-agents.yaml",
        content: `
- name: "test-runner"
  description: "Runs tests"
  command: "claude test run"
  
- name: "code-reviewer"
  description: "Reviews code"
  command: "claude review strict"
`,
        mimeType: "text/yaml",
      };

      vi.mocked(mockFileSystemService.getFileContent).mockResolvedValue(
        validYamlContent
      );

      const agent = await agentService.getAgentByName(
        "/valid/path",
        "code-reviewer"
      );

      expect(agent).toEqual({
        name: "code-reviewer",
        description: "Reviews code",
        command: "claude review strict",
      });
    });

    it("should return null for non-existent agent", async () => {
      const validYamlContent: FileContent = {
        path: ".claude-agents.yaml",
        content: `
- name: "existing-agent"
  description: "Exists"
  command: "claude test"
`,
        mimeType: "text/yaml",
      };

      vi.mocked(mockFileSystemService.getFileContent).mockResolvedValue(
        validYamlContent
      );

      const agent = await agentService.getAgentByName(
        "/valid/path",
        "non-existent"
      );

      expect(agent).toBeNull();
    });
  });

  describe("getAgentsWithMetadata", () => {
    it("should return agents with metadata", async () => {
      const validYamlContent: FileContent = {
        path: ".claude-agents.yaml",
        content: `
- name: "metadata-agent"
  description: "Agent with metadata"
  command: "claude test metadata"
`,
        mimeType: "text/yaml",
      };

      vi.mocked(mockFileSystemService.getFileContent).mockResolvedValue(
        validYamlContent
      );

      const response = await agentService.getAgentsWithMetadata("/valid/path");

      expect(response.agents).toHaveLength(1);
      expect(response.agents[0].name).toBe("metadata-agent");
      expect(response.metadata).toMatchObject({
        version: "1.0.0",
        fromCache: false,
      });
      expect(response.metadata.cacheTimestamp).toBeDefined();
      expect(response.metadata.fileLastModified).toBeDefined();
    });

    it("should indicate when response comes from cache", async () => {
      const validYamlContent: FileContent = {
        path: ".claude-agents.yaml",
        content: `
- name: "cached-metadata-agent"
  description: "Cached agent"
  command: "claude test cached"
`,
        mimeType: "text/yaml",
      };

      vi.mocked(mockFileSystemService.getFileContent).mockResolvedValue(
        validYamlContent
      );

      // First call
      await agentService.getAgentsWithMetadata("/valid/path");

      // Second call should be from cache
      const response = await agentService.getAgentsWithMetadata("/valid/path");

      expect(response.metadata.fromCache).toBe(true);
    });
  });

  describe("retry file operations", () => {
    it("should retry on transient errors but not on file not found", async () => {
      // Test transient error followed by success
      vi.mocked(mockFileSystemService.getFileContent)
        .mockRejectedValueOnce(new Error("EBUSY: resource busy"))
        .mockResolvedValueOnce({
          path: ".claude-agents.yaml",
          content: `
- name: "retry-agent"
  description: "Should work after retry"
  command: "claude test retry"
`,
          mimeType: "text/yaml",
        });

      const result = await agentService.loadAgentsFromWorkspace("/valid/path");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("retry-agent");
      expect(mockFileSystemService.getFileContent).toHaveBeenCalledTimes(2);
    });

    it("should not retry on file not found errors", async () => {
      vi.mocked(mockFileSystemService.getFileContent).mockRejectedValue(
        new Error("ENOENT: no such file or directory")
      );

      const result = await agentService.loadAgentsFromWorkspace("/valid/path");

      expect(result).toEqual([]);
      expect(mockFileSystemService.getFileContent).toHaveBeenCalledTimes(1);
    });
  });

  describe("cache eviction improvements", () => {
    it("should evict the least recently used entry when cache is full", async () => {
      // Fill cache to maximum capacity
      const maxCacheSize = 100;

      for (let i = 0; i < maxCacheSize; i++) {
        const yamlContent: FileContent = {
          path: ".claude-agents.yaml",
          content: `
- name: "agent-${i}"
  description: "Agent ${i}"
  command: "claude test ${i}"
`,
          mimeType: "text/yaml",
        };

        vi.mocked(mockFileSystemService.getFileContent).mockResolvedValue(
          yamlContent
        );
        await agentService.loadAgentsFromWorkspace(`/path/${i}`);
      }

      // Add one more to trigger eviction
      const newYamlContent: FileContent = {
        path: ".claude-agents.yaml",
        content: `
- name: "new-agent"
  description: "Should evict oldest"
  command: "claude test new"
`,
        mimeType: "text/yaml",
      };

      vi.mocked(mockFileSystemService.getFileContent).mockResolvedValue(
        newYamlContent
      );
      await agentService.loadAgentsFromWorkspace("/path/new");

      // Verify the oldest entry was evicted by checking debug logs
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Evicted oldest cache entry",
        expect.objectContaining({
          key: expect.any(String),
          lastModified: expect.any(String),
          cacheSize: expect.any(Number),
        })
      );
    });
  });
});
