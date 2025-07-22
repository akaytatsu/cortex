import { WebSocketServer, WebSocket } from "ws";
import { terminalService } from "../services/terminal.service";
import type { TerminalMessage } from "shared-types";

interface TerminalWebSocket extends WebSocket {
  sessionId?: string;
  userId?: string;
  isAlive?: boolean;
}

class TerminalWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, TerminalWebSocket>();

  start(server: unknown) {
    this.wss = new WebSocketServer({ 
      server,
      path: "/ws/terminal",
    });

    this.wss.on("connection", (ws: TerminalWebSocket) => {
      console.log("New WebSocket connection for terminal");
      
      ws.isAlive = true;
      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", async (data) => {
        try {
          const message: TerminalMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
          this.sendMessage(ws, {
            type: "error",
            data: "Invalid message format",
            sessionId: ws.sessionId || "unknown"
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

      ws.on("error", (error) => {
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

    console.log("Terminal WebSocket server started on path /ws/terminal");
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
        sessionId: message.sessionId
      });
    }
  }

  private async handleInit(ws: TerminalWebSocket, data: Record<string, unknown>, sessionId: string) {
    try {
      // For now, we'll skip auth validation in development
      const userId = "dev-user"; // In production, extract from session/auth
      
      const session = await terminalService.createSession(
        data.workspaceName as string,
        data.workspacePath as string,
        userId
      );

      session.id = sessionId;
      ws.sessionId = sessionId;
      ws.userId = userId;

      this.clients.set(sessionId, ws);

      const childProcess = await terminalService.spawnTerminal(session);

      childProcess.stdout?.on("data", (data) => {
        this.sendMessage(ws, {
          type: "output",
          data: data.toString(),
          sessionId
        });
      });

      childProcess.stderr?.on("data", (data) => {
        this.sendMessage(ws, {
          type: "error",
          data: data.toString(),
          sessionId
        });
      });

      childProcess.on("exit", (code, signal) => {
        this.sendMessage(ws, {
          type: "exit",
          data: `Process exited with code ${code}, signal: ${signal}`,
          sessionId
        });
        this.clients.delete(sessionId);
      });

      console.log(`Terminal session initialized: ${sessionId} for workspace: ${data.workspaceName}`);
      
    } catch (error) {
      console.error("Error initializing terminal session:", error);
      this.sendMessage(ws, {
        type: "error",
        data: `Failed to initialize terminal: ${error instanceof Error ? error.message : "Unknown error"}`,
        sessionId
      });
    }
  }

  private handleResize(ws: TerminalWebSocket) {
    if (!ws.sessionId) return;
    
    const success = terminalService.resizeTerminal(ws.sessionId);
    if (!success) {
      this.sendMessage(ws, {
        type: "error",
        data: "Failed to resize terminal",
        sessionId: ws.sessionId
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
        sessionId: ws.sessionId
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
  }
}

export const terminalWebSocketServer = new TerminalWebSocketServer();