import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import { createServiceLogger } from "../lib/logger";
import { SessionPersistenceService } from "./session-persistence.service";
import { imageService } from "./image.service";
import type { ISessionPersistenceService, ILogger } from "../types/services";
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

interface ClaudeStreamResponse {
  type: 'system' | 'message' | 'tool_use' | 'tool_result' | 'error' | 'assistant' | 'result';
  subtype?: string;
  session_id?: string;
  role?: 'user' | 'assistant';
  content?: Array<{type: string; text?: string}> | string;
  name?: string;
  input?: any;
  message?: {
    content: Array<{type: string; text?: string}>;
    role?: string;
  };
  result?: string;
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
  sessionId?: string;
  resumeSessionId?: string;
  claudeSessionId?: string;
}

const logger = createServiceLogger("CliService");

export class CliService {
  private activeProcesses = new Map<string, ClaudeProcess>();
  private sessionPersistence: ISessionPersistenceService;
  private claudeSessions = new Map<string, string>(); // sessionId -> claudeSessionId
  private readonly ALLOWED_COMMANDS = ["claude"];
  private readonly DANGEROUS_CHARS_REGEX = /[;&|$`\\<>]/;
  private readonly COMMAND_TIMEOUT = parseInt(process.env.CLI_COMMAND_TIMEOUT || "300000", 10); // 5 minutes (300,000ms)

  constructor(sessionPersistence?: ISessionPersistenceService) {
    this.sessionPersistence =
      sessionPersistence || new SessionPersistenceService();
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

  private validateAndSanitizeCommand(
    command?: string, 
    resumeSessionId?: string,
    imageIds?: string[]
  ): { executable: string; args: string[] } {
    const baseArgs = ["--output-format", "stream-json", "--verbose"];
    
    // Handle resume session case
    if (resumeSessionId) {
      const args = [...baseArgs, "--resume", resumeSessionId, "--print", command || "Continue"];
      
      // Add image paths if provided
      if (imageIds && imageIds.length > 0) {
        for (const imageId of imageIds) {
          const imagePath = imageService.getTempImagePath(imageId);
          if (imagePath) {
            args.push(imagePath);
          } else {
            logger.warn("Image not found for ID", { imageId });
          }
        }
      }
      
      return {
        executable: "claude",
        args
      };
    }
    
    // Handle new session with command
    if (command && command.trim() !== "") {
      const trimmedCommand = command.trim();
      const parts = trimmedCommand.split(/\s+/);
      const baseCommand = parts[0];

      // Only validate if it starts with a command, otherwise treat as message
      if (this.ALLOWED_COMMANDS.includes(baseCommand)) {
        // This is a claude command
        if (this.DANGEROUS_CHARS_REGEX.test(trimmedCommand)) {
          logger.warn("Attempted to use dangerous characters in command", {
            command: trimmedCommand,
          });
          throw new CliServiceError(
            "Command contains dangerous characters",
            "DANGEROUS_COMMAND"
          );
        }
        
        // Extract the message part after 'claude'
        const message = parts.slice(1).join(' ') || "Hello, Claude!";
        const args = [...baseArgs, "--print", message];
        
        // Add image paths if provided
        if (imageIds && imageIds.length > 0) {
          for (const imageId of imageIds) {
            const imagePath = imageService.getTempImagePath(imageId);
            if (imagePath) {
              args.push(imagePath);
            } else {
              logger.warn("Image not found for ID", { imageId });
            }
          }
        }
        
        return {
          executable: "claude",
          args
        };
      } else {
        // This is a user message, not a command - treat as Claude message
        const args = [...baseArgs, "--print", trimmedCommand];
        
        // Add image paths if provided
        if (imageIds && imageIds.length > 0) {
          for (const imageId of imageIds) {
            const imagePath = imageService.getTempImagePath(imageId);
            if (imagePath) {
              args.push(imagePath);
            } else {
              logger.warn("Image not found for ID", { imageId });
            }
          }
        }
        
        return {
          executable: "claude",
          args
        };
      }
    }
    
    // Default interactive claude session  
    const args = [...baseArgs];
    
    // Add image paths if provided
    if (imageIds && imageIds.length > 0) {
      for (const imageId of imageIds) {
        const imagePath = imageService.getTempImagePath(imageId);
        if (imagePath) {
          args.push(imagePath);
        } else {
          logger.warn("Image not found for ID", { imageId });
        }
      }
    }
    
    return {
      executable: "claude",
      args
    };
  }

  private getAdaptiveTimeout(command?: string): number {
    if (!command) {
      return this.COMMAND_TIMEOUT;
    }

    const trimmedCommand = command.trim().toLowerCase();
    
    // Longer timeout for complex operations
    if (trimmedCommand.includes("--help") || trimmedCommand.includes("-h")) {
      return 30000; // 30 seconds for help commands
    }
    
    if (trimmedCommand.includes("--print") || trimmedCommand.includes("-p")) {
      return 120000; // 2 minutes for print operations
    }
    
    if (trimmedCommand.includes("--continue") || trimmedCommand.includes("-c")) {
      return 180000; // 3 minutes for continue operations
    }
    
    // Default timeout for interactive sessions
    return this.COMMAND_TIMEOUT;
  }

  async startProcess(
    workspacePath: string,
    sessionId: string,
    command?: string,
    customTimeout?: number,
    resumeSessionId?: string,
    imageIds?: string[]
  ): Promise<{ pid: number; sessionId: string; claudeSessionId?: string }> {
    const timeoutToUse = customTimeout || this.getAdaptiveTimeout(command);
    const sessionLogger = logger.withContext({
      sessionId,
      workspacePath,
      command,
      timeout: timeoutToUse,
    });

    try {
      sessionLogger.info("Starting Claude Code process", {
        command,
        commandType: typeof command,
        timeout: timeoutToUse
      });

      const validatedPath = this.validateWorkspacePath(workspacePath);
      const { executable, args } = this.validateAndSanitizeCommand(command, resumeSessionId, imageIds);
      
      sessionLogger.info("Sanitized command", {
        executable,
        args: args.join(' '),
        resumeSessionId,
        imageCount: (imageIds?.length || 0).toString()
      });

      if (this.activeProcesses.has(sessionId)) {
        // Try to clean up zombie process first
        const existingProcess = this.activeProcesses.get(sessionId);
        if (existingProcess) {
          logger.warn("Found existing process, attempting cleanup", {
            sessionId,
            pid: existingProcess.pid
          });
          this.stopProcess(sessionId);
          // Give it a moment to clean up
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Check again
          if (this.activeProcesses.has(sessionId)) {
            throw new CliServiceError(
              "Process already exists for this session and cleanup failed",
              "PROCESS_EXISTS"
            );
          }
        }
      }

      const childProcess = spawn(
        executable,
        args,
        {
          cwd: validatedPath,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env },
          timeout: timeoutToUse,
        }
      );

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
        workspaceName: "default-workspace",
        userId: "system-user",
        agentName: undefined,
        command,
        startTime: new Date(),
        sessionId,
        resumeSessionId,
      };

      this.activeProcesses.set(sessionId, claudeProcess);

      // Save session to persistence with error handling
      try {
        const persistedSession: PersistedSession = {
          id: sessionId,
          workspaceName: "default-workspace",
          workspacePath: validatedPath,
          pid: childProcess.pid,
          startedAt: claudeProcess.startTime.toISOString(),
          agentName: undefined,
          command,
          userId: "system-user",
        };

        await this.sessionPersistence.saveSession(persistedSession);
        sessionLogger.debug("Session saved to persistence", { sessionId });
      } catch (persistenceError) {
        // Log error but don't fail the main operation
        sessionLogger.warn("Failed to save session to persistence", {
          error:
            persistenceError instanceof Error
              ? persistenceError.message
              : String(persistenceError),
          sessionId,
        });
      }

      childProcess.on("exit", (code, signal) => {
        sessionLogger.info("Claude Code process exited", {
          exitCode: code?.toString() || "null",
          signal: signal || "none",
        });
        const process = this.activeProcesses.get(sessionId);
        if (process?.forceKillTimeout) {
          clearTimeout(process.forceKillTimeout);
        }
        this.activeProcesses.delete(sessionId);

        // Remove session from persistence with error handling
        this.removeSessionFromPersistence(sessionId, sessionLogger);
      });

      childProcess.on("error", error => {
        sessionLogger.error("Claude Code process error", error);
        const process = this.activeProcesses.get(sessionId);
        if (process?.forceKillTimeout) {
          clearTimeout(process.forceKillTimeout);
        }
        this.activeProcesses.delete(sessionId);

        // Remove session from persistence with error handling
        this.removeSessionFromPersistence(sessionId, sessionLogger);
      });

      sessionLogger.info("Claude Code process started successfully", {
        pid: childProcess.pid,
      });

      return {
        pid: childProcess.pid,
        sessionId,
      };
    } catch (error) {
      sessionLogger.error(
        "Failed to start Claude Code process",
        error as Error
      );
      throw error;
    }
  }

  stopProcess(sessionId: string): boolean {
    const claudeProcess = this.activeProcesses.get(sessionId);
    if (!claudeProcess) {
      return false;
    }

    const sessionLogger = logger.withContext({
      sessionId,
      pid: claudeProcess.pid,
    });

    try {
      sessionLogger.info("Stopping Claude Code process");

      claudeProcess.process.kill("SIGTERM");

      // Force kill after 5 seconds if process doesn't terminate gracefully
      const forceKillTimeout = setTimeout(() => {
        if (this.activeProcesses.has(sessionId)) {
          sessionLogger.warn(
            "Process did not terminate gracefully, sending SIGKILL"
          );
          claudeProcess.process.kill("SIGKILL");
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

  private async removeSessionFromPersistence(
    sessionId: string,
    sessionLogger: ILogger
  ): Promise<void> {
    try {
      await this.sessionPersistence.removeSession(sessionId);
      sessionLogger.debug("Session removed from persistence", { sessionId });
    } catch (persistenceError) {
      // Log error but don't fail the main operation
      sessionLogger.warn("Failed to remove session from persistence", {
        error:
          persistenceError instanceof Error
            ? persistenceError.message
            : String(persistenceError),
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
    return Array.from(this.activeProcesses.entries()).map(
      ([sessionId, process]) => ({
        sessionId,
        pid: process.pid,
        workspacePath: process.workspacePath,
        workspaceName: process.workspaceName,
        userId: process.userId,
        agentName: process.agentName,
        command: process.command,
        startTime: process.startTime,
      })
    );
  }

  async recoverSessions(): Promise<void> {
    const recoveryLogger = logger.withContext({
      operation: "session-recovery",
    });

    try {
      recoveryLogger.info("Starting session recovery process");

      const persistedSessions = await this.sessionPersistence.loadSessions();
      recoveryLogger.info("Loaded persisted sessions", {
        count: persistedSessions.length,
      });

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
            await this.sessionPersistence.updateSession(session.id, {
              recovered: true,
            });

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
            sessionLogger.error(
              "Failed to remove problematic session",
              removeError as Error
            );
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


  getClaudeSessionId(sessionId: string): string | null {
    return this.claudeSessions.get(sessionId) || null;
  }

  setClaudeSessionId(sessionId: string, claudeSessionId: string): void {
    this.claudeSessions.set(sessionId, claudeSessionId);
    logger.info("Claude session ID stored", { sessionId, claudeSessionId });
  }

  cleanup(): void {
    logger.info("Cleaning up all Claude Code processes", {
      count: this.activeProcesses.size,
    });

    // Clear all timeouts before stopping processes to prevent memory leaks
    for (const [sessionId, process] of this.activeProcesses.entries()) {
      if (process.forceKillTimeout) {
        clearTimeout(process.forceKillTimeout);
      }
      this.stopProcess(sessionId);
    }
    
    this.claudeSessions.clear();
  }
}

export const cliService = new CliService();
