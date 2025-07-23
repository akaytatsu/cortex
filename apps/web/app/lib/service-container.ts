import type {
  IAuthService,
  IUserService,
  ITerminalService,
  IFileSystemService,
  IWorkspaceService,
  IAgentService,
  ILogger,
} from "../types/services";
import { YamlAuthService } from "../services/auth.service.yaml";
import { YamlUserService } from "../services/user.service.yaml";
import { YamlFileService } from "./yaml-file-service";
import { terminalService } from "../services/terminal.service";
import { FileSystemService } from "../services/filesystem.service";
import { WorkspaceService } from "../services/workspace.service";
import { AgentService } from "../services/agent.service";
import { createServiceLogger } from "./logger";

type ServiceType =
  | "auth"
  | "user"
  | "terminal"
  | "filesystem"
  | "workspace"
  | "agent"
  | "logger";

type ServiceInstance =
  | IAuthService
  | IUserService
  | ITerminalService
  | IFileSystemService
  | IWorkspaceService
  | IAgentService
  | ILogger;

/**
 * Simple service container for dependency injection
 */
class ServiceContainer {
  private services = new Map<string, ServiceInstance>();
  private factories = new Map<string, () => ServiceInstance>();

  constructor() {
    this.registerDefaultServices();
  }

  private registerDefaultServices(): void {
    // Usar implementações YAML (sistema único)
    const yamlService = new YamlFileService();
    this.factories.set("auth", () => new YamlAuthService(yamlService));
    this.factories.set("user", () => new YamlUserService(yamlService));

    // Outros serviços permanecem inalterados
    this.factories.set("terminal", () => terminalService);
    this.factories.set("filesystem", () => new FileSystemService());
    this.factories.set("workspace", () => new WorkspaceService());
    this.factories.set("agent", () => new AgentService(new FileSystemService()));
    this.factories.set("logger", () => createServiceLogger("ServiceContainer"));
  }

  /**
   * Register a service instance
   */
  register<T extends ServiceInstance>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  /**
   * Register a service factory
   */
  registerFactory<T extends ServiceInstance>(
    name: string,
    factory: () => T
  ): void {
    this.factories.set(name, factory);
  }

  /**
   * Get a service by name
   */
  get<T extends ServiceInstance>(name: ServiceType): T {
    // Check if instance already exists
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // Create instance using factory
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service '${name}' not found in container`);
    }

    const instance = factory() as T;
    this.services.set(name, instance);
    return instance;
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name) || this.factories.has(name);
  }

  /**
   * Clear all services and factories
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }

  /**
   * Get auth service
   */
  getAuthService(): IAuthService {
    return this.get<IAuthService>("auth");
  }

  /**
   * Get user service
   */
  getUserService(): IUserService {
    return this.get<IUserService>("user");
  }

  /**
   * Get terminal service
   */
  getTerminalService(): ITerminalService {
    return this.get<ITerminalService>("terminal");
  }

  /**
   * Get filesystem service
   */
  getFileSystemService(): IFileSystemService {
    return this.get<IFileSystemService>("filesystem");
  }

  /**
   * Get workspace service
   */
  getWorkspaceService(): IWorkspaceService {
    return this.get<IWorkspaceService>("workspace");
  }

  /**
   * Get agent service
   */
  getAgentService(): IAgentService {
    return this.get<IAgentService>("agent");
  }

  /**
   * Get logger service
   */
  getLogger(): ILogger {
    return this.get<ILogger>("logger");
  }
}

// Global service container instance
export const serviceContainer = new ServiceContainer();

// Export types for type safety
export type { ServiceType, ServiceInstance };
