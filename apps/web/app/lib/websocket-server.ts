import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { terminalService } from "../services/terminal.service";
import { cliService } from "../services/cli.service";
import { imageService } from "../services/image.service";
import type {
  TerminalMessage,
  ClaudeCodeMessage,
  SessionMapping,
  ImageUploadRequest,
} from "shared-types";
import { SessionService } from "../services/session.service";
import { createServiceLogger } from "./logger";

interface ClaudeStreamResponse {
  type: 'system' | 'message' | 'tool_use' | 'tool_result' | 'error' | 'assistant' | 'result';
  subtype?: string;
  session_id?: string;
  role?: 'user' | 'assistant';
  content?: Array<{type: string; text?: string}> | string;
  name?: string;
  input?: any;
  message?: {
    content: Array<{type: string; text?: string}>;
    role?: string;
  };
  result?: string;
}

interface TerminalWebSocket extends WebSocket {
  sessionId?: string;
  userId?: string;
  isAlive?: boolean;
}

interface ClaudeCodeWebSocket extends WebSocket {
  sessionId?: string;
  userId?: string;
  connectionType: "claude-code";
  isAlive?: boolean;
  lastHeartbeat?: number;
}

const logger = createServiceLogger("TerminalWebSocketServer");

// Configuration constants with environment variable support
const PING_INTERVAL = parseInt(process.env.WS_PING_INTERVAL || "5000", 10);
const HEARTBEAT_INTERVAL = parseInt(process.env.WS_HEARTBEAT_INTERVAL || "15000", 10);
const DEBUG_ENABLED = process.env.WS_DEBUG === "true" || process.env.NODE_ENV === "development";

// Global singleton instance to prevent multiple server starts
let globalInstance: TerminalWebSocketServer | null = null;
let globalStarting: boolean = false;

class TerminalWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, TerminalWebSocket>();
  private claudeCodeClients = new Map<string, ClaudeCodeWebSocket>();
  private activeSessions = new Map<string, SessionMapping>();
  private activeClaudeProcesses = new Map<string, string>(); // sessionId -> processId
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

    this.wss.on(
      "connection",
      (ws: TerminalWebSocket | ClaudeCodeWebSocket, request) => {
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
        const url = new URL(request.url || "/", "http://localhost");
        const connectionType = url.searchParams.get("type");

        if (connectionType === "claude-code") {
          this.handleClaudeCodeConnection(ws as ClaudeCodeWebSocket, request);
        } else {
          this.handleTerminalConnection(ws as TerminalWebSocket, request);
        }
      }
    );

    const pingInterval = setInterval(() => {
      if (this.wss) {
        if (DEBUG_ENABLED) {
          logger.debug("Starting ping interval check", { 
            activeClients: this.wss.clients.size,
            pingInterval: PING_INTERVAL 
          });
        }
        
        const now = Date.now();
        const heartbeatTimeout = HEARTBEAT_INTERVAL * 2; // Allow 2 missed heartbeats
        
        this.wss.clients.forEach(
          (ws: TerminalWebSocket | ClaudeCodeWebSocket) => {
            const isClaudeCodeClient = "connectionType" in ws && ws.connectionType === "claude-code";
            
            // For Claude Code clients, check both ping/pong and heartbeat
            if (isClaudeCodeClient) {
              const claudeWs = ws as ClaudeCodeWebSocket;
              
              // Check if heartbeat is overdue
              if (claudeWs.lastHeartbeat && (now - claudeWs.lastHeartbeat) > heartbeatTimeout) {
                logger.warn("Terminating Claude Code client due to missing heartbeat", {
                  sessionId: ws.sessionId,
                  lastHeartbeat: claudeWs.lastHeartbeat,
                  timeSinceLastHeartbeat: now - claudeWs.lastHeartbeat,
                  heartbeatTimeout
                });
                
                if (claudeWs.sessionId) {
                  this.claudeCodeClients.delete(claudeWs.sessionId);
                }
                return claudeWs.terminate();
              }
            }
            
            // Standard ping/pong check for all clients
            if (ws.isAlive === false) {
              logger.warn("Terminating unresponsive client", {
                sessionId: ws.sessionId,
                connectionType: isClaudeCodeClient ? "claude-code" : "terminal"
              });
              
              if (ws.sessionId) {
                if (isClaudeCodeClient) {
                  this.claudeCodeClients.delete(ws.sessionId);
                } else {
                  terminalService.terminateSession(ws.sessionId);
                  this.clients.delete(ws.sessionId);
                }
              }
              return ws.terminate();
            }
            
            if (DEBUG_ENABLED) {
              logger.debug("Sending ping to client", {
                sessionId: ws.sessionId,
                connectionType: isClaudeCodeClient ? "claude-code" : "terminal"
              });
            }
            
            ws.isAlive = false;
            ws.ping();
          }
        );
      }
    }, PING_INTERVAL);

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
      logger.debug("Received pong from terminal client", {
        sessionId: ws.sessionId,
        timestamp: new Date().toISOString()
      });
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

  private async handleClaudeCodeConnection(
    ws: ClaudeCodeWebSocket,
    request: IncomingMessage
  ) {
    logger.info("Accepted Claude Code connection", {
      url: request.url,
      headers: request.headers,
      remoteAddress: request.socket.remoteAddress
    });

    ws.connectionType = "claude-code";
    ws.isAlive = true;
    ws.lastHeartbeat = Date.now(); // Initialize heartbeat timestamp
    
    ws.on("pong", () => {
      logger.debug("Received pong from Claude Code client", {
        sessionId: ws.sessionId,
        userId: ws.userId,
        timestamp: new Date().toISOString()
      });
      ws.isAlive = true;
    });

    // Authentication for Claude Code connections
    try {
      logger.debug("Starting Claude Code authentication");
      const userId = await this.authenticateClaudeCodeConnection(request);
      if (!userId) {
        logger.warn("Unauthenticated Claude Code connection rejected", {
          url: request.url,
          headers: request.headers
        });
        ws.close(1008, "Authentication required");
        return;
      }
      logger.info("Claude Code connection authenticated successfully", {
        userId,
        url: request.url
      });
      ws.userId = userId;
    } catch (error) {
      logger.error(
        "Authentication error for Claude Code connection",
        error as Error,
        {
          url: request.url,
          headers: request.headers
        }
      );
      ws.close(1008, "Authentication failed");
      return;
    }

    ws.on("message", async data => {
      try {
        const message: ClaudeCodeMessage = JSON.parse(data.toString());
        await this.handleClaudeCodeMessage(ws, message);
      } catch (error) {
        logger.error(
          "Error processing Claude Code WebSocket message",
          error as Error,
          {
            sessionId: ws.sessionId,
            userId: ws.userId,
          }
        );
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
        userId: ws.userId,
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

  private async authenticateClaudeCodeConnection(
    request: IncomingMessage
  ): Promise<string | null> {
    try {
      let cookie = request.headers.cookie;
      logger.debug("Claude Code authentication attempt", {
        hasCookieHeader: !!cookie,
        cookieHeader: cookie,
        url: request.url
      });

      // Check for userId directly in query params (new method)
      if (!cookie && request.url) {
        const url = new URL(request.url, "http://localhost");
        const userIdFromQuery = url.searchParams.get("userId");
        
        if (userIdFromQuery) {
          logger.debug("Found userId in query params", { userIdFromQuery });
          // For userId from query, we can return it directly since it's already validated
          return decodeURIComponent(userIdFromQuery);
        }
        
        // Fallback: try to get session from query string (old method)
        const sessionFromQuery = url.searchParams.get("session");
        logger.debug("Extracting session from query", {
          sessionFromQuery,
          hasSessionFromQuery: !!sessionFromQuery
        });
        if (sessionFromQuery) {
          cookie = `__session=${decodeURIComponent(sessionFromQuery)}`;
          logger.debug("Created cookie from query", { cookie });
        }
      }

      if (!cookie) {
        logger.warn("No cookie found for Claude Code authentication");
        return null;
      }

      // Create a minimal Request object for SessionService
      const mockRequest = new Request("http://localhost", {
        headers: { Cookie: cookie },
      });

      const userId = await SessionService.getUserId(mockRequest);
      logger.debug("SessionService.getUserId result", {
        userId,
        hasUserId: !!userId
      });
      return userId || null;
    } catch (error) {
      logger.error(
        "Error authenticating Claude Code connection",
        error as Error
      );
      return null;
    }
  }

  private async handleClaudeCodeMessage(
    ws: ClaudeCodeWebSocket,
    message: ClaudeCodeMessage
  ) {
    try {
      // Process message based on type
      switch (message.type) {
        case "heartbeat":
          await this.handleHeartbeat(ws, message);
          break;
        case "start_session":
          await this.handleStartSession(ws, message);
          break;
        case "stop_session":
          await this.handleStopSession(ws, message);
          break;
        case "input":
          await this.handleSessionInput(ws, message);
          break;
        case "upload_image":
          await this.handleImageUpload(ws, message);
          break;
        case "exit":
          // Handle client exit
          logger.info("Claude Code client exiting", {
            sessionId: message.sessionId,
            userId: ws.userId,
          });
          if (message.sessionId) {
            await this.handleStopSession(ws, message);
            this.claudeCodeClients.delete(message.sessionId);
          }
          ws.close();
          break;
        default:
          logger.warn("Unknown Claude Code message type", {
            type: message.type,
            sessionId: message.sessionId,
          });
      }
    } catch (error) {
      logger.error(
        "Error handling Claude Code WebSocket message",
        error as Error,
        {
          sessionId: message.sessionId,
        }
      );
      this.sendClaudeCodeMessage(ws, {
        type: "error",
        data: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        sessionId: message.sessionId,
      });
    }
  }

  private async handleHeartbeat(
    ws: ClaudeCodeWebSocket,
    message: ClaudeCodeMessage
  ) {
    try {
      logger.debug("Received heartbeat from Claude Code client", {
        sessionId: message.sessionId,
        userId: ws.userId,
        timestamp: message.timestamp
      });
      
      // Update client's last heartbeat timestamp
      ws.lastHeartbeat = Date.now();
      ws.isAlive = true;
      
      // Optional: Send heartbeat acknowledgment
      this.sendClaudeCodeMessage(ws, {
        type: "heartbeat",
        sessionId: message.sessionId,
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error("Error handling heartbeat", error as Error, {
        sessionId: message.sessionId,
        userId: ws.userId,
      });
    }
  }

  private async handleStartSession(
    ws: ClaudeCodeWebSocket,
    message: ClaudeCodeMessage
  ) {
    try {
      if (!message.workspacePath || !message.sessionId) {
        throw new Error(
          "Missing required parameters: workspacePath and sessionId"
        );
      }

      logger.info("Starting Claude Code session", {
        sessionId: message.sessionId,
        workspacePath: message.workspacePath,
        command: message.command,
        commandType: typeof message.command,
        userId: ws.userId,
      });

      // Check if session already exists
      if (this.activeSessions.has(message.sessionId)) {
        throw new Error("Session already exists");
      }

      // Start the Claude Code process
      const result = await cliService.startProcess(
        message.workspacePath,
        message.sessionId,
        message.command,
        undefined,
        undefined,
        message.imageIds
      );

      // Store session mapping
      const sessionMapping: SessionMapping = {
        pid: result.pid,
        websocketConnection: ws as any,
        startTime: new Date(),
        workspacePath: message.workspacePath,
      };

      this.activeSessions.set(message.sessionId, sessionMapping);
      this.claudeCodeClients.set(message.sessionId, ws);
      ws.sessionId = message.sessionId;

      // Setup output redirection
      const childProcess = cliService.getProcess(message.sessionId);
      logger.info("Setting up output redirection for start_session", {
        sessionId: message.sessionId,
        processFound: !!childProcess,
        pid: childProcess?.pid,
        hasStdout: !!childProcess?.stdout,
        hasStderr: !!childProcess?.stderr
      });
      if (childProcess) {
        this.setupProcessOutputHandling(childProcess, ws, message.sessionId);
      } else {
        logger.error("No process found when setting up output redirection", {
          sessionId: message.sessionId
        });
      }

      // Send success response
      this.sendClaudeCodeMessage(ws, {
        type: "session_started",
        sessionId: message.sessionId,
        status: "success",
      });
    } catch (error) {
      logger.error("Failed to start Claude Code session", error as Error, {
        sessionId: message.sessionId,
        workspacePath: message.workspacePath,
      });

      this.sendClaudeCodeMessage(ws, {
        type: "session_started",
        sessionId: message.sessionId,
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private setupProcessOutputHandling(
    childProcess: any,
    ws: ClaudeCodeWebSocket,
    sessionId: string
  ) {
    // Track Claude session ID for resume operations
    let claudeSessionId: string | null = null;

    logger.info("Setting up process output handlers", {
      sessionId,
      pid: childProcess.pid
    });

    childProcess.stdout?.on("data", (data: Buffer) => {
      const rawOutput = data.toString();
      logger.debug("STDOUT data received", {
        sessionId,
        dataLength: rawOutput.length,
        preview: rawOutput.substring(0, 100)
      });
      
      // Split by lines and filter empty lines (like claudecodeui)
      const lines = rawOutput.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          // Try to parse as JSON
          const response = JSON.parse(line) as any;
          logger.debug("Parsed JSON response", { sessionId, type: response.type });
          
          // Capture Claude session ID for future resume operations
          if (response.type === 'system' && response.subtype === 'init' && response.session_id) {
            claudeSessionId = response.session_id;
            if (claudeSessionId) {
              cliService.setClaudeSessionId(sessionId, claudeSessionId);
            }
            logger.info("Claude session ID captured", { 
              sessionId, 
              claudeSessionId: claudeSessionId || undefined
            });
          }
          
          // Send raw response to client for processing
          this.sendClaudeCodeMessage(ws, {
            type: "claude_response" as any,
            data: JSON.stringify(response), // Convert object to string like claudecodeui
            sessionId,
          });
          
        } catch (parseError) {
          // Send non-JSON as plain text output
          if (line.trim()) {
            logger.debug("Non-JSON output", { sessionId, line });
            this.sendClaudeCodeMessage(ws, {
              type: "stdout" as any,
              data: line,
              sessionId,
            });
          }
        }
      }
    });

    childProcess.stderr?.on("data", (data: Buffer) => {
      const chunk = data.toString();
      logger.warn("STDERR data received", {
        sessionId,
        dataLength: chunk.length,
        data: chunk.substring(0, 100)
      });
      
      // Send stderr as error message
      this.sendClaudeCodeMessage(ws, {
        type: "error",
        data: chunk,
        sessionId,
      });
    });

    childProcess.on("exit", (code: number | null, signal: string | null) => {
      logger.info("Process exit detected", {
        sessionId,
        exitCode: code ?? undefined,
        signal: signal ?? undefined,
        claudeSessionId: claudeSessionId || undefined,
        killed: childProcess.killed,
        pid: childProcess.pid
      });
      
      // Send completion message
      this.sendClaudeCodeMessage(ws, {
        type: "process_exit" as any,
        data: JSON.stringify({ 
          code: code ?? undefined, 
          signal: signal ?? undefined, 
          claudeSessionId: claudeSessionId || undefined 
        }),
        sessionId,
      });
      
      logger.info("Claude process completed", {
        sessionId,
        claudeSessionId: claudeSessionId || undefined,
        exitCode: code ?? undefined
      });
      // Find which session this process belongs to
      let ownerSessionId: string | null = null;
      for (const [sessId, procId] of this.activeClaudeProcesses.entries()) {
        if (procId === sessionId) {
          ownerSessionId = sessId;
          break;
        }
      }
      
      if (ownerSessionId) {
        this.activeClaudeProcesses.delete(ownerSessionId);
        logger.info("Removed active process tracking, next command can now run", {
          sessionId: ownerSessionId,
          processId: sessionId
        });
        
        // Send completion signal to indicate command is done
        this.sendClaudeCodeMessage(ws, {
          type: "message" as any,
          data: "claude-complete", // Like claudecodeui does
          sessionId: ownerSessionId,
        });
      }

      // Don't delete the WebSocket session - only remove the process reference
      // this.activeSessions.delete(sessionId); // Keep session alive
      // this.claudeCodeClients.delete(sessionId); // Keep client alive
    });
  }

  private async handleStopSession(
    ws: ClaudeCodeWebSocket,
    message: ClaudeCodeMessage
  ) {
    try {
      if (!message.sessionId) {
        throw new Error("Missing sessionId");
      }

      logger.info("Stopping Claude Code session (user requested)", {
        sessionId: message.sessionId,
        userId: ws.userId,
      });

      const sessionMapping = this.activeSessions.get(message.sessionId);
      if (!sessionMapping) {
        this.sendClaudeCodeMessage(ws, {
          type: "session_stopped",
          sessionId: message.sessionId,
          message: "Session not found",
        });
        return;
      }

      // Stop the process
      const success = cliService.stopProcess(message.sessionId);

      if (success) {
        // For user-initiated stop, actually clean up the session
        this.activeSessions.delete(message.sessionId);
        this.claudeCodeClients.delete(message.sessionId);
        this.activeClaudeProcesses.delete(message.sessionId); // Clean up process tracking

        this.sendClaudeCodeMessage(ws, {
          type: "session_stopped",
          sessionId: message.sessionId,
        });
        
        logger.info("User-initiated session cleanup completed", {
          sessionId: message.sessionId
        });
      } else {
        throw new Error("Failed to stop process");
      }
    } catch (error) {
      logger.error("Failed to stop Claude Code session", error as Error, {
        sessionId: message.sessionId,
      });

      this.sendClaudeCodeMessage(ws, {
        type: "error",
        data: `Failed to stop session: ${error instanceof Error ? error.message : "Unknown error"}`,
        sessionId: message.sessionId,
      });
    }
  }

  private async handleSessionInput(
    ws: ClaudeCodeWebSocket,
    message: ClaudeCodeMessage
  ) {
    try {
      if (!message.sessionId || !message.data) {
        throw new Error("Missing sessionId or data");
      }

      logger.info("Handling session input for new print command", {
        sessionId: message.sessionId,
        dataLength: message.data.length,
        data: message.data.substring(0, 100)
      });
      
      // Check if there's already an active process for this session (sequential blocking)
      const activeProcessId = this.activeClaudeProcesses.get(message.sessionId);
      if (activeProcessId) {
        const activeProcess = cliService.getProcess(activeProcessId);
        if (activeProcess && !activeProcess.killed) {
          logger.warn("Rejecting command - process already active for session", {
            sessionId: message.sessionId,
            activeProcessId,
            activePid: activeProcess.pid
          });
          
          this.sendClaudeCodeMessage(ws, {
            type: "error",
            data: "Another command is already running. Please wait for it to complete.",
            sessionId: message.sessionId,
          });
          return;
        } else {
          // Clean up stale reference
          this.activeClaudeProcesses.delete(message.sessionId);
        }
      }

      // Get the existing Claude session ID for resume
      const claudeSessionId = cliService.getClaudeSessionId(message.sessionId);
      
      // Generate unique process ID for each command (like claudecodeui does)
      const processId = `${message.sessionId}_${Date.now()}`;
      
      logger.info("Starting new Claude process for command", {
        sessionId: message.sessionId,
        processId,
        command: message.data,
        claudeSessionId: claudeSessionId || undefined
      });
      
      // Start new process with print command and resume session if available
      const result = await cliService.startProcess(
        message.workspacePath || process.cwd(),
        processId, // Use unique process ID
        message.data,
        undefined,
        claudeSessionId || undefined,
        message.imageIds
      );
      
      // Update or create the session mapping using the unique processId
      const sessionMapping: SessionMapping = {
        pid: result.pid,
        websocketConnection: ws as any,
        startTime: new Date(),
        workspacePath: message.workspacePath || process.cwd(),
      };

      this.activeSessions.set(processId, sessionMapping);
      this.claudeCodeClients.set(message.sessionId, ws); // Keep WebSocket mapping with original sessionId
      this.activeClaudeProcesses.set(message.sessionId, processId); // Track active process for sequential blocking
      
      logger.info("Process mapping created for new print command", {
        sessionId: message.sessionId,
        processId,
        pid: result.pid
      });
      
      // Setup output redirection for the new process
      const childProcess = cliService.getProcess(processId);
      logger.info("Setting up output redirection for session input", {
        sessionId: message.sessionId,
        processId,
        processFound: !!childProcess,
        pid: childProcess?.pid,
        hasStdout: !!childProcess?.stdout,
        hasStderr: !!childProcess?.stderr
      });
      if (childProcess) {
        this.setupProcessOutputHandling(childProcess, ws, message.sessionId);
      } else {
        logger.error("No process found when setting up output redirection for session input", {
          sessionId: message.sessionId,
          processId
        });
      }
      
    } catch (error) {
      logger.error(
        "Failed to handle session input",
        error as Error,
        {
          sessionId: message.sessionId,
        }
      );

      this.sendClaudeCodeMessage(ws, {
        type: "error",
        data: `Failed to handle input: ${error instanceof Error ? error.message : "Unknown error"}`,
        sessionId: message.sessionId,
      });
    }
  }

  private async handleImageUpload(
    ws: ClaudeCodeWebSocket,
    message: ClaudeCodeMessage
  ) {
    try {
      if (!message.imageData) {
        throw new Error("Missing image data");
      }

      logger.info("Handling image upload", {
        sessionId: message.sessionId,
        filename: message.imageData.filename,
        mimeType: message.imageData.mimeType,
        dataLength: message.imageData.data.length
      });

      // Validate image type
      if (!imageService.validateImageType(message.imageData.mimeType)) {
        throw new Error(`Unsupported image type: ${message.imageData.mimeType}`);
      }

      // Decode base64 image data
      const imageBuffer = Buffer.from(message.imageData.data, 'base64');
      
      // Validate image size
      if (!imageService.validateImageSize(imageBuffer.length)) {
        throw new Error(`Image too large: ${imageBuffer.length} bytes`);
      }

      // Save temporary image
      const imageId = await imageService.saveTemporaryImage(
        imageBuffer,
        message.imageData.filename,
        message.imageData.mimeType
      );

      // Send success response
      this.sendClaudeCodeMessage(ws, {
        type: "upload_image" as any,
        sessionId: message.sessionId,
        status: "success",
        data: JSON.stringify({ imageId })
      });

    } catch (error) {
      logger.error("Failed to handle image upload", error as Error, {
        sessionId: message.sessionId,
      });

      this.sendClaudeCodeMessage(ws, {
        type: "upload_image" as any,
        sessionId: message.sessionId,
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  private sendClaudeCodeMessage(
    ws: ClaudeCodeWebSocket,
    message: ClaudeCodeMessage
  ) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Method to send message to specific Claude Code client
  public sendToClaudeCodeClient(
    sessionId: string,
    message: ClaudeCodeMessage
  ): boolean {
    const client = this.claudeCodeClients.get(sessionId);
    if (client && client.readyState === WebSocket.OPEN) {
      this.sendClaudeCodeMessage(client, message);
      return true;
    }
    return false;
  }

  // Method to broadcast to all Claude Code clients for a user
  public broadcastToUserClaudeCodeClients(
    userId: string,
    message: ClaudeCodeMessage
  ): number {
    let sentCount = 0;
    this.claudeCodeClients.forEach(client => {
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

    // Clean up all active Claude Code sessions
    for (const sessionId of this.activeSessions.keys()) {
      cliService.stopProcess(sessionId);
    }

    this.clients.clear();
    this.claudeCodeClients.clear();
    this.activeSessions.clear();
    this.activeClaudeProcesses.clear();
    globalStarting = false;
  }
}

export const terminalWebSocketServer = TerminalWebSocketServer.getInstance();
