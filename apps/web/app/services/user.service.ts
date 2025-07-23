import type { User } from "shared-types";
import type { IUserService, ILogger } from "../types/services";
import { createServiceLogger } from "../lib/logger";

/**
 * @deprecated UserService foi substituído pelo YamlUserService.
 * Este arquivo é mantido apenas para garantir que referências obsoletas falhem explicitamente.
 * Use o YamlUserService através do service container em vez desta implementação.
 */
export class UserService implements IUserService {
  private logger: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger || createServiceLogger("UserService");
    throw new Error("UserService obsoleto - use YamlUserService através do service container");
  }

  async createUser(data: { email: string; password: string }): Promise<User> {
    throw new Error("UserService obsoleto - use YamlUserService através do service container");
  }

  async getUserByEmail(email: string): Promise<User | null> {
    throw new Error("UserService obsoleto - use YamlUserService através do service container");
  }

  async getUserById(id: string): Promise<User | null> {
    throw new Error("UserService obsoleto - use YamlUserService através do service container");
  }

  async updateUser(
    id: string,
    data: Partial<Pick<User, "email" | "password">>
  ): Promise<User> {
    throw new Error("UserService obsoleto - use YamlUserService através do service container");
  }

  async deleteUser(id: string): Promise<User> {
    throw new Error("UserService obsoleto - use YamlUserService através do service container");
  }

  async getAllUsers(): Promise<User[]> {
    throw new Error("UserService obsoleto - use YamlUserService através do service container");
  }
}
