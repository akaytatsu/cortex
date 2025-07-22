import { WebSocketServer, WebSocket } from "ws";
import type { WSFileMessage } from "shared-types";
import { createServiceLogger } from "./logger";
import { WebSocketFileService } from "../services/websocket-file.service";
import { serviceContainer } from "./service-container";

interface FileWebSocket extends WebSocket {
  connectionId?: string;
  userId?: string;
  workspaceName?: string;
  isAlive?: boolean;
}

const logger = createServiceLogger("FileWebSocketServer");

// Global singleton instance to prevent multiple server starts
let globalInstance: FileWebSocketServer | null = null;
let globalStarting: boolean = false;

// Clean up on process exit
if (typeof process !== "undefined") {
  const cleanup = () => {
    if (globalInstance) {
      globalInstance.stop();
      globalInstance = null;
    }
    globalStarting = false;
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);
}

export class FileWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, FileWebSocket>();
  private fileService: WebSocketFileService;
  public port: number = 8001; // Different port from terminal WebSocket

  constructor() {
    this.fileService = new WebSocketFileService();
  }

  static getInstance(): FileWebSocketServer {
    if (!globalInstance) {
      globalInstance = new FileWebSocketServer();
    }
    return globalInstance;
  }

  async start() {
    if (this.wss && this.wss.readyState === this.wss.OPEN) {
      logger.debug("File WebSocket server already running on port", {
        port: this.port,
      });
      return;
    }

    if (globalStarting) {
      logger.warn("File WebSocket server is already starting, skipping");
      return;
    }

    globalStarting = true;
    logger.info("Starting File WebSocket server...");

    // Find available port
    let port = this.port;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        this.wss = new WebSocketServer({ port });
        this.port = port; // Save the successful port
        logger.info("File WebSocket server bound to port", { port });
        break;
      } catch (error: unknown) {
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
        globalStarting = false;
        logger.error("Failed to start File WebSocket server", error as Error);
        throw error;
      }
    }

    this.wss.on("connection", (ws: FileWebSocket) => {
      // Generate unique connection ID
      const connectionId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      logger.info("Accepted file WebSocket connection", { connectionId });

      ws.connectionId = connectionId;
      ws.isAlive = true;

      // For now, we'll skip auth validation in development
      const userId = "dev-user"; // In production, extract from session/auth
      ws.userId = userId;

      this.clients.set(connectionId, ws);

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", async data => {
        try {
          logger.info("Received WebSocket message", {
            connectionId: ws.connectionId,
            dataLength: data.toString().length,
            rawData: data.toString(),
          });
          const message: WSFileMessage = JSON.parse(data.toString());
          logger.info("Parsed WebSocket message", {
            connectionId: ws.connectionId,
            messageType: message.type,
            messageId: message.messageId,
          });
          await this.handleMessage(ws, message);
        } catch (error) {
          logger.error("Error processing WebSocket message", error as Error, {
            connectionId: ws.connectionId,
          });
          this.sendMessage(ws, {
            type: "error",
            payload: {
              message: "Invalid message format",
            },
            messageId: undefined,
          });
        }
      });

      ws.on("close", () => {
        logger.info("File WebSocket connection closed", {
          connectionId: ws.connectionId,
        });
        if (ws.connectionId) {
          this.fileService.unregisterConnection(ws.connectionId);
          this.clients.delete(ws.connectionId);
        }
      });

      ws.on("error", error => {
        logger.error("File WebSocket connection error", error as Error, {
          connectionId: ws.connectionId,
        });
        if (ws.connectionId) {
          this.fileService.unregisterConnection(ws.connectionId);
          this.clients.delete(ws.connectionId);
        }
      });

      // Send connection status
      this.sendMessage(
        ws,
        this.fileService.createConnectionStatusMessage("connected")
      );
    });

    // Setup ping/pong for connection health monitoring
    const pingInterval = setInterval(() => {
      if (this.wss) {
        this.wss.clients.forEach((ws: FileWebSocket) => {
          if (ws.isAlive === false) {
            if (ws.connectionId) {
              this.fileService.unregisterConnection(ws.connectionId);
              this.clients.delete(ws.connectionId);
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
    logger.info("File WebSocket server started", { port: this.port });
  }

  private async handleMessage(ws: FileWebSocket, message: WSFileMessage) {
    try {
      if (!ws.connectionId || !ws.userId) {
        this.sendMessage(ws, {
          type: "error",
          payload: {
            message: "Connection not properly initialized",
          },
          messageId: message.messageId,
        });
        return;
      }

      // Handle workspace registration
      if (message.payload?.workspaceName && !ws.workspaceName) {
        ws.workspaceName = message.payload.workspaceName;
        this.fileService.registerConnection(
          ws.connectionId,
          ws.userId,
          ws.workspaceName
        );
      }

      if (!ws.workspaceName) {
        this.sendMessage(ws, {
          type: "error",
          payload: {
            message: "Workspace name is required",
          },
          messageId: message.messageId,
        });
        return;
      }

      // Get workspace path
      const workspaceService = serviceContainer.getWorkspaceService();
      const workspace = await workspaceService.getWorkspaceByName(
        ws.workspaceName
      );
      if (!workspace) {
        this.sendMessage(ws, {
          type: "error",
          payload: {
            message: `Workspace '${ws.workspaceName}' not found`,
          },
          messageId: message.messageId,
        });
        return;
      }

      // Handle the message using file service
      const response = await this.fileService.handleMessage(
        ws.connectionId,
        message,
        workspace.path
      );

      if (response) {
        this.sendMessage(ws, response);
      }
    } catch (error) {
      logger.error("Error handling WebSocket message", error as Error, {
        connectionId: ws.connectionId,
        messageType: message.type,
      });
      this.sendMessage(ws, {
        type: "error",
        payload: {
          message: error instanceof Error ? error.message : "Unknown error",
        },
        messageId: message.messageId,
      });
    }
  }

  private sendMessage(ws: FileWebSocket, message: WSFileMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Get server port
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Get active connections count
   */
  getActiveConnectionsCount(): number {
    return this.clients.size;
  }

  /**
   * Stop the server
   */
  stop() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.clients.clear();
    globalStarting = false;
    logger.info("File WebSocket server stopped");
  }

  /**
   * Reset global state (useful for development hot reload)
   */
  static reset() {
    if (globalInstance) {
      globalInstance.stop();
      globalInstance = null;
    }
    globalStarting = false;
  }
}

export const fileWebSocketServer = FileWebSocketServer.getInstance();
