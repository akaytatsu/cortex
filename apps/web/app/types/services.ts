import type {
  User,
  UserPublic,
  Workspace,
  FileSystemItem,
  FileContent,
  FileSaveRequest,
  FileSaveResponse,
  TerminalSession,
} from "shared-types";
import type * as pty from "node-pty";

export interface IAuthService {
  hasUsers(): Promise<boolean>;
  createFirstUser(data: { email: string; password: string }): Promise<User>;
  validateLogin(data: { email: string; password: string }): Promise<UserPublic>;
}

export interface IUserService {
  createUser(data: { email: string; password: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateUser(
    id: string,
    data: Partial<Pick<User, "email" | "password">>
  ): Promise<User>;
  deleteUser(id: string): Promise<User>;
  getAllUsers(): Promise<User[]>;
}

export interface ITerminalService {
  createSession(
    workspaceName: string,
    workspacePath: string,
    userId: string,
    customSessionId?: string
  ): Promise<TerminalSession>;
  spawnTerminal(session: TerminalSession): Promise<pty.IPty>;
  getSession(sessionId: string): TerminalSession | null;
  getProcess(sessionId: string): pty.IPty | null;
  updateLastActivity(sessionId: string): void;
  writeToTerminal(sessionId: string, data: string): boolean;
  resizeTerminal(sessionId: string, cols?: number, rows?: number): boolean;
  terminateSession(sessionId: string): boolean;
  getActiveSessions(userId: string): TerminalSession[];
  terminateAllUserSessions(userId: string): void;
  requireUserId(request: Request): Promise<string>;
  cleanup(): void;
}

export interface IFileSystemService {
  getDirectoryStructure(
    workspacePath: string,
    relativePath?: string
  ): Promise<FileSystemItem[]>;
  getFileContent(
    workspacePath: string,
    relativePath: string
  ): Promise<FileContent>;
  saveFileContent(
    workspacePath: string,
    saveRequest: FileSaveRequest
  ): Promise<FileSaveResponse>;
}

export interface IWorkspaceService {
  listWorkspaces(): Promise<Workspace[]>;
  validateAndCreatePath(
    basePath: string,
    folderName?: string,
    createNew?: boolean
  ): Promise<string>;
  addWorkspace(workspace: Workspace, createNew?: boolean): Promise<void>;
  getWorkspaceByName(workspaceName: string): Promise<Workspace | null>;
  removeWorkspace(workspaceName: string): Promise<void>;
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  workspacePath?: string;
  correlationId?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ILogger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
  withContext(context: LogContext): ILogger;
}
