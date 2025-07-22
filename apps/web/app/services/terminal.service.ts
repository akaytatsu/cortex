import { spawn, type ChildProcess } from "child_process";
import * as os from "os";
import * as path from "path";
import type { TerminalSession } from "shared-types";
import { sessionService } from "./session.service";

export class TerminalServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "TerminalServiceError";
  }
}

interface ActiveSession {
  session: TerminalSession;
  process: ChildProcess;
  lastActivity: Date;
}

class TerminalService {
  private activeSessions = new Map<string, ActiveSession>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 60000); // Check every minute
  }

  private cleanupInactiveSessions() {
    const now = new Date();
    const maxInactivity = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, activeSession] of this.activeSessions) {
      if (now.getTime() - activeSession.lastActivity.getTime() > maxInactivity) {
        console.log(`Cleaning up inactive terminal session: ${sessionId}`);
        this.terminateSession(sessionId);
      }
    }
  }

  private validateWorkspacePath(workspacePath: string): string {
    const normalizedPath = path.resolve(workspacePath);
    const projectRoot = path.resolve(process.cwd());
    
    if (!normalizedPath.startsWith(projectRoot)) {
      throw new TerminalServiceError(
        "Workspace path must be within project boundaries",
        "INVALID_WORKSPACE_PATH"
      );
    }

    return normalizedPath;
  }

  async createSession(
    workspaceName: string,
    workspacePath: string,
    userId: string
  ): Promise<TerminalSession> {
    const validatedPath = this.validateWorkspacePath(workspacePath);
    
    const sessionId = `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: TerminalSession = {
      id: sessionId,
      workspaceName,
      workspacePath: validatedPath,
      userId,
      status: "active",
      createdAt: new Date(),
    };

    return session;
  }

  async spawnTerminal(session: TerminalSession): Promise<ChildProcess> {
    const shell = os.platform() === "win32" ? "cmd.exe" : process.env.SHELL || "/bin/bash";
    
    const env = {
      ...process.env,
      TERM: "xterm-color",
      COLORTERM: "truecolor",
      PWD: session.workspacePath,
    };

    const childProcess = spawn(shell, [], {
      cwd: session.workspacePath,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (!childProcess.pid) {
      throw new TerminalServiceError(
        "Failed to spawn terminal process",
        "SPAWN_FAILED"
      );
    }

    session.pid = childProcess.pid;
    
    const activeSession: ActiveSession = {
      session: { ...session, status: "active" },
      process: childProcess,
      lastActivity: new Date(),
    };

    this.activeSessions.set(session.id, activeSession);

    childProcess.on("exit", (code, signal) => {
      console.log(`Terminal process exited: ${code}, signal: ${signal}`);
      this.activeSessions.delete(session.id);
    });

    childProcess.on("error", (error) => {
      console.error(`Terminal process error:`, error);
      this.activeSessions.delete(session.id);
    });

    return childProcess;
  }

  getSession(sessionId: string): TerminalSession | null {
    const activeSession = this.activeSessions.get(sessionId);
    return activeSession?.session || null;
  }

  updateLastActivity(sessionId: string): void {
    const activeSession = this.activeSessions.get(sessionId);
    if (activeSession) {
      activeSession.lastActivity = new Date();
    }
  }

  writeToTerminal(sessionId: string, data: string): boolean {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession || !activeSession.process.stdin) {
      return false;
    }

    this.updateLastActivity(sessionId);
    
    try {
      activeSession.process.stdin.write(data);
      return true;
    } catch (error) {
      console.error(`Error writing to terminal:`, error);
      return false;
    }
  }

  resizeTerminal(sessionId: string): boolean {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) {
      return false;
    }

    this.updateLastActivity(sessionId);
    
    try {
      if (typeof activeSession.process.kill === "function") {
        process.kill(activeSession.process.pid!, "SIGWINCH");
      }
      return true;
    } catch (error) {
      console.error(`Error resizing terminal:`, error);
      return false;
    }
  }

  terminateSession(sessionId: string): boolean {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) {
      return false;
    }

    try {
      activeSession.process.kill("SIGTERM");
      
      setTimeout(() => {
        if (!activeSession.process.killed) {
          activeSession.process.kill("SIGKILL");
        }
      }, 5000);
      
      this.activeSessions.delete(sessionId);
      return true;
    } catch (error) {
      console.error(`Error terminating terminal session:`, error);
      return false;
    }
  }

  getActiveSessions(userId: string): TerminalSession[] {
    return Array.from(this.activeSessions.values())
      .filter(active => active.session.userId === userId)
      .map(active => active.session);
  }

  terminateAllUserSessions(userId: string): void {
    const userSessions = this.getActiveSessions(userId);
    for (const session of userSessions) {
      this.terminateSession(session.id);
    }
  }

  async requireUserId(request: Request): Promise<string> {
    return sessionService.requireUserId(request);
  }

  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    for (const sessionId of this.activeSessions.keys()) {
      this.terminateSession(sessionId);
    }
  }
}

export const terminalService = new TerminalService();