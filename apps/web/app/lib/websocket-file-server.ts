import { WebSocketServer, WebSocket } from "ws";
import type { WSFileMessage, ExternalChangeMessage } from "shared-types";
import { createServiceLogger } from "./logger";
import { WebSocketFileService } from "../services/websocket-file.service";
import { serviceContainer } from "./service-container";
import { getFileWatcherService } from "../services/file-watcher.service";

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
  private fileWatcherService = getFileWatcherService();
  private workspaceWatchers = new Map<string, Set<string>>(); // workspace -> connectionIds
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
    if (this.wss) {
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

    this.wss!.on("connection", (ws: FileWebSocket) => {
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
          
          // Remove from workspace watchers
          if (ws.workspaceName) {
            this.removeConnectionFromWorkspaceWatching(ws.workspaceName, ws.connectionId);
          }
        }
      });

      ws.on("error", error => {
        logger.error("File WebSocket connection error", error as Error, {
          connectionId: ws.connectionId,
        });
        if (ws.connectionId) {
          this.fileService.unregisterConnection(ws.connectionId);
          this.clients.delete(ws.connectionId);
          
          // Remove from workspace watchers
          if (ws.workspaceName) {
            this.removeConnectionFromWorkspaceWatching(ws.workspaceName, ws.connectionId);
          }
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
      if ((message.payload as any)?.workspaceName && !ws.workspaceName) {
        ws.workspaceName = (message.payload as any).workspaceName;
        this.fileService.registerConnection(
          ws.connectionId,
          ws.userId,
          ws.workspaceName
        );
        
        // Start watching workspace if not already watching
        await this.setupWorkspaceWatching(ws.workspaceName, ws.connectionId);
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
        ws.workspaceName!
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
   * Setup file watching for a workspace
   */
  private async setupWorkspaceWatching(workspaceName: string, connectionId: string): Promise<void> {
    try {
      // Get workspace path
      const workspaceService = serviceContainer.getWorkspaceService();
      const workspace = await workspaceService.getWorkspaceByName(workspaceName);
      if (!workspace) {
        logger.warn("Cannot setup file watching - workspace not found", { workspaceName });
        return;
      }

      // Add connection to workspace watchers
      let connections = this.workspaceWatchers.get(workspaceName);
      if (!connections) {
        connections = new Set();
        this.workspaceWatchers.set(workspaceName, connections);
      }
      connections.add(connectionId);

      // Setup file watcher callback if first connection for this workspace
      if (connections.size === 1) {
        await this.fileWatcherService.watchWorkspace(
          workspaceName,
          workspace.path,
          (message: ExternalChangeMessage) => {
            this.broadcastToWorkspace(workspaceName, message);
          }
        );
        logger.info("Started file watching for workspace", { workspaceName });
      } else {
        logger.debug("Added connection to existing workspace watcher", {
          workspaceName,
          connectionCount: connections.size,
        });
      }
    } catch (error) {
      logger.error("Failed to setup workspace watching", error as Error, {
        workspaceName,
        connectionId,
      });
    }
  }

  /**
   * Remove connection from workspace watching
   */
  private async removeConnectionFromWorkspaceWatching(workspaceName: string, connectionId: string): Promise<void> {
    try {
      const connections = this.workspaceWatchers.get(workspaceName);
      if (!connections) {
        return;
      }

      connections.delete(connectionId);

      // If no more connections for this workspace, stop watching
      if (connections.size === 0) {
        this.workspaceWatchers.delete(workspaceName);
        await this.fileWatcherService.unwatchWorkspace(workspaceName);
        logger.info("Stopped file watching for workspace", { workspaceName });
      } else {
        logger.debug("Removed connection from workspace watcher", {
          workspaceName,
          remainingConnections: connections.size,
        });
      }
    } catch (error) {
      logger.error("Failed to remove connection from workspace watching", error as Error, {
        workspaceName,
        connectionId,
      });
    }
  }

  /**
   * Broadcast message to all connections watching a workspace
   */
  private broadcastToWorkspace(workspaceName: string, message: ExternalChangeMessage): void {
    const connections = this.workspaceWatchers.get(workspaceName);
    if (!connections) {
      return;
    }

    logger.debug("Broadcasting external change to workspace connections", {
      workspaceName,
      changeType: message.payload.changeType,
      filePath: message.payload.path,
      connectionCount: connections.size,
    });

    for (const connectionId of connections) {
      const ws = this.clients.get(connectionId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, message);
      } else {
        // Clean up dead connections
        connections.delete(connectionId);
      }
    }
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
