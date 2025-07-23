import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CliService } from "./cli.service";
import type { ISessionPersistenceService } from "../types/services";
import type { PersistedSession } from "shared-types";
import { spawn } from "child_process";
import { EventEmitter } from "events";

vi.mock("child_process");

// Mock SessionPersistenceService
const mockSessionPersistence: ISessionPersistenceService = {
  saveSession: vi.fn(),
  removeSession: vi.fn(),
  loadSessions: vi.fn(),
  updateSession: vi.fn(),
};

class MockChildProcess extends EventEmitter {
  pid: number;
  stdin: { write: ReturnType<typeof vi.fn> };
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: ReturnType<typeof vi.fn>;

  constructor(pid: number) {
    super();
    this.pid = pid;
    this.stdin = { write: vi.fn() };
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.kill = vi.fn();
  }
}

// Test fixtures - using process.cwd() to ensure valid paths
const validWorkspacePath = process.cwd();
const mockSession1: PersistedSession = {
  id: "session-1",
  workspaceName: "test-workspace",
  workspacePath: validWorkspacePath,
  pid: 12345,
  startedAt: "2025-01-15T10:00:00.000Z",
  agentName: "dev",
  command: "claude code",
  userId: "user-1",
};

const mockSession2: PersistedSession = {
  id: "session-2",
  workspaceName: "another-workspace",
  workspacePath: validWorkspacePath,
  pid: 67890,
  startedAt: "2025-01-15T11:00:00.000Z",
  userId: "user-2",
};

