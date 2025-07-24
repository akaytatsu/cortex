export interface User {
  id: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// Public user interface without password for client-side usage
export interface UserPublic {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  name: string;
  path: string;
}

export interface FileSystemItem {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileSystemItem[];
}

export interface FileContent {
  path: string;
  content: string;
  mimeType: string;
}

export interface FileSaveRequest {
  path: string;
  content: string;
  lastModified?: Date; // for conflict detection
}

export interface FileSaveResponse {
  success: boolean;
  message?: string;
  newLastModified?: Date;
}

export interface TerminalSession {
  id: string;
  workspaceName: string;
  workspacePath: string;
  userId: string;
  pid?: number;
  status: "active" | "inactive" | "terminated";
  createdAt: Date;
}

export interface TerminalMessage {
  type: "input" | "output" | "error" | "exit";
  data: string;
  sessionId: string;
}

// WebSocket messages for file operations
export interface WSFileMessage {
  type:
    | "file_content"
    | "file_change"
    | "save_request"
    | "save_confirmation"
    | "file_created"
    | "file_deleted"
    | "error"
    | "connection_status"
    | "text_change"
    | "text_change_ack"
    | "file_conflict"
    | "external_change";
  payload: unknown;
  messageId?: string; // for request/response correlation
}

export interface FileContentMessage extends WSFileMessage {
  type: "file_content";
  payload: {
    path: string;
    content: string;
    lastModified: Date;
    mimeType: string;
  };
}

export interface FileChangeMessage extends WSFileMessage {
  type: "file_change";
  payload: {
    path: string;
    changes: TextDelta[];
    timestamp: Date;
  };
}

export interface SaveRequestMessage extends WSFileMessage {
  type: "save_request";
  payload: {
    path: string;
    content: string;
    lastKnownModified?: Date;
    workspaceName: string;
  };
  messageId: string;
}

export interface SaveConfirmationMessage extends WSFileMessage {
  type: "save_confirmation";
  payload: {
    success: boolean;
    message?: string;
    newLastModified?: Date;
  };
  messageId: string;
}

export interface ErrorMessage extends WSFileMessage {
  type: "error";
  payload: {
    message: string;
    code?: string;
  };
  messageId?: string;
}

export interface ConnectionStatusMessage extends WSFileMessage {
  type: "connection_status";
  payload: {
    status: "connected" | "disconnected" | "reconnecting";
    timestamp: Date;
  };
}

export interface TextChangeMessage extends WSFileMessage {
  type: "text_change";
  payload: {
    path: string;
    changes: TextDelta[];
    version: number; // for operational transforms
    timestamp: Date;
  };
  messageId: string;
}

export interface TextChangeAckMessage extends WSFileMessage {
  type: "text_change_ack";
  payload: {
    success: boolean;
    version: number;
    message?: string;
  };
  messageId: string;
}

// WebSocket connection and session models
export interface WSConnection {
  id: string;
  userId: string;
  workspaceName: string;
  connectedAt: Date;
  lastActivity: Date;
}

export interface FileSession {
  filePath: string;
  connections: WSConnection[];
  lastModified: Date;
  pendingChanges: TextDelta[];
  version: number; // for operational transforms
  lastContent: string; // cache of last known file content
}

export interface TextDelta {
  operation: "insert" | "delete" | "retain";
  position: number;
  text?: string;
  length?: number;
  timestamp: Date;
  connectionId: string;
}

// Messages for conflict detection and external changes
export interface FileConflictMessage extends WSFileMessage {
  type: "file_conflict";
  payload: {
    path: string;
    serverContent: string;
    clientContent: string;
    serverLastModified: Date;
    clientLastModified?: Date;
    message: string;
  };
  messageId: string;
}

export interface ExternalChangeMessage extends WSFileMessage {
  type: "external_change";
  payload: {
    path: string;
    newContent: string;
    lastModified: Date;
    changeType: "modified" | "created" | "deleted";
  };
}

// WebSocket messages for Claude Code communication
export interface ClaudeCodeMessage {
  type:
    | "input"
    | "output"
    | "error"
    | "exit"
    | "start_session"
    | "session_started"
    | "stop_session"
    | "session_stopped"
    | "stdout"
    | "stderr"
    | "start_processing"
    | "end_processing";
  data?: string;
  sessionId: string;
  workspacePath?: string;
  command?: string;
  status?: "success" | "error";
  message?: string;
  exitCode?: number;
}

// Session mapping for Claude Code processes
export interface SessionMapping {
  pid: number;
  websocketConnection: WebSocket;
  startTime: Date;
  workspacePath: string;
}

// Agent-related interfaces
export interface ClaudeAgent {
  name: string;
  description: string;
  command: string;
}

export interface AgentCacheEntry {
  agents: ClaudeAgent[];
  lastModified: Date;
  filePath: string;
  ttl: number;
}

export interface AgentListResponse {
  agents: ClaudeAgent[];
  metadata: {
    cacheTimestamp: string;
    fileLastModified: string;
    version: string;
    fromCache: boolean;
  };
}

// Session persistence interface
export interface PersistedSession {
  id: string;
  workspaceName: string;
  workspacePath: string;
  pid: number;
  startedAt: string; // ISO date string
  agentName?: string;
  command?: string;
  userId: string;
  recovered?: boolean;
}
