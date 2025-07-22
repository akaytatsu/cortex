import * as pty from "node-pty";
import * as os from "os";
import * as path from "path";
import type { TerminalSession } from "shared-types";
import { SessionService } from "./session.service";

export class TerminalServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "TerminalServiceError";
  }
}

interface ActiveSession {
  session: TerminalSession;
  process: pty.IPty;
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
      if (
        now.getTime() - activeSession.lastActivity.getTime() >
        maxInactivity
      ) {
        console.log(`Cleaning up inactive terminal session: ${sessionId}`);
        this.terminateSession(sessionId);
      }
    }
  }

  private validateWorkspacePath(workspacePath: string): string {
    const normalizedPath = path.resolve(workspacePath);
    // Get the project root by going up from apps/web to the monorepo root
    const projectRoot = path.resolve(process.cwd(), "../..");

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
    userId: string,
    customSessionId?: string
  ): Promise<TerminalSession> {
    const validatedPath = this.validateWorkspacePath(workspacePath);

    const sessionId =
      customSessionId ||
      `terminal_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

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

  async spawnTerminal(session: TerminalSession): Promise<pty.IPty> {
    const shell =
      os.platform() === "win32"
        ? "cmd.exe"
        : process.env.SHELL || "/usr/bin/bash";

    const ptyProcess = pty.spawn(shell, [], {
      name: "xterm-color",
      cols: 80,
      rows: 24,
      cwd: session.workspacePath,
      env: {
        ...process.env,
        TERM: "xterm-color",
        COLORTERM: "truecolor",
        PWD: session.workspacePath,
      },
    });

    if (!ptyProcess.pid) {
      throw new TerminalServiceError(
        "Failed to spawn terminal process",
        "SPAWN_FAILED"
      );
    }

    session.pid = ptyProcess.pid;

    const activeSession: ActiveSession = {
      session: { ...session, status: "active" },
      process: ptyProcess,
      lastActivity: new Date(),
    };

    this.activeSessions.set(session.id, activeSession);

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`Terminal process exited: ${exitCode}, signal: ${signal}`);
      this.activeSessions.delete(session.id);
    });

    // Note: node-pty doesn't expose error events the same way

    return ptyProcess;
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
    if (!activeSession || !activeSession.process) {
      return false;
    }

    this.updateLastActivity(sessionId);

    try {
      activeSession.process.write(data);
      return true;
    } catch (error) {
      console.error(`Error writing to terminal:`, error);
      return false;
    }
  }

  resizeTerminal(
    sessionId: string,
    cols: number = 80,
    rows: number = 24
  ): boolean {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) {
      return false;
    }

    this.updateLastActivity(sessionId);

    try {
      activeSession.process.resize(cols, rows);
      return true;
    } catch (error: unknown) {
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

      // For node-pty, kill is enough - no need for SIGKILL timeout

      this.activeSessions.delete(sessionId);
      return true;
    } catch (error: unknown) {
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
    return SessionService.requireUserId(request);
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
