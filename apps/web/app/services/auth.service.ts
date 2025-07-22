import { prisma } from "../lib/prisma";
import type { User, UserPublic } from "shared-types";
import type { IAuthService, ILogger } from "../types/services";
import bcrypt from "bcryptjs";
import { config } from "../lib/config";
import { createServiceLogger } from "../lib/logger";
import { serviceContainer } from "../lib/service-container";

export class AuthService implements IAuthService {
  private logger: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger || createServiceLogger("AuthService");
  }
  /**
   * Verifica se existem usuários no banco de dados
   */
  async hasUsers(): Promise<boolean> {
    try {
      this.logger.debug("Checking if users exist in database");
      const userCount = await prisma.user.count();
      const hasUsers = userCount > 0;
      this.logger.debug("User count check completed", { userCount, hasUsers });
      return hasUsers;
    } catch (error) {
      this.logger.error("Failed to check user count", error as Error);
      if (error instanceof Error) {
        throw new Error(`Failed to check user count: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Cria o primeiro usuário (para setup inicial)
   */
  async createFirstUser(data: {
    email: string;
    password: string;
  }): Promise<User> {
    const requestLogger = this.logger.withContext({ email: data.email });
    try {
      requestLogger.info("Attempting to create first user");

      // Verifica se já existe algum usuário
      const hasExistingUsers = await this.hasUsers();
      if (hasExistingUsers) {
        requestLogger.warn("Cannot create first user: users already exist");
        throw new Error("Cannot create first user: users already exist");
      }

      // Hash da senha usando configuração centralizada
      const hashedPassword = await bcrypt.hash(
        data.password,
        config.auth.saltRounds
      );
      requestLogger.debug("Password hashed successfully");

      const user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
        },
      });

      requestLogger.info("First user created successfully", {
        userId: user.id,
      });
      return user;
    } catch (error) {
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
      requestLogger.error("Failed to create first user", error as Error);
      throw error;
    }
  }

  /**
   * Valida as credenciais de login do usuário
   */
  async validateLogin(data: {
    email: string;
    password: string;
  }): Promise<UserPublic> {
    const requestLogger = this.logger.withContext({ email: data.email });
    try {
      requestLogger.debug("Attempting user login validation");

      // Busca o usuário pelo email
      const userService = serviceContainer.getUserService();
      const user = await userService.getUserByEmail(data.email);
      if (!user) {
        requestLogger.warn("Login attempt failed: user not found");
        throw new Error("Invalid email or password");
      }

      requestLogger.debug("User found, validating password", {
        userId: user.id,
      });

      // Verifica se a senha está correta usando bcrypt
      const isValidPassword = await bcrypt.compare(
        data.password,
        user.password
      );
      if (!isValidPassword) {
        requestLogger.warn("Login attempt failed: invalid password", {
          userId: user.id,
        });
        throw new Error("Invalid email or password");
      }

      requestLogger.info("User login successful", { userId: user.id });

      // Retorna o usuário sem a senha usando o tipo UserPublic
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof Error) {
        requestLogger.error("Login validation failed", error);
        throw error;
      }
      requestLogger.error("Authentication failed with unknown error");
      throw new Error("Authentication failed");
    }
  }
}
