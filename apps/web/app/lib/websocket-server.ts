import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { terminalService } from "../services/terminal.service";
import type { TerminalMessage, ClaudeCodeMessage } from "shared-types";
import { SessionService } from "../services/session.service";
import { createServiceLogger } from "./logger";

interface TerminalWebSocket extends WebSocket {
  sessionId?: string;
  userId?: string;
  isAlive?: boolean;
}

interface ClaudeCodeWebSocket extends WebSocket {
  sessionId?: string;
  userId?: string;
  connectionType: 'claude-code';
  isAlive?: boolean;
}

const logger = createServiceLogger("TerminalWebSocketServer");

// Global singleton instance to prevent multiple server starts
let globalInstance: TerminalWebSocketServer | null = null;
let globalStarting: boolean = false;

class TerminalWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, TerminalWebSocket>();
  private claudeCodeClients = new Map<string, ClaudeCodeWebSocket>();
  public port: number = 8000;

  static getInstance(): TerminalWebSocketServer {
    if (!globalInstance) {
      globalInstance = new TerminalWebSocketServer();
    }
    return globalInstance;
  }

  async start() {
    if (this.wss) {
      logger.warn("Terminal WebSocket server already started, skipping");
      return;
    }

    if (globalStarting) {
      logger.warn("Terminal WebSocket server is already starting, skipping");
      return;
    }

    globalStarting = true;

    // Use a dedicated port completely separate from Vite
    let port = this.port;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        this.wss = new WebSocketServer({ port });
        this.port = port; // Save the successful port
        break;
      } catch (error: unknown) {
        globalStarting = false;
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "EADDRINUSE" &&
          attempts < maxAttempts - 1
        ) {
          logger.warn(`Port ${port} in use, trying next port`, {
            currentPort: port,
            nextPort: port + 1,
          });
          port++;
          attempts++;
          continue;
        }
        throw error;
      }
    }

    this.wss.on("connection", (ws: TerminalWebSocket | ClaudeCodeWebSocket, request) => {
      // Filter out Vite HMR connections
      const protocol = request.headers["sec-websocket-protocol"];
      if (
        protocol &&
        (protocol.includes("vite-hmr") || protocol.includes("vite-ping"))
      ) {
        logger.debug("Rejecting Vite HMR connection", { protocol });
        ws.close(1002, "Not a terminal connection");
        return;
      }

      // Determine connection type based on URL path or query parameters
      const url = new URL(request.url || '/', 'http://localhost');
      const connectionType = url.searchParams.get('type');
      
      if (connectionType === 'claude-code') {
        this.handleClaudeCodeConnection(ws as ClaudeCodeWebSocket, request);
      } else {
        this.handleTerminalConnection(ws as TerminalWebSocket, request);
      }
    });

    const pingInterval = setInterval(() => {
      if (this.wss) {
        this.wss.clients.forEach((ws: TerminalWebSocket | ClaudeCodeWebSocket) => {
          if (ws.isAlive === false) {
            if (ws.sessionId) {
              if ('connectionType' in ws && ws.connectionType === 'claude-code') {
                this.claudeCodeClients.delete(ws.sessionId);
              } else {
                terminalService.terminateSession(ws.sessionId);
                this.clients.delete(ws.sessionId);
              }
            }
            return ws.terminate();
          }
          ws.isAlive = false;
          ws.ping();
        });
      }
    }, 30000);

    this.wss.on("close", () => {
      clearInterval(pingInterval);
    });

    globalStarting = false;
    logger.info("Terminal WebSocket server started", { port: this.port });
  }

  private handleTerminalConnection(ws: TerminalWebSocket) {
    logger.info("Accepted terminal connection");

    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async data => {
      try {
        const message: TerminalMessage = JSON.parse(data.toString());
        await this.handleMessage(ws, message);
      } catch (error) {
        logger.error("Error processing WebSocket message", error as Error, {
          sessionId: ws.sessionId,
        });
        this.sendMessage(ws, {
          type: "error",
          data: "Invalid message format",
          sessionId: ws.sessionId || "unknown",
        });
      }
    });

    ws.on("close", () => {
      logger.info("WebSocket connection closed", { sessionId: ws.sessionId });
      if (ws.sessionId) {
        terminalService.terminateSession(ws.sessionId);
        this.clients.delete(ws.sessionId);
      }
    });

    ws.on("error", error => {
      logger.error("WebSocket connection error", error as Error, {
        sessionId: ws.sessionId,
      });
      if (ws.sessionId) {
        terminalService.terminateSession(ws.sessionId);
        this.clients.delete(ws.sessionId);
      }
    });
  }

  private async handleClaudeCodeConnection(ws: ClaudeCodeWebSocket, request: IncomingMessage) {
    logger.info("Accepted Claude Code connection");

    ws.connectionType = 'claude-code';
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Authentication for Claude Code connections
    try {
      const userId = await this.authenticateClaudeCodeConnection(request);
      if (!userId) {
        logger.warn("Unauthenticated Claude Code connection rejected");
        ws.close(1008, "Authentication required");
        return;
      }
      ws.userId = userId;
    } catch (error) {
      logger.error("Authentication error for Claude Code connection", error as Error);
      ws.close(1008, "Authentication failed");
      return;
    }

    ws.on("message", async data => {
      try {
        const message: ClaudeCodeMessage = JSON.parse(data.toString());
        await this.handleClaudeCodeMessage(ws, message);
      } catch (error) {
        logger.error("Error processing Claude Code WebSocket message", error as Error, {
          sessionId: ws.sessionId,
          userId: ws.userId,
        });
        this.sendClaudeCodeMessage(ws, {
          type: "error",
          data: "Invalid message format",
          sessionId: ws.sessionId || "unknown",
        });
      }
    });

    ws.on("close", () => {
      logger.info("Claude Code WebSocket connection closed", { 
        sessionId: ws.sessionId,
        userId: ws.userId 
      });
      if (ws.sessionId) {
        this.claudeCodeClients.delete(ws.sessionId);
      }
    });

    ws.on("error", error => {
      logger.error("Claude Code WebSocket connection error", error as Error, {
        sessionId: ws.sessionId,
        userId: ws.userId,
      });
      if (ws.sessionId) {
        this.claudeCodeClients.delete(ws.sessionId);
      }
    });
  }

  private async authenticateClaudeCodeConnection(request: IncomingMessage): Promise<string | null> {
    try {
      // Extract session from cookie in the request headers
      const cookie = request.headers.cookie;
      if (!cookie) {
        return null;
      }

      // Create a minimal Request object for SessionService
      const mockRequest = new Request('http://localhost', {
        headers: { Cookie: cookie }
      });

      const userId = await SessionService.getUserId(mockRequest);
      return userId || null;
    } catch (error) {
      logger.error("Error authenticating Claude Code connection", error as Error);
      return null;
    }
  }

  private async handleClaudeCodeMessage(ws: ClaudeCodeWebSocket, message: ClaudeCodeMessage) {
    try {
      // Ensure connection has sessionId
      if (!ws.sessionId) {
        ws.sessionId = message.sessionId;
        this.claudeCodeClients.set(message.sessionId, ws);
      }

      // Process message based on type
      switch (message.type) {
        case 'input':
          // Handle input from client (e.g., commands to execute)
          logger.info("Received input from Claude Code client", { 
            sessionId: message.sessionId,
            userId: ws.userId,
            data: message.data.substring(0, 100) // Log first 100 chars
          });
          // Echo back for now - in future this will integrate with claude code execution
          this.sendClaudeCodeMessage(ws, {
            type: "output",
            data: `Processed: ${message.data}`,
            sessionId: message.sessionId,
          });
          break;
        case 'exit':
          // Handle client exit
          logger.info("Claude Code client exiting", { 
            sessionId: message.sessionId,
            userId: ws.userId 
          });
          this.claudeCodeClients.delete(message.sessionId);
          ws.close();
          break;
        default:
          logger.warn("Unknown Claude Code message type", { 
            type: message.type,
            sessionId: message.sessionId 
          });
      }
    } catch (error) {
      logger.error("Error handling Claude Code WebSocket message", error as Error, {
        sessionId: message.sessionId,
      });
      this.sendClaudeCodeMessage(ws, {
        type: "error",
        data: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        sessionId: message.sessionId,
      });
    }
  }

  private sendClaudeCodeMessage(ws: ClaudeCodeWebSocket, message: ClaudeCodeMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Method to send message to specific Claude Code client
  public sendToClaudeCodeClient(sessionId: string, message: ClaudeCodeMessage): boolean {
    const client = this.claudeCodeClients.get(sessionId);
    if (client && client.readyState === WebSocket.OPEN) {
      this.sendClaudeCodeMessage(client, message);
      return true;
    }
    return false;
  }

  // Method to broadcast to all Claude Code clients for a user
  public broadcastToUserClaudeCodeClients(userId: string, message: ClaudeCodeMessage): number {
    let sentCount = 0;
    this.claudeCodeClients.forEach((client) => {
      if (client.userId === userId && client.readyState === WebSocket.OPEN) {
        this.sendClaudeCodeMessage(client, message);
        sentCount++;
      }
    });
    return sentCount;
  }

  private async handleMessage(ws: TerminalWebSocket, message: TerminalMessage) {
    try {
      if (message.type === "input") {
        let data;
        try {
          data = JSON.parse(message.data);
        } catch {
          data = { data: message.data };
        }

        if (data.action === "init") {
          await this.handleInit(ws, data, message.sessionId);
        } else if (data.action === "resize") {
          this.handleResize(ws, data);
        } else if (data.action === "close") {
          this.handleClose(ws);
        } else {
          this.handleTerminalInput(ws, message.data);
        }
      }
    } catch (error) {
      logger.error("Error handling WebSocket message", error as Error, {
        sessionId: message.sessionId,
      });
      this.sendMessage(ws, {
        type: "error",
        data: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        sessionId: message.sessionId,
      });
    }
  }

  private async handleInit(
    ws: TerminalWebSocket,
    data: Record<string, unknown>,
    sessionId: string
  ) {
    try {
      // Check if session already exists to avoid duplicates
      if (this.clients.has(sessionId)) {
        logger.warn("Session already exists, closing duplicate connection", {
          sessionId,
        });
        ws.close(1002, "Session already exists");
        return;
      }

      // For now, we'll skip auth validation in development
      const userId = "dev-user"; // In production, extract from session/auth

      const session = await terminalService.createSession(
        data.workspaceName as string,
        data.workspacePath as string,
        userId,
        sessionId
      );

      ws.sessionId = sessionId;
      ws.userId = userId;

      this.clients.set(sessionId, ws);

      await terminalService.spawnTerminal(session);

      // Get the session with the active process
      const activeSession = terminalService.getSession(sessionId);
      if (!activeSession) {
        throw new Error("Failed to retrieve created session");
      }

      // Store reference to the terminal process for this WebSocket
      const ptyProcess = terminalService.getProcess(sessionId);
      if (!ptyProcess) {
        throw new Error("Failed to retrieve terminal process");
      }

      // With node-pty, we only need to listen to 'data' events (combines stdout/stderr)
      ptyProcess.onData((data: string) => {
        this.sendMessage(ws, {
          type: "output",
          data: data,
          sessionId,
        });
      });

      ptyProcess.onExit(({ exitCode, signal }) => {
        this.sendMessage(ws, {
          type: "exit",
          data: `Process exited with code ${exitCode}, signal: ${signal}`,
          sessionId,
        });
        this.clients.delete(sessionId);
      });
    } catch (error) {
      this.sendMessage(ws, {
        type: "error",
        data: `Failed to initialize terminal: ${error instanceof Error ? error.message : "Unknown error"}`,
        sessionId,
      });
    }
  }

  private handleResize(ws: TerminalWebSocket, data: Record<string, unknown>) {
    if (!ws.sessionId) return;

    const cols = (data.cols as number) || 80;
    const rows = (data.rows as number) || 24;

    const success = terminalService.resizeTerminal(ws.sessionId, cols, rows);
    if (!success) {
      this.sendMessage(ws, {
        type: "error",
        data: "Failed to resize terminal",
        sessionId: ws.sessionId,
      });
    }
  }

  private handleClose(ws: TerminalWebSocket) {
    if (!ws.sessionId) return;

    terminalService.terminateSession(ws.sessionId);
    this.clients.delete(ws.sessionId);
    ws.close();
  }

  private handleTerminalInput(ws: TerminalWebSocket, data: string) {
    if (!ws.sessionId) return;

    const success = terminalService.writeToTerminal(ws.sessionId, data);
    if (!success) {
      this.sendMessage(ws, {
        type: "error",
        data: "Failed to write to terminal",
        sessionId: ws.sessionId,
      });
    }
  }

  private sendMessage(ws: TerminalWebSocket, message: TerminalMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  stop() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.clients.clear();
    this.claudeCodeClients.clear();
    globalStarting = false;
  }
}

export const terminalWebSocketServer = TerminalWebSocketServer.getInstance();
