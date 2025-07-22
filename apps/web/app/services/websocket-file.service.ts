import type {
  WSFileMessage,
  FileContentMessage,
  SaveRequestMessage,
  SaveConfirmationMessage,
  ErrorMessage,
  ConnectionStatusMessage,
  TextChangeMessage,
  TextChangeAckMessage,
  WSConnection,
  FileSession,
  FileSaveRequest,
  TextDelta,
} from "shared-types";
import type { ILogger } from "../types/services";
import { createServiceLogger } from "../lib/logger";
import { FileSystemService } from "./filesystem.service";

/**
 * Service for managing WebSocket file operations
 */
export class WebSocketFileService {
  private logger: ILogger;
  private fileSystemService: FileSystemService;
  private connections = new Map<string, WSConnection>();
  private fileSessions = new Map<string, FileSession>();

  constructor(logger?: ILogger) {
    this.logger = logger || createServiceLogger("WebSocketFileService");
    this.fileSystemService = new FileSystemService(this.logger);
  }

  /**
   * Register a new WebSocket connection
   */
  registerConnection(
    connectionId: string,
    userId: string,
    workspaceName: string
  ): WSConnection {
    const connection: WSConnection = {
      id: connectionId,
      userId,
      workspaceName,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.connections.set(connectionId, connection);
    this.logger.info("WebSocket connection registered", {
      connectionId,
      userId,
      workspaceName,
    });

    return connection;
  }

  /**
   * Unregister a WebSocket connection
   */
  unregisterConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Remove connection from all file sessions
      for (const [filePath, session] of this.fileSessions.entries()) {
        session.connections = session.connections.filter(
          conn => conn.id !== connectionId
        );
        if (session.connections.length === 0) {
          this.fileSessions.delete(filePath);
          this.logger.debug("Removed empty file session", { filePath });
        }
      }

      this.connections.delete(connectionId);
      this.logger.info("WebSocket connection unregistered", { connectionId });
    }
  }

  /**
   * Update connection activity timestamp
   */
  updateConnectionActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * Handle incoming WebSocket file message
   */
  async handleMessage(
    connectionId: string,
    message: WSFileMessage,
    workspacePath: string
  ): Promise<WSFileMessage | null> {
    try {
      this.updateConnectionActivity(connectionId);

      switch (message.type) {
        case "file_content":
          return await this.handleFileContentRequest(
            connectionId,
            message,
            workspacePath
          );
        case "save_request":
          return await this.handleSaveRequest(
            connectionId,
            message as SaveRequestMessage,
            workspacePath
          );
        case "text_change":
          return await this.handleTextChangeRequest(
            connectionId,
            message as TextChangeMessage,
            workspacePath
          );
        case "connection_status":
          // This is just a status message, acknowledge it
          this.logger.debug("Connection status message received", {
            type: message.type,
            connectionId,
          });
          return null; // No response needed
        default:
          this.logger.warn("Unknown message type received", {
            type: message.type,
            connectionId,
          });
          return this.createErrorMessage(
            "Unknown message type",
            message.messageId
          );
      }
    } catch (error) {
      this.logger.error("Error handling WebSocket message", error as Error, {
        connectionId,
        messageType: message.type,
      });

      return this.createErrorMessage(
        error instanceof Error ? error.message : "Unknown error",
        message.messageId
      );
    }
  }

  /**
   * Handle file content request
   */
  private async handleFileContentRequest(
    connectionId: string,
    message: WSFileMessage,
    workspacePath: string
  ): Promise<FileContentMessage | ErrorMessage> {
    try {
      const filePath = message.payload?.path;
      if (!filePath) {
        return this.createErrorMessage(
          "File path is required",
          message.messageId
        );
      }

      // Get file content using existing file system service
      const fileContent = await this.fileSystemService.getFileContent(
        workspacePath,
        filePath
      );

      // Track file session
      this.trackFileSession(connectionId, filePath);

      const response: FileContentMessage = {
        type: "file_content",
        payload: {
          path: fileContent.path,
          content: fileContent.content,
          lastModified: new Date(), // TODO: Get actual last modified from filesystem
          mimeType: fileContent.mimeType,
        },
        messageId: message.messageId,
      };

      this.logger.debug("File content sent", {
        connectionId,
        filePath,
        contentLength: fileContent.content.length,
      });

      return response;
    } catch (error) {
      this.logger.error("Error getting file content", error as Error, {
        connectionId,
        filePath: message.payload?.path,
      });

      return this.createErrorMessage(
        error instanceof Error ? error.message : "Failed to get file content",
        message.messageId
      );
    }
  }

  /**
   * Handle save request
   */
  private async handleSaveRequest(
    connectionId: string,
    message: SaveRequestMessage,
    workspacePath: string
  ): Promise<SaveConfirmationMessage | ErrorMessage> {
    try {
      const { path, content, lastKnownModified } = message.payload;

      if (!path || content === undefined) {
        return this.createErrorMessage(
          "Path and content are required",
          message.messageId
        );
      }

      // Create save request for file system service
      const saveRequest: FileSaveRequest = {
        path,
        content,
        lastModified: lastKnownModified,
      };

      // Save file using existing file system service
      const saveResponse = await this.fileSystemService.saveFileContent(
        workspacePath,
        saveRequest
      );

      // Update file session
      this.updateFileSession(connectionId, path);

      const response: SaveConfirmationMessage = {
        type: "save_confirmation",
        payload: {
          success: saveResponse.success,
          message: saveResponse.message,
          newLastModified: saveResponse.newLastModified,
        },
        messageId: message.messageId,
      };

      this.logger.info("File saved via WebSocket", {
        connectionId,
        filePath: path,
        success: saveResponse.success,
      });

      return response;
    } catch (error) {
      this.logger.error("Error saving file", error as Error, {
        connectionId,
        filePath: message.payload?.path,
      });

      return this.createErrorMessage(
        error instanceof Error ? error.message : "Failed to save file",
        message.messageId
      );
    }
  }

  /**
   * Track file session for a connection
   */
  private trackFileSession(connectionId: string, filePath: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    let session = this.fileSessions.get(filePath);
    if (!session) {
      session = {
        filePath,
        connections: [],
        lastModified: new Date(),
        pendingChanges: [],
        version: 0,
        lastContent: "",
      };
      this.fileSessions.set(filePath, session);
    }

    // Add connection if not already present
    if (!session.connections.find(conn => conn.id === connectionId)) {
      session.connections.push(connection);
    }
  }

  /**
   * Handle text change request
   */
  private async handleTextChangeRequest(
    connectionId: string,
    message: TextChangeMessage,
    workspacePath: string
  ): Promise<TextChangeAckMessage | ErrorMessage> {
    try {
      const { path, changes, version } = message.payload;

      if (!path || !changes || version === undefined) {
        return this.createErrorMessage(
          "Path, changes, and version are required",
          message.messageId
        );
      }

      // Get or create file session
      this.trackFileSession(connectionId, path);
      const session = this.fileSessions.get(path);

      if (!session) {
        return this.createErrorMessage(
          "Failed to track file session",
          message.messageId
        );
      }

      // Handle version mismatch with basic operational transforms
      let transformedChanges = changes;

      if (version !== session.version) {
        this.logger.warn(
          "Version mismatch in text changes - applying transform",
          {
            connectionId,
            filePath: path,
            expectedVersion: session.version,
            receivedVersion: version,
            pendingChangesCount: session.pendingChanges.length,
          }
        );

        // Basic conflict resolution: if there are pending changes, we need to transform
        if (session.pendingChanges.length > 0) {
          // For this basic implementation, we'll merge the changes
          // In a real system, you'd use proper operational transforms
          this.logger.info("Merging concurrent changes", {
            connectionId,
            filePath: path,
            incomingChanges: changes.length,
            pendingChanges: session.pendingChanges.length,
          });

          // Apply timestamp-based ordering for conflict resolution
          transformedChanges = [...changes].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
          );
        }
      }

      // Apply changes to pending changes queue
      session.pendingChanges.push(...transformedChanges);
      session.version = Math.max(session.version, version) + 1;
      session.lastModified = new Date();

      // Update connection activity
      this.updateConnectionActivity(connectionId);

      // For now, we'll immediately acknowledge the changes
      // In a full implementation, we might batch changes or apply operational transforms
      const response: TextChangeAckMessage = {
        type: "text_change_ack",
        payload: {
          success: true,
          version: session.version,
          message: `Applied ${changes.length} text changes`,
        },
        messageId: message.messageId,
      };

      this.logger.debug("Text changes processed", {
        connectionId,
        filePath: path,
        changesCount: changes.length,
        newVersion: session.version,
      });

      return response;
    } catch (error) {
      this.logger.error("Error processing text changes", error as Error, {
        connectionId,
        filePath: message.payload?.path,
      });

      return this.createErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to process text changes",
        message.messageId
      );
    }
  }

  /**
   * Update file session timestamp
   */
  private updateFileSession(connectionId: string, filePath: string): void {
    const session = this.fileSessions.get(filePath);
    if (session) {
      session.lastModified = new Date();
    }
  }

  /**
   * Create error message
   */
  private createErrorMessage(
    message: string,
    messageId?: string
  ): ErrorMessage {
    return {
      type: "error",
      payload: {
        message,
      },
      messageId,
    };
  }

  /**
   * Create connection status message
   */
  createConnectionStatusMessage(
    status: "connected" | "disconnected" | "reconnecting"
  ): ConnectionStatusMessage {
    return {
      type: "connection_status",
      payload: {
        status,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Get active connections count
   */
  getActiveConnectionsCount(): number {
    return this.connections.size;
  }

  /**
   * Get active file sessions count
   */
  getActiveFileSessionsCount(): number {
    return this.fileSessions.size;
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): WSConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get file session by path
   */
  getFileSession(filePath: string): FileSession | undefined {
    return this.fileSessions.get(filePath);
  }
}
