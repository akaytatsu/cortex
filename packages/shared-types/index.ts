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
  type: 'file' | 'directory';
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
