import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import type { Workspace } from '../../../../packages/shared-types';

class WorkspaceServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'WorkspaceServiceError';
  }
}

const CORTEX_ROOT = process.env.CORTEX_ROOT || process.cwd();
const WORKSPACES_FILE = path.join(CORTEX_ROOT, 'config', 'workspaces.yaml');

export class WorkspaceService {
  private static async ensureConfigDir(): Promise<void> {
    const configDir = path.dirname(WORKSPACES_FILE);
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
    }
  }

  private static async readWorkspacesFile(): Promise<Workspace[]> {
    try {
      await this.ensureConfigDir();
      const fileContent = await fs.readFile(WORKSPACES_FILE, 'utf-8');
      const parsed = yaml.parse(fileContent);
      
      if (!Array.isArray(parsed)) {
        throw new WorkspaceServiceError('Invalid workspaces file format');
      }
      
      return parsed as Workspace[];
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // File doesn't exist, return empty array
        return [];
      }
      
      if (error instanceof WorkspaceServiceError) {
        throw error;
      }
      
      throw new WorkspaceServiceError(`Failed to read workspaces file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async writeWorkspacesFile(workspaces: Workspace[]): Promise<void> {
    try {
      await this.ensureConfigDir();
      const yamlContent = yaml.stringify(workspaces);
      await fs.writeFile(WORKSPACES_FILE, yamlContent, 'utf-8');
    } catch (error) {
      throw new WorkspaceServiceError(`Failed to write workspaces file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async listWorkspaces(): Promise<Workspace[]> {
    return await this.readWorkspacesFile();
  }

  static async addWorkspace(workspace: Workspace): Promise<void> {
    if (!workspace.name?.trim()) {
      throw new WorkspaceServiceError('Workspace name is required');
    }
    
    if (!workspace.path?.trim()) {
      throw new WorkspaceServiceError('Workspace path is required');
    }

    const workspaces = await this.readWorkspacesFile();
    
    // Check if workspace with same name already exists
    const existingWorkspace = workspaces.find(w => w.name === workspace.name.trim());
    if (existingWorkspace) {
      throw new WorkspaceServiceError('A workspace with this name already exists');
    }

    workspaces.push({
      name: workspace.name.trim(),
      path: workspace.path.trim(),
    });

    await this.writeWorkspacesFile(workspaces);
  }
}