import { WebSocketServer, WebSocket } from "ws";
import { terminalService } from "../services/terminal.service";
import type { TerminalMessage } from "shared-types";

interface TerminalWebSocket extends WebSocket {
  sessionId?: string;
  userId?: string;
  isAlive?: boolean;
}

// Global singleton instance to prevent multiple server starts
let globalInstance: TerminalWebSocketServer | null = null;
let globalStarting: boolean = false;

class TerminalWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, TerminalWebSocket>();
  public port: number = 8000;

  static getInstance(): TerminalWebSocketServer {
    if (!globalInstance) {
      globalInstance = new TerminalWebSocketServer();
    }
    return globalInstance;
  }

  async start() {
    if (this.wss) {
      console.log("Terminal WebSocket server already started, skipping...");
      return;
    }

    if (globalStarting) {
      console.log("Terminal WebSocket server is already starting, skipping...");
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
        if (error instanceof Error && "code" in error && error.code === "EADDRINUSE" && attempts < maxAttempts - 1) {
          console.log(`Port ${port} in use, trying ${port + 1}`);
          port++;
          attempts++;
          continue;
        }
        throw error;
      }
    }

    this.wss.on("connection", (ws: TerminalWebSocket, request) => {
      // Filter out Vite HMR connections
      const protocol = request.headers["sec-websocket-protocol"];
      if (
        protocol &&
        (protocol.includes("vite-hmr") || protocol.includes("vite-ping"))
      ) {
        console.log(
          `[WebSocket] Rejecting Vite HMR connection with protocol: ${protocol}`
        );
        ws.close(1002, "Not a terminal connection");
        return;
      }

      console.log("[WebSocket] Accepted terminal connection");

      ws.isAlive = true;
      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", async data => {
        try {
          const message: TerminalMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error("[WebSocket] Error processing message:", error);
          this.sendMessage(ws, {
            type: "error",
            data: "Invalid message format",
            sessionId: ws.sessionId || "unknown",
          });
        }
      });

      ws.on("close", () => {
        console.log("WebSocket connection closed");
        if (ws.sessionId) {
          terminalService.terminateSession(ws.sessionId);
          this.clients.delete(ws.sessionId);
        }
      });

      ws.on("error", error => {
        console.error("WebSocket error:", error);
        if (ws.sessionId) {
          terminalService.terminateSession(ws.sessionId);
          this.clients.delete(ws.sessionId);
        }
      });
    });

    const pingInterval = setInterval(() => {
      if (this.wss) {
        this.wss.clients.forEach((ws: TerminalWebSocket) => {
          if (ws.isAlive === false) {
            if (ws.sessionId) {
              terminalService.terminateSession(ws.sessionId);
              this.clients.delete(ws.sessionId);
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
    console.log(`Terminal WebSocket server started on port ${this.port}`);
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
      console.error("Error handling message:", error);
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
        console.log(
          `[WebSocket] Session ${sessionId} already exists, closing duplicate connection`
        );
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

      const ptyProcess = await terminalService.spawnTerminal(session);

      // With node-pty, we only need to listen to 'data' events (combines stdout/stderr)
      ptyProcess.onData(data => {
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
    globalStarting = false;
  }
}

export const terminalWebSocketServer = TerminalWebSocketServer.getInstance();
