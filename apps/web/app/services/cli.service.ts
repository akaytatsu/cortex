import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import { createServiceLogger } from "../lib/logger";

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
  command?: string;
  startTime: Date;
}

const logger = createServiceLogger("CliService");

class CliService {
  private activeProcesses = new Map<string, ClaudeProcess>();
  private readonly ALLOWED_COMMANDS = ["claude"];
  private readonly DANGEROUS_CHARS_REGEX = /[;&|$`\\]/;
  private readonly COMMAND_TIMEOUT = 30000; // 30 seconds

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
    sessionId: string,
    command?: string
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
        command,
        startTime: new Date(),
      };

      this.activeProcesses.set(sessionId, claudeProcess);

      childProcess.on('exit', (code, signal) => {
        sessionLogger.info("Claude Code process exited", { exitCode: code, signal });
        this.activeProcesses.delete(sessionId);
      });

      childProcess.on('error', (error) => {
        sessionLogger.error("Claude Code process error", error);
        this.activeProcesses.delete(sessionId);
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

      setTimeout(() => {
        if (this.activeProcesses.has(sessionId)) {
          sessionLogger.warn("Process did not terminate gracefully, sending SIGKILL");
          claudeProcess.process.kill('SIGKILL');
        }
      }, 5000);

      this.activeProcesses.delete(sessionId);
      sessionLogger.info("Claude Code process stopped successfully");
      
      return true;
    } catch (error) {
      sessionLogger.error("Error stopping Claude Code process", error as Error);
      return false;
    }
  }

  getProcess(sessionId: string): ChildProcess | null {
    const claudeProcess = this.activeProcesses.get(sessionId);
    return claudeProcess?.process || null;
  }

  getProcessInfo(sessionId: string): { pid: number; workspacePath: string; startTime: Date } | null {
    const claudeProcess = this.activeProcesses.get(sessionId);
    if (!claudeProcess) {
      return null;
    }

    return {
      pid: claudeProcess.pid,
      workspacePath: claudeProcess.workspacePath,
      startTime: claudeProcess.startTime,
    };
  }

  getAllActiveProcesses(): Array<{ sessionId: string; pid: number; workspacePath: string; startTime: Date }> {
    return Array.from(this.activeProcesses.entries()).map(([sessionId, process]) => ({
      sessionId,
      pid: process.pid,
      workspacePath: process.workspacePath,
      startTime: process.startTime,
    }));
  }

  cleanup(): void {
    logger.info("Cleaning up all Claude Code processes", { count: this.activeProcesses.size });
    
    for (const sessionId of this.activeProcesses.keys()) {
      this.stopProcess(sessionId);
    }
  }
}

export const cliService = new CliService();