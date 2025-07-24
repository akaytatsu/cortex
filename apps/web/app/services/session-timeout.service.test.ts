import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { PersistedSession } from "shared-types";
import type { ISessionPersistenceService, ILogger } from "../types/services";
import { SessionTimeoutService } from "./session-timeout.service";

// Mock process.kill
const mockProcessKill = vi.fn();
vi.stubGlobal("process", {
  ...process,
  kill: mockProcessKill,
});

// Mock setTimeout and clearInterval
const mockSetInterval = vi.fn();
const mockClearInterval = vi.fn();
const mockSetTimeout = vi.fn();
vi.stubGlobal("setInterval", mockSetInterval);
vi.stubGlobal("clearInterval", mockClearInterval);
vi.stubGlobal("setTimeout", mockSetTimeout);

describe("SessionTimeoutService", () => {
  let sessionTimeoutService: SessionTimeoutService;
  let mockSessionPersistenceService: ISessionPersistenceService;
  let mockLogger: ILogger;

  const SESSION_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ILogger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      withContext: vi.fn(() => mockLogger),
    };

    // Mock ISessionPersistenceService
    mockSessionPersistenceService = {
      saveSession: vi.fn(),
      removeSession: vi.fn(),
      loadSessions: vi.fn(),
      updateSession: vi.fn(),
    };

    sessionTimeoutService = new SessionTimeoutService(
      mockSessionPersistenceService,
      mockLogger
    );
  });

  afterEach(() => {
    sessionTimeoutService.stopPeriodicCleanup();
  });

  describe("checkAndCleanupTimedOutSessions", () => {
    it("should identify expired sessions correctly", async () => {
      const now = Date.now();
      const expiredSession: PersistedSession = {
        id: "expired-session",
        workspaceName: "test-workspace",
        workspacePath: "/path/to/workspace",
        pid: 1234,
        startedAt: new Date(now - SESSION_TIMEOUT_MS - 1000).toISOString(), // 12+ hours ago
        userId: "user1",
      };

      const recentSession: PersistedSession = {
        id: "recent-session",
        workspaceName: "test-workspace-2",
        workspacePath: "/path/to/workspace2",
        pid: 5678,
        startedAt: new Date(now - 1000 * 60 * 60).toISOString(), // 1 hour ago
        userId: "user2",
      };

      mockSessionPersistenceService.loadSessions = vi
        .fn()
        .mockResolvedValue([expiredSession, recentSession]);

      // Mock process.kill to throw ESRCH (process not found) to avoid timeout issues
      const esrchError = new Error("No such process") as NodeJS.ErrnoException;
      esrchError.code = "ESRCH";
      mockProcessKill.mockImplementation(() => {
        throw esrchError;
      });

      await sessionTimeoutService.checkAndCleanupTimedOutSessions();

      // Should check the expired session process
      expect(mockProcessKill).toHaveBeenCalledWith(1234, 0);
      // Should remove expired session from persistence
      expect(mockSessionPersistenceService.removeSession).toHaveBeenCalledWith(
        "expired-session"
      );

      // Should not touch the recent session
      expect(mockProcessKill).not.toHaveBeenCalledWith(5678, expect.anything());
      expect(
        mockSessionPersistenceService.removeSession
      ).not.toHaveBeenCalledWith("recent-session");
    });

    it("should not cleanup sessions younger than 12 hours", async () => {
      const now = Date.now();
      const recentSession: PersistedSession = {
        id: "recent-session",
        workspaceName: "test-workspace",
        workspacePath: "/path/to/workspace",
        pid: 1234,
        startedAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
        userId: "user1",
      };

      mockSessionPersistenceService.loadSessions = vi
        .fn()
        .mockResolvedValue([recentSession]);

      await sessionTimeoutService.checkAndCleanupTimedOutSessions();

      expect(mockProcessKill).not.toHaveBeenCalled();
      expect(
        mockSessionPersistenceService.removeSession
      ).not.toHaveBeenCalled();
    });

    it("should handle invalid PIDs gracefully", async () => {
      const now = Date.now();
      const expiredSession: PersistedSession = {
        id: "expired-session",
        workspaceName: "test-workspace",
        workspacePath: "/path/to/workspace",
        pid: 9999,
        startedAt: new Date(now - SESSION_TIMEOUT_MS - 1000).toISOString(),
        userId: "user1",
      };

      mockSessionPersistenceService.loadSessions = vi
        .fn()
        .mockResolvedValue([expiredSession]);

      // Mock process.kill to throw ESRCH error (process not found)
      const esrchError = new Error("No such process") as NodeJS.ErrnoException;
      esrchError.code = "ESRCH";
      mockProcessKill.mockImplementation(() => {
        throw esrchError;
      });

      await sessionTimeoutService.checkAndCleanupTimedOutSessions();

      // Should still remove the session even if process doesn't exist
      expect(mockSessionPersistenceService.removeSession).toHaveBeenCalledWith(
        "expired-session"
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Process already terminated or does not exist"
      );
    });

    it("should handle permission errors gracefully", async () => {
      const now = Date.now();
      const expiredSession: PersistedSession = {
        id: "expired-session",
        workspaceName: "test-workspace",
        workspacePath: "/path/to/workspace",
        pid: 1234,
        startedAt: new Date(now - SESSION_TIMEOUT_MS - 1000).toISOString(),
        userId: "user1",
      };

      mockSessionPersistenceService.loadSessions = vi
        .fn()
        .mockResolvedValue([expiredSession]);

      // Mock process.kill to throw EPERM error (permission denied)
      const epermError = new Error(
        "Operation not permitted"
      ) as NodeJS.ErrnoException;
      epermError.code = "EPERM";
      mockProcessKill.mockImplementation(() => {
        throw epermError;
      });

      // Should not throw - errors are logged but cleanup continues
      await sessionTimeoutService.checkAndCleanupTimedOutSessions();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Permission denied when trying to terminate process",
        expect.objectContaining({
          error: "Operation not permitted",
        })
      );

      // Session should not be removed if process termination fails with permission error
      expect(
        mockSessionPersistenceService.removeSession
      ).not.toHaveBeenCalled();
    });

    it("should handle empty sessions array", async () => {
      mockSessionPersistenceService.loadSessions = vi
        .fn()
        .mockResolvedValue([]);

      await sessionTimeoutService.checkAndCleanupTimedOutSessions();

      expect(mockProcessKill).not.toHaveBeenCalled();
      expect(
        mockSessionPersistenceService.removeSession
      ).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "No expired sessions found"
      );
    });
  });

  describe("periodic cleanup", () => {
    it("should start periodic cleanup with default interval", () => {
      const mockTimer = Symbol("timer");
      mockSetInterval.mockReturnValue(mockTimer as unknown as NodeJS.Timeout);

      const timer = sessionTimeoutService.startPeriodicCleanup();

      expect(mockSetInterval).toHaveBeenCalledWith(
        expect.any(Function),
        30 * 60 * 1000 // 30 minutes default
      );
      expect(timer).toBe(mockTimer);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Starting periodic session timeout cleanup",
        expect.objectContaining({
          intervalMs: 30 * 60 * 1000,
          intervalMinutes: 30,
        })
      );
    });

    it("should start periodic cleanup with custom interval", () => {
      const customInterval = 10 * 60 * 1000; // 10 minutes
      const mockTimer = Symbol("timer");
      mockSetInterval.mockReturnValue(mockTimer as unknown as NodeJS.Timeout);

      sessionTimeoutService.startPeriodicCleanup(customInterval);

      expect(mockSetInterval).toHaveBeenCalledWith(
        expect.any(Function),
        customInterval
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Starting periodic session timeout cleanup",
        expect.objectContaining({
          intervalMs: customInterval,
          intervalMinutes: 10,
        })
      );
    });

    it("should stop existing timer before starting new one (singleton pattern)", () => {
      const mockTimer1 = Symbol("timer1");
      const mockTimer2 = Symbol("timer2");

      mockSetInterval
        .mockReturnValueOnce(mockTimer1 as unknown as NodeJS.Timeout)
        .mockReturnValueOnce(mockTimer2 as unknown as NodeJS.Timeout);

      // Start first timer
      sessionTimeoutService.startPeriodicCleanup();
      expect(mockClearInterval).not.toHaveBeenCalled();

      // Start second timer - should clear first one
      sessionTimeoutService.startPeriodicCleanup();
      expect(mockClearInterval).toHaveBeenCalledWith(mockTimer1);
    });

    it("should stop periodic cleanup", () => {
      const mockTimer = Symbol("timer");
      mockSetInterval.mockReturnValue(mockTimer as unknown as NodeJS.Timeout);

      // Start cleanup
      sessionTimeoutService.startPeriodicCleanup();

      // Stop cleanup
      sessionTimeoutService.stopPeriodicCleanup();

      expect(mockClearInterval).toHaveBeenCalledWith(mockTimer);
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Periodic session timeout cleanup stopped"
      );
    });

    it("should handle stopping when no timer is active", () => {
      sessionTimeoutService.stopPeriodicCleanup();

      expect(mockClearInterval).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        "No periodic cleanup timer to stop"
      );
    });

    it("should continue periodic cleanup even if individual cleanup fails", async () => {
      const mockTimer = Symbol("timer");
      let periodicCallback: () => Promise<void>;

      mockSetInterval.mockImplementation(callback => {
        periodicCallback = callback;
        return mockTimer as unknown as NodeJS.Timeout;
      });

      // Mock checkAndCleanupTimedOutSessions to throw error
      const checkAndCleanupSpy = vi
        .spyOn(sessionTimeoutService, "checkAndCleanupTimedOutSessions")
        .mockRejectedValue(new Error("Cleanup failed"));

      sessionTimeoutService.startPeriodicCleanup();

      // Execute the periodic callback
      await periodicCallback!();

      expect(checkAndCleanupSpy).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error during periodic cleanup",
        expect.any(Error)
      );

      // Timer should not be cleared
      expect(mockClearInterval).not.toHaveBeenCalled();
    });
  });
});
