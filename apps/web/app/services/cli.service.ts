import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import { createServiceLogger } from "../lib/logger";
import { SessionPersistenceService } from "./session-persistence.service";
import type { ISessionPersistenceService } from "../types/services";
import type { PersistedSession } from "shared-types";

export class CliServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "CliServiceError";
  }
}

interface ClaudeProcess {
  pid: number;
  process: ChildProcess;
  workspacePath: string;
  workspaceName: string;
  userId: string;
  agentName?: string;
  command?: string;
  startTime: Date;
  forceKillTimeout?: NodeJS.Timeout;
}

const logger = createServiceLogger("CliService");

export class CliService {
  private activeProcesses = new Map<string, ClaudeProcess>();
  private sessionPersistence: ISessionPersistenceService;
  private readonly ALLOWED_COMMANDS = ["claude"];
  private readonly DANGEROUS_CHARS_REGEX = /[;&|$`\\<>]/;
  private readonly COMMAND_TIMEOUT = 30000; // 30 seconds

  constructor(sessionPersistence?: ISessionPersistenceService) {
    this.sessionPersistence = sessionPersistence || new SessionPersistenceService();
  }

  private validateWorkspacePath(workspacePath: string): string {
    const normalizedPath = path.resolve(workspacePath);
    const projectRoot = path.resolve(process.cwd(), "../..");

    if (!normalizedPath.startsWith(projectRoot)) {
      throw new CliServiceError(
        "Workspace path must be within project boundaries",
        "INVALID_WORKSPACE_PATH"
      );
    }

    return normalizedPath;
  }

  private validateAndSanitizeCommand(command?: string): string[] {
    if (!command || command.trim() === "") {
      return ["claude"];
    }

    const trimmedCommand = command.trim();
    const parts = trimmedCommand.split(/\s+/);
    const baseCommand = parts[0];

    if (!this.ALLOWED_COMMANDS.includes(baseCommand)) {
      logger.warn("Attempted to use disallowed command", { command: baseCommand });
      throw new CliServiceError(
        `Command '${baseCommand}' is not allowed. Only 'claude' is permitted.`,
        "INVALID_COMMAND"
      );
    }

    if (this.DANGEROUS_CHARS_REGEX.test(trimmedCommand)) {
      logger.warn("Attempted to use dangerous characters in command", { command: trimmedCommand });
      throw new CliServiceError(
        "Command contains dangerous characters",
        "DANGEROUS_COMMAND"
      );
    }

    const sanitizedParts = parts.map(part => {
      return part.replace(/["'\\]/g, '');
    });

    return sanitizedParts;
  }

  async startProcess(
    workspacePath: string,
    workspaceName: string,
    sessionId: string,
    userId: string,
    command?: string,
    agentName?: string
  ): Promise<{ pid: number; sessionId: string }> {
    const sessionLogger = logger.withContext({ sessionId, workspacePath, command });

    try {
      sessionLogger.info("Starting Claude Code process");

      const validatedPath = this.validateWorkspacePath(workspacePath);
      const sanitizedCommand = this.validateAndSanitizeCommand(command);

      if (this.activeProcesses.has(sessionId)) {
        throw new CliServiceError(
          "Process already exists for this session",
          "PROCESS_EXISTS"
        );
      }

      const childProcess = spawn(sanitizedCommand[0], sanitizedCommand.slice(1), {
        cwd: validatedPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PWD: validatedPath,
        },
        timeout: this.COMMAND_TIMEOUT,
      });

      if (!childProcess.pid) {
        throw new CliServiceError(
          "Failed to spawn Claude Code process",
          "SPAWN_FAILED"
        );
      }

      const claudeProcess: ClaudeProcess = {
        pid: childProcess.pid,
        process: childProcess,
        workspacePath: validatedPath,
        workspaceName,
        userId,
        agentName,
        command,
        startTime: new Date(),
      };

      this.activeProcesses.set(sessionId, claudeProcess);

      // Save session to persistence with error handling
      try {
        const persistedSession: PersistedSession = {
          id: sessionId,
          workspaceName,
          workspacePath: validatedPath,
          pid: childProcess.pid,
          startedAt: claudeProcess.startTime.toISOString(),
          agentName,
          command,
          userId,
        };

        await this.sessionPersistence.saveSession(persistedSession);
        sessionLogger.debug("Session saved to persistence", { sessionId });
      } catch (persistenceError) {
        // Log error but don't fail the main operation
        sessionLogger.warn("Failed to save session to persistence", {
          error: persistenceError instanceof Error ? persistenceError.message : String(persistenceError),
          sessionId,
        });
      }

      childProcess.on('exit', (code, signal) => {
        sessionLogger.info("Claude Code process exited", { exitCode: code, signal });
        const process = this.activeProcesses.get(sessionId);
        if (process?.forceKillTimeout) {
          clearTimeout(process.forceKillTimeout);
        }
        this.activeProcesses.delete(sessionId);

        // Remove session from persistence with error handling
        this.removeSessionFromPersistence(sessionId, sessionLogger);
      });

      childProcess.on('error', (error) => {
        sessionLogger.error("Claude Code process error", error);
        const process = this.activeProcesses.get(sessionId);
        if (process?.forceKillTimeout) {
          clearTimeout(process.forceKillTimeout);
        }
        this.activeProcesses.delete(sessionId);

        // Remove session from persistence with error handling
        this.removeSessionFromPersistence(sessionId, sessionLogger);
      });

      sessionLogger.info("Claude Code process started successfully", { pid: childProcess.pid });
      
      return {
        pid: childProcess.pid,
        sessionId,
      };
    } catch (error) {
      sessionLogger.error("Failed to start Claude Code process", error as Error);
      throw error;
    }
  }

  stopProcess(sessionId: string): boolean {
    const claudeProcess = this.activeProcesses.get(sessionId);
    if (!claudeProcess) {
      return false;
    }

    const sessionLogger = logger.withContext({ sessionId, pid: claudeProcess.pid });

    try {
      sessionLogger.info("Stopping Claude Code process");

      claudeProcess.process.kill('SIGTERM');

      // Force kill after 5 seconds if process doesn't terminate gracefully
      const forceKillTimeout = setTimeout(() => {
        if (this.activeProcesses.has(sessionId)) {
          sessionLogger.warn("Process did not terminate gracefully, sending SIGKILL");
          claudeProcess.process.kill('SIGKILL');
        }
      }, 5000);

      // Store the timeout so it can be cleared later if process exits gracefully
      claudeProcess.forceKillTimeout = forceKillTimeout;
      this.activeProcesses.set(sessionId, claudeProcess);

      // Remove session from persistence with error handling
      this.removeSessionFromPersistence(sessionId, sessionLogger);
      
      sessionLogger.info("Claude Code process stopped successfully");
      
      return true;
    } catch (error) {
      sessionLogger.error("Error stopping Claude Code process", error as Error);
      return false;
    }
  }

  private async removeSessionFromPersistence(sessionId: string, sessionLogger: ILogger): Promise<void> {
    try {
      await this.sessionPersistence.removeSession(sessionId);
      sessionLogger.debug("Session removed from persistence", { sessionId });
    } catch (persistenceError) {
      // Log error but don't fail the main operation
      sessionLogger.warn("Failed to remove session from persistence", {
        error: persistenceError instanceof Error ? persistenceError.message : String(persistenceError),
        sessionId,
      });
    }
  }

  getProcess(sessionId: string): ChildProcess | null {
    const claudeProcess = this.activeProcesses.get(sessionId);
    return claudeProcess?.process || null;
  }

  getProcessInfo(sessionId: string): { 
    pid: number; 
    workspacePath: string; 
    workspaceName: string;
    userId: string;
    agentName?: string;
    command?: string;
    startTime: Date;
  } | null {
    const claudeProcess = this.activeProcesses.get(sessionId);
    if (!claudeProcess) {
      return null;
    }

    return {
      pid: claudeProcess.pid,
      workspacePath: claudeProcess.workspacePath,
      workspaceName: claudeProcess.workspaceName,
      userId: claudeProcess.userId,
      agentName: claudeProcess.agentName,
      command: claudeProcess.command,
      startTime: claudeProcess.startTime,
    };
  }

  getAllActiveProcesses(): Array<{ 
    sessionId: string; 
    pid: number; 
    workspacePath: string; 
    workspaceName: string;
    userId: string;
    agentName?: string;
    command?: string;
    startTime: Date;
  }> {
    return Array.from(this.activeProcesses.entries()).map(([sessionId, process]) => ({
      sessionId,
      pid: process.pid,
      workspacePath: process.workspacePath,
      workspaceName: process.workspaceName,
      userId: process.userId,
      agentName: process.agentName,
      command: process.command,
      startTime: process.startTime,
    }));
  }

  async recoverSessions(): Promise<void> {
    const recoveryLogger = logger.withContext({ operation: "session-recovery" });

    try {
      recoveryLogger.info("Starting session recovery process");

      const persistedSessions = await this.sessionPersistence.loadSessions();
      recoveryLogger.info("Loaded persisted sessions", { count: persistedSessions.length });

      let recoveredCount = 0;
      let orphanedCount = 0;

      for (const session of persistedSessions) {
        const sessionLogger = recoveryLogger.withContext({ 
          sessionId: session.id, 
          pid: session.pid,
          workspaceName: session.workspaceName,
        });

        try {
          // Check if process is still active using process.kill(pid, 0)
          const isProcessActive = this.isProcessActive(session.pid);
          
          if (isProcessActive) {
            // Process is active, re-associate it
            const claudeProcess: ClaudeProcess = {
              pid: session.pid,
              process: null as unknown as ChildProcess, // We can't recover the actual ChildProcess object
              workspacePath: session.workspacePath,
              workspaceName: session.workspaceName,
              userId: session.userId,
              agentName: session.agentName,
              command: session.command,
              startTime: new Date(session.startedAt),
            };

            this.activeProcesses.set(session.id, claudeProcess);

            // Mark session as recovered in persistence
            await this.sessionPersistence.updateSession(session.id, { recovered: true });
            
            recoveredCount++;
            sessionLogger.info("Session recovered successfully", {
              recoveredAt: new Date().toISOString(),
            });
          } else {
            // Process is orphaned, remove from persistence
            await this.sessionPersistence.removeSession(session.id);
            orphanedCount++;
            sessionLogger.info("Orphaned session removed", {
              reason: "Process no longer exists",
            });
          }
        } catch (error) {
          sessionLogger.error("Error during session recovery", error as Error);
          // Try to remove the problematic session from persistence
          try {
            await this.sessionPersistence.removeSession(session.id);
            orphanedCount++;
          } catch (removeError) {
            sessionLogger.error("Failed to remove problematic session", removeError as Error);
          }
        }
      }

      recoveryLogger.info("Session recovery completed", {
        totalSessions: persistedSessions.length,
        recovered: recoveredCount,
        orphaned: orphanedCount,
      });

    } catch (error) {
      recoveryLogger.error("Failed to recover sessions", error as Error);
      throw error;
    }
  }

  private isProcessActive(pid: number): boolean {
    try {
      // process.kill(pid, 0) doesn't kill the process, just checks if it exists
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // If process doesn't exist, process.kill throws ESRCH error
      return false;
    }
  }

  cleanup(): void {
    logger.info("Cleaning up all Claude Code processes", { count: this.activeProcesses.size });
    
    // Clear all timeouts before stopping processes to prevent memory leaks
    for (const [sessionId, process] of this.activeProcesses.entries()) {
      if (process.forceKillTimeout) {
        clearTimeout(process.forceKillTimeout);
      }
      this.stopProcess(sessionId);
    }
  }
}

export const cliService = new CliService();