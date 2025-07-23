import type { User, UserPublic } from "shared-types";
import type { IAuthService, ILogger } from "../types/services";
import bcrypt from "bcryptjs";
import { config } from "../lib/config";
import { createServiceLogger } from "../lib/logger";
import { serviceContainer } from "../lib/service-container";
import { YamlFileService } from "../lib/yaml-file-service";
import { createUserData, type YamlUser } from "../lib/yaml-schema";
import { RateLimiter } from "../lib/rate-limiter";
import { PasswordValidator } from "../lib/password-validator";

/**
 * AuthService implementado com YAML como backend de dados
 */
export class YamlAuthService implements IAuthService {
  private logger: ILogger;
  private yamlService: YamlFileService;
  private rateLimiter: RateLimiter;
  private passwordValidator: PasswordValidator;

  constructor(yamlService?: YamlFileService, logger?: ILogger) {
    this.logger = logger || createServiceLogger("YamlAuthService");
    this.yamlService = yamlService || new YamlFileService();

    // Initialize rate limiter with configuration
    this.rateLimiter = new RateLimiter(
      {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        lockoutDuration: 15 * 60 * 1000, // 15 minutes lockout
      },
      this.logger
    );

    // Initialize password validator
    this.passwordValidator = new PasswordValidator({
      minLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      prohibitCommonPasswords: true,
    });

    // Start watching the file for changes
    this.yamlService.startWatching();
  }

  /**
   * Verifica se existem usuários no arquivo YAML
   */
  async hasUsers(): Promise<boolean> {
    try {
      this.logger.debug("Checking if users exist in YAML file");
      const hasUsers = await this.yamlService.hasUsers();
      this.logger.debug("User count check completed", { hasUsers });
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

      // Validate password strength
      const passwordValidation = this.passwordValidator.validate(data.password);
      if (!passwordValidation.isValid) {
        requestLogger.warn("Password validation failed", {
          errors: passwordValidation.errors,
        });
        throw new Error(
          `Password validation failed: ${passwordValidation.errors.join(", ")}`
        );
      }

      // Hash da senha usando configuração centralizada
      const hashedPassword = await bcrypt.hash(
        data.password,
        config.auth.saltRounds
      );
      requestLogger.debug("Password hashed successfully");

      // Gerar ID único para o usuário
      const userId = this.generateUserId();

      // Criar dados do usuário usando helper do schema
      const yamlUser = createUserData({
        id: userId,
        email: data.email,
        password_hash: hashedPassword,
        role: "admin", // Primeiro usuário é sempre admin
      });

      // Adicionar usuário ao arquivo YAML
      await this.yamlService.addUser(yamlUser);

      requestLogger.info("First user created successfully", {
        userId: yamlUser.id,
      });

      // Converter para formato User para compatibilidade
      return this.yamlUserToUser(yamlUser);
    } catch (error) {
      if (error instanceof Error && error.message.includes("already exists")) {
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

      // Check rate limiting first
      if (this.rateLimiter.isRateLimited(data.email)) {
        const remainingMs = this.rateLimiter.getRemainingLockout(data.email);
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        requestLogger.warn("Login attempt blocked by rate limiting", {
          remainingMinutes,
        });
        throw new Error(
          `Too many failed attempts. Try again in ${remainingMinutes} minutes.`
        );
      }

      // Busca o usuário pelo email
      const yamlUser = await this.yamlService.getUserByEmail(data.email);
      if (!yamlUser) {
        requestLogger.warn("Login attempt failed: user not found");
        this.rateLimiter.recordFailedAttempt(data.email);
        throw new Error("Invalid email or password");
      }

      // Verificar se o usuário está ativo
      if (!yamlUser.active) {
        requestLogger.warn("Login attempt failed: user is inactive", {
          userId: yamlUser.id,
        });
        throw new Error("Account is inactive");
      }

      requestLogger.debug("User found, validating password", {
        userId: yamlUser.id,
      });

      // Verifica se a senha está correta usando bcrypt
      const isValidPassword = await bcrypt.compare(
        data.password,
        yamlUser.password_hash
      );
      if (!isValidPassword) {
        requestLogger.warn("Login attempt failed: invalid password", {
          userId: yamlUser.id,
        });
        this.rateLimiter.recordFailedAttempt(data.email);
        throw new Error("Invalid email or password");
      }

      // Login successful - reset rate limiting
      this.rateLimiter.recordSuccessfulAttempt(data.email);

      // Atualizar last_login
      await this.yamlService.updateUser(yamlUser.id, {
        last_login: new Date().toISOString(),
      });

      requestLogger.info("User login successful", { userId: yamlUser.id });

      // Converter para formato User e retornar sem a senha
      const user = this.yamlUserToUser(yamlUser);
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

  /**
   * Converte YamlUser para User (para compatibilidade com tipos existentes)
   */
  private yamlUserToUser(yamlUser: YamlUser): User {
    return {
      id: yamlUser.id,
      email: yamlUser.email,
      password: yamlUser.password_hash,
      createdAt: new Date(yamlUser.created_at),
      updatedAt: new Date(yamlUser.updated_at),
    };
  }

  /**
   * Gera um ID único para usuário
   */
  private generateUserId(): string {
    // Usar formato similar ao cuid do Prisma
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `user_${timestamp}${random}`;
  }

  /**
   * Cleanup method to stop file watching and rate limiter
   */
  destroy(): void {
    this.yamlService.stopWatching();
    this.rateLimiter.destroy();
  }
}
