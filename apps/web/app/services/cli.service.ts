import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import { createServiceLogger } from "../lib/logger";
import { imageService } from "./image.service";
import type { ILogger } from "../types/services";

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

interface ClaudeSession {
  sessionId: string;
  claudeSessionId?: string;
  workspacePath: string;
  lastActivity: Date;
}

const logger = createServiceLogger("CliService");

export class CliService {
  private sessions = new Map<string, ClaudeSession>();
  private activeProcesses = new Map<string, ChildProcess>();
  private readonly COMMAND_TIMEOUT = parseInt(process.env.CLI_COMMAND_TIMEOUT || "300000", 10); // 5 minutes default
  private readonly DANGEROUS_CHARS_REGEX = /[;&|$`\\<>]/;

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

  private buildClaudeArgs(
    command?: string,
    claudeSessionId?: string,
    imageIds?: string[]
  ): string[] {
    // Build Claude CLI command following claudecodeui pattern (line 22-85)
    const args = [];
    
    // Add print flag with command if we have a command (claudecodeui line 25-27)
    if (command && command.trim()) {
      args.push('--print', command.trim());
    }
    
    // Add resume flag if resuming (claudecodeui line 80-82)
    if (claudeSessionId) {
      args.push('--resume', claudeSessionId);
    }
    
    // Add basic flags (claudecodeui line 85)
    args.push('--output-format', 'stream-json', '--verbose');
    
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
    
    return args;
  }

  async executeCommand(
    workspacePath: string,
    sessionId: string,
    command?: string,
    imageIds?: string[]
  ): Promise<{ 
    pid: number; 
    sessionId: string; 
    claudeSessionId?: string;
    process: ChildProcess;
  }> {
    const sessionLogger = logger.withContext({
      sessionId,
      workspacePath,
      command
    });

    try {
      // Validate workspace path
      const validatedPath = this.validateWorkspacePath(workspacePath);
      
      // Check for dangerous characters in command
      if (command && this.DANGEROUS_CHARS_REGEX.test(command)) {
        throw new CliServiceError(
          "Command contains dangerous characters",
          "DANGEROUS_COMMAND"
        );
      }
      
      // Get session info
      const session = this.sessions.get(sessionId);
      const claudeSessionId = session?.claudeSessionId;
      
      // Build args based on claudecodeui approach
      const args = this.buildClaudeArgs(command, claudeSessionId, imageIds);
      
      sessionLogger.info("Spawning Claude process", {
        executable: "claude",
        args: args.join(' '),
        claudeSessionId,
        hasImages: (imageIds?.length || 0) > 0
      });

      // Kill any existing process for this session
      const existingProcess = this.activeProcesses.get(sessionId);
      if (existingProcess && !existingProcess.killed) {
        sessionLogger.info("Killing existing process", { 
          pid: existingProcess.pid 
        });
        existingProcess.kill("SIGTERM");
        this.activeProcesses.delete(sessionId);
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Spawn new process following claudecodeui pattern
      const childProcess = spawn("claude", args, {
        cwd: validatedPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
        timeout: this.COMMAND_TIMEOUT
      });

      if (!childProcess.pid) {
        throw new CliServiceError(
          "Failed to spawn Claude process",
          "SPAWN_FAILED"
        );
      }

      // Store active process
      this.activeProcesses.set(sessionId, childProcess);

      // Update session info
      if (!session) {
        this.sessions.set(sessionId, {
          sessionId,
          workspacePath: validatedPath,
          lastActivity: new Date()
        });
      } else {
        session.lastActivity = new Date();
      }

      // Handle process exit
      childProcess.on("exit", (code, signal) => {
        sessionLogger.info("Claude process exited", {
          exitCode: code?.toString() || "null",
          signal: signal || "none"
        });
        this.activeProcesses.delete(sessionId);
      });

      childProcess.on("error", (error) => {
        sessionLogger.error("Claude process error", error);
        this.activeProcesses.delete(sessionId);
      });

      // Close stdin immediately for print mode (like claudecodeui)
      if (command) {
        childProcess.stdin.end();
      }

      sessionLogger.info("Claude process started successfully", {
        pid: childProcess.pid
      });

      return {
        pid: childProcess.pid,
        sessionId,
        claudeSessionId,
        process: childProcess
      };
    } catch (error) {
      sessionLogger.error("Failed to execute Claude command", error as Error);
      throw error;
    }
  }

  // Simplified start process that uses executeCommand
  async startProcess(
    workspacePath: string,
    sessionId: string,
    command?: string,
    customTimeout?: number,
    resumeSessionId?: string,
    imageIds?: string[]
  ): Promise<{ pid: number; sessionId: string; claudeSessionId?: string }> {
    // If resumeSessionId is provided, use it as the Claude session ID
    if (resumeSessionId) {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.claudeSessionId = resumeSessionId;
      } else {
        this.sessions.set(sessionId, {
          sessionId,
          claudeSessionId: resumeSessionId,
          workspacePath,
          lastActivity: new Date()
        });
      }
    }

    const result = await this.executeCommand(workspacePath, sessionId, command, imageIds);
    return {
      pid: result.pid,
      sessionId: result.sessionId,
      claudeSessionId: result.claudeSessionId
    };
  }

  stopProcess(sessionId: string): boolean {
    const process = this.activeProcesses.get(sessionId);
    if (!process) {
      return false;
    }

    try {
      logger.info("Stopping Claude process", { 
        sessionId, 
        pid: process.pid 
      });

      process.kill("SIGTERM");
      this.activeProcesses.delete(sessionId);

      // Give it time, then force kill if needed
      setTimeout(() => {
        if (!process.killed) {
          logger.warn("Force killing Claude process", { 
            sessionId,
            pid: process.pid 
          });
          process.kill("SIGKILL");
        }
      }, 5000);

      return true;
    } catch (error) {
      logger.error("Error stopping Claude process", error as Error);
      return false;
    }
  }

  getProcess(sessionId: string): ChildProcess | null {
    return this.activeProcesses.get(sessionId) || null;
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
    const process = this.activeProcesses.get(sessionId);
    const session = this.sessions.get(sessionId);
    
    if (!process || !session) {
      return null;
    }

    return {
      pid: process.pid!,
      workspacePath: session.workspacePath,
      workspaceName: "default-workspace",
      userId: "system-user",
      agentName: undefined,
      command: undefined,
      startTime: session.lastActivity
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
    const results = [];
    
    for (const [sessionId, process] of this.activeProcesses.entries()) {
      const session = this.sessions.get(sessionId);
      if (session && process.pid) {
        results.push({
          sessionId,
          pid: process.pid,
          workspacePath: session.workspacePath,
          workspaceName: "default-workspace",
          userId: "system-user",
          agentName: undefined,
          command: undefined,
          startTime: session.lastActivity
        });
      }
    }
    
    return results;
  }

  getClaudeSessionId(sessionId: string): string | null {
    return this.sessions.get(sessionId)?.claudeSessionId || null;
  }

  setClaudeSessionId(sessionId: string, claudeSessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.claudeSessionId = claudeSessionId;
    } else {
      this.sessions.set(sessionId, {
        sessionId,
        claudeSessionId,
        workspacePath: process.cwd(),
        lastActivity: new Date()
      });
    }
    logger.info("Claude session ID stored", { sessionId, claudeSessionId });
  }

  // Simplified recovery - we don't persist sessions anymore
  async recoverSessions(): Promise<void> {
    logger.info("Session recovery skipped - using ephemeral sessions");
  }

  cleanup(): void {
    logger.info("Cleaning up all Claude processes", {
      count: this.activeProcesses.size
    });

    // Stop all active processes
    for (const [sessionId, process] of this.activeProcesses.entries()) {
      if (!process.killed) {
        process.kill("SIGTERM");
      }
    }
    
    this.activeProcesses.clear();
    this.sessions.clear();
  }

  // Remove session from persistence (no-op for ephemeral approach)
  private async removeSessionFromPersistence(
    sessionId: string,
    sessionLogger: ILogger
  ): Promise<void> {
    sessionLogger.debug("Session persistence removal skipped", { sessionId });
  }
}

export const cliService = new CliService();