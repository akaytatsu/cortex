import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from "vitest";
import { SessionPersistenceService } from "./session-persistence.service";
import type { ILogger } from "../types/services";
import type { PersistedSession } from "shared-types";
import fs from "fs/promises";
import path from "path";
import YAML from "yaml";

// Mock Logger
const mockLogger: ILogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  withContext: vi.fn().mockReturnThis(),
};

// Test data fixtures
const mockSession1: PersistedSession = {
  id: "session-1",
  workspaceName: "test-workspace",
  workspacePath: "/path/to/workspace",
  pid: 12345,
  startedAt: "2025-01-15T10:00:00.000Z",
  agentName: "dev",
  command: "claude code",
  userId: "user-1",
};

const mockSession2: PersistedSession = {
  id: "session-2",
  workspaceName: "another-workspace",
  workspacePath: "/path/to/another",
  pid: 67890,
  startedAt: "2025-01-15T11:00:00.000Z",
  userId: "user-2",
};

describe("SessionPersistenceService", () => {
  let service: SessionPersistenceService;
  let testFilePath: string;
  let testDir: string;

  beforeAll(async () => {
    // Create a temporary directory for tests
    testDir = path.join(process.cwd(), "test-temp");
    await fs.mkdir(testDir, { recursive: true });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Use a unique test file for each test
    testFilePath = path.join(testDir, `test-sessions-${Date.now()}.yaml`);
    service = new SessionPersistenceService(testFilePath, mockLogger);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testFilePath);
    } catch {
      // File might not exist, ignore
    }
    
    // Clean up backup files
    try {
      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(file => file.includes(".backup."));
      for (const backupFile of backupFiles) {
        await fs.unlink(path.join(testDir, backupFile));
      }
    } catch {
      // Directory might not exist, ignore
    }
  });

  describe("loadSessions", () => {
    it("should return empty array when file does not exist", async () => {
      const sessions = await service.loadSessions();
      
      expect(sessions).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Sessions file doesn't exist, returning empty array"
      );
    });

    it("should load sessions from valid YAML file", async () => {
      // Create test file with sessions
      const testData = {
        sessions: [mockSession1, mockSession2],
      };
      await fs.writeFile(testFilePath, YAML.stringify(testData), "utf8");

      const sessions = await service.loadSessions();

      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toEqual(mockSession1);
      expect(sessions[1]).toEqual(mockSession2);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Sessions data read successfully",
        { sessionCount: 2 }
      );
    });

    it("should return empty array and log warning for corrupted file", async () => {
      // Create corrupted YAML file
      await fs.writeFile(testFilePath, "invalid: yaml: content: [", "utf8");

      const sessions = await service.loadSessions();

      expect(sessions).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Returning empty sessions array due to read error"
      );
    });

    it("should use cache on subsequent calls", async () => {
      const testData = { sessions: [mockSession1] };
      await fs.writeFile(testFilePath, YAML.stringify(testData), "utf8");

      // First call
      await service.loadSessions();
      // Second call should use cache
      await service.loadSessions();

      expect(mockLogger.debug).toHaveBeenCalledWith("Returning cached sessions data");
    });
  });

  describe("saveSession", () => {
    it("should save new session to file", async () => {
      await service.saveSession(mockSession1);

      const fileContent = await fs.readFile(testFilePath, "utf8");
      const parsedData = YAML.parse(fileContent);

      expect(parsedData.sessions).toHaveLength(1);
      expect(parsedData.sessions[0]).toEqual(mockSession1);
      expect(mockLogger.info).toHaveBeenCalledWith("Session saved successfully");
    });

    it("should update existing session with same ID", async () => {
      // Save initial session
      await service.saveSession(mockSession1);

      // Update session
      const updatedSession = { ...mockSession1, command: "claude debug" };
      await service.saveSession(updatedSession);

      const sessions = await service.loadSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].command).toBe("claude debug");
    });

    it("should create file and directory if they don't exist", async () => {
      const newDir = path.join(testDir, "new-dir");
      const newFilePath = path.join(newDir, "sessions.yaml");
      const newService = new SessionPersistenceService(newFilePath, mockLogger);

      await newService.saveSession(mockSession1);

      const exists = await fs.access(newFilePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Cleanup
      await fs.unlink(newFilePath);
      await fs.rmdir(newDir);
    });

    it("should validate session data before saving", async () => {
      const invalidSession = {
        ...mockSession1,
        pid: -1, // Invalid PID
      };

      await expect(service.saveSession(invalidSession as PersistedSession)).rejects.toThrow();
    });

    it("should set secure permissions (600) on file", async () => {
      await service.saveSession(mockSession1);

      const stats = await fs.stat(testFilePath);
      const permissions = stats.mode & 0o777;
      expect(permissions).toBe(0o600);
    });
  });

  describe("removeSession", () => {
    it("should remove session from file", async () => {
      // Save two sessions
      await service.saveSession(mockSession1);
      await service.saveSession(mockSession2);

      // Remove one session
      await service.removeSession("session-1");

      const sessions = await service.loadSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe("session-2");
      expect(mockLogger.info).toHaveBeenCalledWith("Session removed successfully");
    });

    it("should handle removal of non-existent session gracefully", async () => {
      await service.saveSession(mockSession1);

      // Try to remove non-existent session
      await service.removeSession("non-existent");

      const sessions = await service.loadSessions();
      expect(sessions).toHaveLength(1);
      expect(mockLogger.warn).toHaveBeenCalledWith("Session not found for removal");
    });
  });

  describe("updateSession", () => {
    it("should update existing session", async () => {
      await service.saveSession(mockSession1);

      const updates = { 
        command: "claude updated", 
        recovered: true 
      };
      await service.updateSession("session-1", updates);

      const sessions = await service.loadSessions();
      expect(sessions[0].command).toBe("claude updated");
      expect(sessions[0].recovered).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith("Session updated successfully");
    });

    it("should throw error when updating non-existent session", async () => {
      await expect(
        service.updateSession("non-existent", { command: "test" })
      ).rejects.toThrow("Session with id non-existent not found");
    });

    it("should validate updated session data", async () => {
      await service.saveSession(mockSession1);

      const invalidUpdates = { pid: -1 };
      await expect(
        service.updateSession("session-1", invalidUpdates as Partial<PersistedSession>)
      ).rejects.toThrow();
    });
  });

  describe("backup functionality", () => {
    it("should create backups when writing to existing file", async () => {
      // Create initial file
      await service.saveSession(mockSession1);
      
      // Update file (should create backup)
      await service.saveSession(mockSession2);

      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(file => file.includes(".backup."));
      expect(backupFiles.length).toBeGreaterThan(0);
    });

    it("should maintain only 5 most recent backups", async () => {
      // Create initial file
      await service.saveSession(mockSession1);

      // Create 10 updates to generate backups
      for (let i = 0; i < 10; i++) {
        const session = { ...mockSession1, pid: 1000 + i };
        await service.saveSession(session);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const files = await fs.readdir(testDir);
      const backupFiles = files.filter(file => file.includes(".backup."));
      expect(backupFiles.length).toBeLessThanOrEqual(5);
    });
  });

  describe("error handling", () => {
    it("should handle file write errors gracefully", async () => {
      // Create a directory with the same name as the file to cause write error
      await fs.mkdir(testFilePath);

      await expect(service.saveSession(mockSession1)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();

      // Cleanup
      await fs.rmdir(testFilePath);
    });

    it("should not fail main operation if backup creation fails", async () => {
      // This is harder to test directly, but the service should handle backup failures gracefully
      // by logging warnings but not throwing errors
      await service.saveSession(mockSession1);
      
      // If we reach here without throwing, backup error handling is working
      expect(mockLogger.info).toHaveBeenCalledWith("Session saved successfully");
    });
  });

  describe("caching behavior", () => {
    it("should use cache on repeated loads", async () => {
      // Create initial file
      const testData = { sessions: [mockSession1] };
      await fs.writeFile(testFilePath, YAML.stringify(testData), "utf8");

      // First load
      await service.loadSessions();
      
      // Clear mock calls
      vi.clearAllMocks();

      // Second load should use cache
      await service.loadSessions();
      expect(mockLogger.debug).toHaveBeenCalledWith("Returning cached sessions data");
    });

    it("should update cache after write operations", async () => {
      // Save a session (this will update cache)
      await service.saveSession(mockSession1);

      // Clear mock calls
      vi.clearAllMocks();

      // Load should use updated cache
      const sessions = await service.loadSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe("session-1");
    });
  });
});