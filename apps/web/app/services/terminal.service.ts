import * as pty from "node-pty";
import * as os from "os";
import * as path from "path";
import type { TerminalSession } from "shared-types";
import type { ITerminalService } from "../types/services";
import { SessionService } from "./session.service";
import { config } from "../lib/config";
import { createServiceLogger } from "../lib/logger";

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

const logger = createServiceLogger("TerminalService");

class TerminalService implements ITerminalService {
  private activeSessions = new Map<string, ActiveSession>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    const intervalMs = config.terminal.cleanupIntervalMs;
    logger.info("Starting terminal cleanup timer", { intervalMs });
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, intervalMs);
  }

  private cleanupInactiveSessions() {
    const now = new Date();
    const maxInactivity = config.terminal.maxInactivityMs;
    let cleanedCount = 0;

    for (const [sessionId, activeSession] of this.activeSessions) {
      if (
        now.getTime() - activeSession.lastActivity.getTime() >
        maxInactivity
      ) {
        const sessionLogger = logger.withContext({
          sessionId,
          userId: activeSession.session.userId,
        });
        sessionLogger.info("Cleaning up inactive terminal session");
        this.terminateSession(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info("Terminal cleanup completed", {
        cleanedSessions: cleanedCount,
      });
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
    const sessionLogger = logger.withContext({
      userId,
      workspaceName,
      workspacePath,
    });

    try {
      sessionLogger.info("Creating terminal session");

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

      sessionLogger.info("Terminal session created successfully", {
        sessionId,
      });
      return session;
    } catch (error) {
      sessionLogger.error("Failed to create terminal session", error as Error);
      throw error;
    }
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
      const sessionLogger = logger.withContext({
        sessionId: session.id,
        userId: session.userId,
      });
      sessionLogger.info("Terminal process exited", { exitCode, signal });
      this.activeSessions.delete(session.id);
    });

    // Note: node-pty doesn't expose error events the same way

    return ptyProcess;
  }

  getSession(sessionId: string): TerminalSession | null {
    const activeSession = this.activeSessions.get(sessionId);
    return activeSession?.session || null;
  }

  getProcess(sessionId: string): pty.IPty | null {
    const activeSession = this.activeSessions.get(sessionId);
    return activeSession?.process || null;
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
      const sessionLogger = logger.withContext({ sessionId });
      sessionLogger.error("Error writing to terminal", error as Error);
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
      const sessionLogger = logger.withContext({ sessionId });
      sessionLogger.error("Error resizing terminal", error as Error);
      return false;
    }
  }

  terminateSession(sessionId: string): boolean {
    const activeSession = this.activeSessions.get(sessionId);
    if (!activeSession) {
      return false;
    }

    try {
      const sessionLogger = logger.withContext({ sessionId });
      sessionLogger.info("Terminating terminal session");

      activeSession.process.kill("SIGTERM");

      // For node-pty, kill is enough - no need for SIGKILL timeout

      this.activeSessions.delete(sessionId);
      sessionLogger.info("Terminal session terminated successfully");
      return true;
    } catch (error: unknown) {
      const sessionLogger = logger.withContext({ sessionId });
      sessionLogger.error("Error terminating terminal session", error as Error);
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
    // Note: SessionService is not part of DI container yet - using static call
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
