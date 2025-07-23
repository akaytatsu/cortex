import { describe, it, expect, vi, beforeEach } from "vitest";
import { CliDetectionServiceError } from "./cli-detection.service";

// Mock the entire modules first
vi.mock("child_process");
vi.mock("util");

describe("CliDetectionService", () => {
  let mockExecAsync: ReturnType<typeof vi.fn>;
  let cliDetectionService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create fresh mock
    mockExecAsync = vi.fn();
    
    // Mock util.promisify to return our mock
    const util = await import("util");
    vi.mocked(util.promisify).mockReturnValue(mockExecAsync);
    
    // Dynamically import the service after mocking
    const module = await import("./cli-detection.service");
    cliDetectionService = module.cliDetectionService;
    cliDetectionService.clearCache();
  });

  describe("checkClaudeCodeAvailability", () => {
    it("should detect available CLI with version", async () => {
      // Mock successful which command
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "/usr/local/bin/claude", stderr: "" })
        .mockResolvedValueOnce({ stdout: "claude 1.2.3", stderr: "" });

      const result = await cliDetectionService.checkClaudeCodeAvailability();

      expect(result).toEqual({
        status: "available",
        version: "1.2.3"
      });
      expect(mockExecAsync).toHaveBeenCalledWith("which claude", {});
      expect(mockExecAsync).toHaveBeenCalledWith("claude --version", {});
    });

    it("should detect available CLI when version command fails", async () => {
      // Mock successful which, failed version
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "/usr/local/bin/claude", stderr: "" })
        .mockRejectedValueOnce(new Error("Command failed"));

      const result = await cliDetectionService.checkClaudeCodeAvailability();

      expect(result).toEqual({
        status: "available",
        error: "Version check failed but CLI is present"
      });
    });

    it("should detect CLI not available", async () => {
      // Mock failed which command
      mockExecAsync.mockRejectedValueOnce(new Error("command not found"));

      const result = await cliDetectionService.checkClaudeCodeAvailability();

      expect(result).toEqual({
        status: "not-available",
        error: "Claude Code CLI not found in PATH"
      });
      expect(mockExecAsync).toHaveBeenCalledWith("which claude", {});
      expect(mockExecAsync).toHaveBeenCalledTimes(1); // Should not try version check
    });

    it("should handle working directory parameter", async () => {
      const workingDir = "/test/path";
      mockExecAsync.mockRejectedValueOnce(new Error("command not found"));

      await cliDetectionService.checkClaudeCodeAvailability(workingDir);

      expect(mockExecAsync).toHaveBeenCalledWith("which claude", { cwd: workingDir });
    });

    it("should return cached result on subsequent calls", async () => {
      // First call
      mockExecAsync
        .mockResolvedValueOnce({ stdout: "/usr/local/bin/claude", stderr: "" })
        .mockResolvedValueOnce({ stdout: "claude 1.2.3", stderr: "" });

      const result1 = await cliDetectionService.checkClaudeCodeAvailability();
      
      // Second call - should use cache
      const result2 = await cliDetectionService.checkClaudeCodeAvailability();

      expect(result1).toEqual(result2);
      expect(mockExecAsync).toHaveBeenCalledTimes(2); // Only called once per command type
    });

    it("should handle different working directories separately in cache", async () => {
      const workingDir1 = "/test/path1";
      const workingDir2 = "/test/path2";

      mockExecAsync.mockRejectedValue(new Error("command not found"));

      await cliDetectionService.checkClaudeCodeAvailability(workingDir1);
      await cliDetectionService.checkClaudeCodeAvailability(workingDir2);

      expect(mockExecAsync).toHaveBeenCalledWith("which claude", { cwd: workingDir1 });
      expect(mockExecAsync).toHaveBeenCalledWith("which claude", { cwd: workingDir2 });
      expect(mockExecAsync).toHaveBeenCalledTimes(2);
    });

    it("should extract version from different output formats", async () => {
      const testCases = [
        { output: "claude version 1.2.3", expected: "1.2.3" },
        { output: "Claude Code CLI v2.1.0", expected: "2.1.0" },
        { output: "version: 0.9.15-beta", expected: "0.9.15" },
        { output: "no version info", expected: "no version info" } // fallback to sanitized output
      ];

      for (const testCase of testCases) {
        cliDetectionService.clearCache();
        mockExecAsync
          .mockResolvedValueOnce({ stdout: "/usr/local/bin/claude", stderr: "" })
          .mockResolvedValueOnce({ stdout: testCase.output, stderr: "" });

        const result = await cliDetectionService.checkClaudeCodeAvailability();
        
        expect(result.status).toBe("available");
        expect(result.version).toBe(testCase.expected);
      }
    });
  });

  describe("clearCache", () => {
    it("should clear cache for specific working directory", async () => {
      const workingDir = "/test/path";
      mockExecAsync.mockRejectedValue(new Error("command not found"));

      // Populate cache
      await cliDetectionService.checkClaudeCodeAvailability(workingDir);
      expect(mockExecAsync).toHaveBeenCalledTimes(1);

      // Clear specific cache
      cliDetectionService.clearCache(workingDir);

      // Should make new request
      await cliDetectionService.checkClaudeCodeAvailability(workingDir);
      expect(mockExecAsync).toHaveBeenCalledTimes(2);
    });

    it("should clear all cache when no directory specified", async () => {
      mockExecAsync.mockRejectedValue(new Error("command not found"));

      // Populate cache for multiple directories
      await cliDetectionService.checkClaudeCodeAvailability("/dir1");
      await cliDetectionService.checkClaudeCodeAvailability("/dir2");
      expect(mockExecAsync).toHaveBeenCalledTimes(2);

      // Clear all cache
      cliDetectionService.clearCache();

      // Should make new requests
      await cliDetectionService.checkClaudeCodeAvailability("/dir1");
      await cliDetectionService.checkClaudeCodeAvailability("/dir2");
      expect(mockExecAsync).toHaveBeenCalledTimes(4);
    });
  });

  describe("getCacheStats", () => {
    it("should return correct cache statistics", async () => {
      mockExecAsync.mockRejectedValue(new Error("command not found"));

      const stats1 = cliDetectionService.getCacheStats();
      expect(stats1.entries).toBe(0);
      expect(stats1.oldestEntry).toBeUndefined();

      // Add cache entries
      await cliDetectionService.checkClaudeCodeAvailability("/dir1");
      await cliDetectionService.checkClaudeCodeAvailability("/dir2");

      const stats2 = cliDetectionService.getCacheStats();
      expect(stats2.entries).toBe(2);
      expect(stats2.oldestEntry).toBeInstanceOf(Date);
    });
  });
});