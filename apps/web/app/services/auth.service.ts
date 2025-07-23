import type { User, UserPublic } from "shared-types";
import type { IAuthService, ILogger } from "../types/services";
import bcrypt from "bcryptjs";
import { config } from "../lib/config";
import { createServiceLogger } from "../lib/logger";
import { serviceContainer } from "../lib/service-container";

/**
 * @deprecated AuthService foi substituído pelo YamlAuthService.
 * Este arquivo é mantido apenas para garantir que referências obsoletas falhem explicitamente.
 * Use o YamlAuthService através do service container em vez desta implementação.
 */
export class AuthService implements IAuthService {
  private logger: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger || createServiceLogger("AuthService");
    throw new Error("AuthService obsoleto - use YamlAuthService através do service container");
  }

  async hasUsers(): Promise<boolean> {
    throw new Error("AuthService obsoleto - use YamlAuthService através do service container");
  }

  async createFirstUser(data: { email: string; password: string }): Promise<User> {
    throw new Error("AuthService obsoleto - use YamlAuthService através do service container");
  }

  async validateLogin(data: { email: string; password: string }): Promise<UserPublic> {
    throw new Error("AuthService obsoleto - use YamlAuthService através do service container");
  }
}