describe("CliService - Session Persistence Integration", () => {
  let cliService: CliService;

  beforeEach(() => {
    vi.clearAllMocks();
    cliService = new CliService(mockSessionPersistence);

    // Mock process.kill to control which processes appear "active"
    vi.spyOn(process, 'kill').mockImplementation((pid: number, signal?: string | number) => {
      if (signal === 0) {
        // Return true for active processes, throw for inactive
        if (pid === 12345) {
          return true; // Active process
        } else {
          const error = new Error('No such process') as NodeJS.ErrnoException;
          error.code = 'ESRCH';
          throw error;
        }
      }
      return true;
    });
  });

  afterEach(() => {
    cliService.cleanup();
    vi.restoreAllMocks();
  });

  describe("startProcess with persistence", () => {
    it("should save session to persistence when process starts successfully", async () => {
      const mockProcess = new MockChildProcess(12345);
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as unknown as ReturnType<typeof spawn>);

      await cliService.startProcess(
        validWorkspacePath,
        "test-workspace",
        "session-1",
        "user-1",
        "claude code",
        "dev"
      );

      expect(mockSessionPersistence.saveSession).toHaveBeenCalledWith({
        id: "session-1",
        workspaceName: "test-workspace",
        workspacePath: validWorkspacePath,
        pid: 12345,
        startedAt: expect.any(String),
        agentName: "dev",
        command: "claude code",
        userId: "user-1",
      });
    });

    it("should not fail main operation if persistence save fails", async () => {
      const mockProcess = new MockChildProcess(12345);
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as unknown as ReturnType<typeof spawn>);
      
      // Make persistence fail
      vi.mocked(mockSessionPersistence.saveSession).mockRejectedValue(
        new Error("Persistence failed")
      );

      const result = await cliService.startProcess(
        validWorkspacePath,
        "test-workspace",
        "session-1",
        "user-1",
        "claude code"
      );

      // Should still succeed despite persistence failure
      expect(result).toEqual({
        pid: 12345,
        sessionId: "session-1",
      });
    });
  });

  describe("stopProcess with persistence", () => {
    it("should remove session from persistence when process stops", async () => {
      const mockProcess = new MockChildProcess(12345);
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as unknown as ReturnType<typeof spawn>);

      // Start process
      await cliService.startProcess(
        validWorkspacePath,
        "test-workspace",
        "session-1",
        "user-1"
      );

      // Stop process
      const result = cliService.stopProcess("session-1");

      expect(result).toBe(true);
      expect(mockSessionPersistence.removeSession).toHaveBeenCalledWith("session-1");
    });

    it("should remove session when process exits naturally", async () => {
      const mockProcess = new MockChildProcess(12345);
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as unknown as ReturnType<typeof spawn>);

      await cliService.startProcess(
        validWorkspacePath,
        "test-workspace",
        "session-1",
        "user-1"
      );

      // Simulate process exit
      mockProcess.emit('exit', 0, null);

      // Give time for async removal
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSessionPersistence.removeSession).toHaveBeenCalledWith("session-1");
    });

    it("should remove session when process errors", async () => {
      const mockProcess = new MockChildProcess(12345);
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as unknown as ReturnType<typeof spawn>);

      await cliService.startProcess(
        validWorkspacePath,
        "test-workspace",
        "session-1",
        "user-1"
      );

      // Simulate process error
      mockProcess.emit('error', new Error('Process failed'));

      // Give time for async removal
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSessionPersistence.removeSession).toHaveBeenCalledWith("session-1");
    });
  });

  describe("recoverSessions", () => {
    it("should recover active processes and mark as recovered", async () => {
      // Setup mock persisted sessions
      vi.mocked(mockSessionPersistence.loadSessions).mockResolvedValue([
        mockSession1, // PID 12345 will be active
        mockSession2, // PID 67890 will be inactive
      ]);

      await cliService.recoverSessions();

      // Should update active session as recovered
      expect(mockSessionPersistence.updateSession).toHaveBeenCalledWith(
        "session-1",
        { recovered: true }
      );

      // Should remove orphaned session
      expect(mockSessionPersistence.removeSession).toHaveBeenCalledWith("session-2");

      // Should have one active process
      const activeProcesses = cliService.getAllActiveProcesses();
      expect(activeProcesses).toHaveLength(1);
      expect(activeProcesses[0].sessionId).toBe("session-1");
      expect(activeProcesses[0].pid).toBe(12345);
    });

    it("should handle empty persisted sessions", async () => {
      vi.mocked(mockSessionPersistence.loadSessions).mockResolvedValue([]);

      await cliService.recoverSessions();

      expect(mockSessionPersistence.updateSession).not.toHaveBeenCalled();
      expect(mockSessionPersistence.removeSession).not.toHaveBeenCalled();

      const activeProcesses = cliService.getAllActiveProcesses();
      expect(activeProcesses).toHaveLength(0);
    });

    it("should remove problematic sessions during recovery", async () => {
      const problematicSession = {
        ...mockSession1,
        id: "problematic-session",
        pid: 99999,
      };

      vi.mocked(mockSessionPersistence.loadSessions).mockResolvedValue([problematicSession]);
      
      // Make updateSession fail
      vi.mocked(mockSessionPersistence.updateSession).mockRejectedValue(
        new Error("Update failed")
      );

      await cliService.recoverSessions();

      // Should try to remove the problematic session
      expect(mockSessionPersistence.removeSession).toHaveBeenCalledWith("problematic-session");
    });

    it("should handle process check errors gracefully", async () => {
      const sessionWithBadPid = {
        ...mockSession1,
        pid: null as unknown as number, // Invalid PID
      };

      vi.mocked(mockSessionPersistence.loadSessions).mockResolvedValue([sessionWithBadPid]);

      await cliService.recoverSessions();

      // Should remove the session with invalid PID
      expect(mockSessionPersistence.removeSession).toHaveBeenCalledWith("session-1");
    });

    it("should continue recovery even if persistence operations fail", async () => {
      vi.mocked(mockSessionPersistence.loadSessions).mockResolvedValue([mockSession1, mockSession2]);
      
      // Make all persistence operations fail
      vi.mocked(mockSessionPersistence.updateSession).mockRejectedValue(new Error("Failed"));
      vi.mocked(mockSessionPersistence.removeSession).mockRejectedValue(new Error("Failed"));

      // Should not throw
      await expect(cliService.recoverSessions()).resolves.not.toThrow();
    });

    it("should throw if initial load fails", async () => {
      vi.mocked(mockSessionPersistence.loadSessions).mockRejectedValue(
        new Error("Load failed")
      );

      await expect(cliService.recoverSessions()).rejects.toThrow("Load failed");
    });
  });

  describe("process info with new fields", () => {
    it("should return process info with all fields after recovery", async () => {
      vi.mocked(mockSessionPersistence.loadSessions).mockResolvedValue([mockSession1]);

      await cliService.recoverSessions();

      const processInfo = cliService.getProcessInfo("session-1");
      
      expect(processInfo).toEqual({
        pid: 12345,
        workspacePath: validWorkspacePath,
        workspaceName: "test-workspace",
        userId: "user-1",
        agentName: "dev",
        command: "claude code",
        startTime: expect.any(Date),
      });
    });

    it("should return all active processes with complete info", async () => {
      vi.mocked(mockSessionPersistence.loadSessions).mockResolvedValue([mockSession1]);

      await cliService.recoverSessions();

      const activeProcesses = cliService.getAllActiveProcesses();
      
      expect(activeProcesses[0]).toEqual({
        sessionId: "session-1",
        pid: 12345,
        workspacePath: validWorkspacePath,
        workspaceName: "test-workspace",
        userId: "user-1",
        agentName: "dev",
        command: "claude code",
        startTime: expect.any(Date),
      });
    });
  });
});