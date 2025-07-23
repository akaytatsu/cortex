import type { User } from "shared-types";
import type { IUserService, ILogger } from "../types/services";
import { createServiceLogger } from "../lib/logger";

export class UserService implements IUserService {
  private logger: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger || createServiceLogger("UserService");
    throw new Error("UserService obsoleto - use YamlUserService");
  }
  async createUser(data: { email: string; password: string }): Promise<User> {
    const requestLogger = this.logger.withContext({ email: data.email });
    try {
      requestLogger.info("Attempting to create user");
      // REMOVIDO: Operação que dependia do Prisma
      throw new Error("UserService obsoleto - use YamlUserService");
      // Implementação removida - serviço obsoleto
    } catch (error) {
      // Handle unique constraint violation for email
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint failed")
      ) {
        requestLogger.error(
          "User creation failed: email already exists",
          error
        );
        throw new Error(`User with email ${data.email} already exists`);
      }
      requestLogger.error("Failed to create user", error as Error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const requestLogger = this.logger.withContext({ email });
    try {
      requestLogger.debug("Searching for user by email");
      // REMOVIDO: Operação que dependia do Prisma
      throw new Error("UserService obsoleto - use YamlUserService");
      // Implementação removida - serviço obsoleto
    } catch (error) {
      requestLogger.error("Failed to find user by email", error as Error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const requestLogger = this.logger.withContext({ userId: id });
    try {
      requestLogger.debug("Searching for user by ID");
      // REMOVIDO: Operação que dependia do Prisma
      throw new Error("UserService obsoleto - use YamlUserService");
      // Implementação removida - serviço obsoleto
    } catch (error) {
      requestLogger.error("Failed to find user by ID", error as Error);
      throw error;
    }
  }

  async updateUser(
    id: string,
    data: Partial<Pick<User, "email" | "password">>
  ): Promise<User> {
    const requestLogger = this.logger.withContext({
      userId: id,
      email: data.email,
    });
    try {
      requestLogger.info("Attempting to update user");
      // REMOVIDO: Operação que dependia do Prisma
      throw new Error("UserService obsoleto - use YamlUserService");
      // Implementação removida - serviço obsoleto
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("No record was found for an update")
      ) {
        requestLogger.error("User update failed: user not found", error);
        throw new Error(`User with id ${id} not found`);
      }
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint failed")
      ) {
        requestLogger.error("User update failed: email already exists", error);
        throw new Error(`Email ${data.email} is already in use`);
      }
      requestLogger.error("Failed to update user", error as Error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<User> {
    const requestLogger = this.logger.withContext({ userId: id });
    try {
      requestLogger.info("Attempting to delete user");
      // REMOVIDO: Operação que dependia do Prisma
      throw new Error("UserService obsoleto - use YamlUserService");
      // Implementação removida - serviço obsoleto
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("No record was found for a delete")
      ) {
        requestLogger.error("User deletion failed: user not found", error);
        throw new Error(`User with id ${id} not found`);
      }
      requestLogger.error("Failed to delete user", error as Error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      this.logger.debug("Retrieving all users");
      // REMOVIDO: Operação que dependia do Prisma
      throw new Error("UserService obsoleto - use YamlUserService");
      // Implementação removida - serviço obsoleto
    } catch (error) {
      this.logger.error("Failed to retrieve all users", error as Error);
      throw error;
    }
  }
}
