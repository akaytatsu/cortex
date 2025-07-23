import type { PersistedSession } from "shared-types";
import type { ILogger, ISessionTimeoutService, ISessionPersistenceService } from "../types/services";
import { createServiceLogger } from "../lib/logger";

// Timeout configuration constants
const SESSION_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 hours
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes check interval
const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 5000; // 5 seconds for SIGTERM before SIGKILL

export class SessionTimeoutService implements ISessionTimeoutService {
  private logger: ILogger;
  private sessionPersistenceService: ISessionPersistenceService;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    sessionPersistenceService: ISessionPersistenceService,
    logger?: ILogger
  ) {
    this.logger = logger || createServiceLogger("SessionTimeoutService");
    this.sessionPersistenceService = sessionPersistenceService;
  }

  async checkAndCleanupTimedOutSessions(): Promise<void> {
    this.logger.debug("Starting session timeout cleanup check");

    try {
      const sessions = await this.sessionPersistenceService.loadSessions();
      const now = Date.now();
      const expiredSessions: PersistedSession[] = [];

      // Identify expired sessions
      for (const session of sessions) {
        const sessionStartTime = new Date(session.startedAt).getTime();
        const sessionAge = now - sessionStartTime;

        if (sessionAge > SESSION_TIMEOUT_MS) {
          expiredSessions.push(session);
          this.logger.info("Session marked for cleanup due to timeout", {
            sessionId: session.id,
            workspaceName: session.workspaceName,
            pid: session.pid,
            ageHours: Math.round(sessionAge / (60 * 60 * 1000) * 10) / 10,
          });
        }
      }

      if (expiredSessions.length === 0) {
        this.logger.debug("No expired sessions found");
        return;
      }

      this.logger.info("Found expired sessions for cleanup", {
        expiredCount: expiredSessions.length,
        totalSessions: sessions.length,
      });

      // Cleanup expired sessions
      for (const session of expiredSessions) {
        await this.cleanupExpiredSession(session);
      }

      this.logger.info("Session timeout cleanup completed", {
        cleanedSessions: expiredSessions.length,
      });
    } catch (error) {
      this.logger.error("Error during session timeout cleanup", error as Error);
      throw error;
    }
  }

  private async cleanupExpiredSession(session: PersistedSession): Promise<void> {
    const sessionLogger = this.logger.withContext({
      sessionId: session.id,
      pid: session.pid,
      workspaceName: session.workspaceName,
    });

    try {
      // First, try to terminate the process gracefully with SIGTERM
      await this.terminateProcess(session.pid, sessionLogger);

      // Remove session from persistence
      await this.sessionPersistenceService.removeSession(session.id);

      sessionLogger.info("Expired session cleaned up successfully");
    } catch (error) {
      sessionLogger.error("Failed to cleanup expired session", error as Error);
      // Continue with other sessions even if one fails
    }
  }

  private async terminateProcess(pid: number, logger: ILogger): Promise<void> {
    try {
      // Check if process exists first
      process.kill(pid, 0);
      logger.debug("Process found, attempting graceful termination with SIGTERM");

      // Send SIGTERM for graceful shutdown
      process.kill(pid, 'SIGTERM');

      // Wait for graceful shutdown with timeout
      const shutdownPromise = this.waitForProcessTermination(pid, logger);
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(resolve, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
      });

      await Promise.race([shutdownPromise, timeoutPromise]);

      // Check if process is still running after graceful timeout
      try {
        process.kill(pid, 0);
        logger.warn("Process did not respond to SIGTERM, using SIGKILL", {
          gracefulTimeoutMs: GRACEFUL_SHUTDOWN_TIMEOUT_MS,
        });
        process.kill(pid, 'SIGKILL');
        logger.info("Process terminated with SIGKILL");
      } catch {
        // Process already terminated gracefully
        logger.info("Process terminated gracefully with SIGTERM");
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
        logger.debug("Process already terminated or does not exist");
      } else if ((error as NodeJS.ErrnoException).code === 'EPERM') {
        logger.warn("Permission denied when trying to terminate process", {
          error: (error as Error).message,
        });
        throw new Error(`Permission denied when terminating process ${pid}`);
      } else {
        logger.error("Unexpected error when terminating process", error as Error);
        throw error;
      }
    }
  }

  private async waitForProcessTermination(pid: number, logger: ILogger): Promise<void> {
    return new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        try {
          process.kill(pid, 0);
          // Process still exists, continue waiting
        } catch {
          // Process no longer exists
          logger.debug("Process terminated successfully");
          clearInterval(checkInterval);
          resolve();
        }
      }, 100); // Check every 100ms
    });
  }

  startPeriodicCleanup(intervalMs: number = CLEANUP_INTERVAL_MS): NodeJS.Timeout {
    // Stop any existing timer to ensure only one instance is active
    if (this.cleanupTimer) {
      this.stopPeriodicCleanup();
    }

    this.logger.info("Starting periodic session timeout cleanup", {
      intervalMs,
      intervalMinutes: Math.round(intervalMs / 60000),
    });

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.checkAndCleanupTimedOutSessions();
      } catch (error) {
        this.logger.error("Error during periodic cleanup", error as Error);
        // Don't stop the timer - continue with next scheduled cleanup
      }
    }, intervalMs);

    return this.cleanupTimer;
  }

  stopPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      this.logger.info("Periodic session timeout cleanup stopped");
    } else {
      this.logger.debug("No periodic cleanup timer to stop");
    }
  }
}