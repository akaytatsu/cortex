import type { User } from "shared-types";
import type { IUserService, ILogger } from "../types/services";
import { createServiceLogger } from "../lib/logger";
import { YamlFileService } from "../lib/yaml-file-service";
import { createUserData, type YamlUser } from "../lib/yaml-schema";
import bcrypt from "bcryptjs";
import { config } from "../lib/config";
import { PasswordValidator } from "../lib/password-validator";

/**
 * UserService implementado com YAML como backend de dados
 */
export class YamlUserService implements IUserService {
  private logger: ILogger;
  private yamlService: YamlFileService;
  private passwordValidator: PasswordValidator;

  constructor(yamlService?: YamlFileService, logger?: ILogger) {
    this.logger = logger || createServiceLogger("YamlUserService");
    this.yamlService = yamlService || new YamlFileService();
    
    // Initialize password validator
    this.passwordValidator = new PasswordValidator({
      minLength: 8,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      prohibitCommonPasswords: true,
    });
  }

  async createUser(data: { email: string; password: string }): Promise<User> {
    const requestLogger = this.logger.withContext({ email: data.email });
    try {
      requestLogger.info("Attempting to create user");

      // Validate password strength
      const passwordValidation = this.passwordValidator.validate(data.password);
      if (!passwordValidation.isValid) {
        requestLogger.warn("Password validation failed", { 
          errors: passwordValidation.errors 
        });
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(
        data.password,
        config.auth.saltRounds
      );

      // Gerar ID único para o usuário
      const userId = this.generateUserId();

      // Criar dados do usuário usando helper do schema
      const yamlUser = createUserData({
        id: userId,
        email: data.email,
        password_hash: hashedPassword,
        role: "user", // Usuários criados via API são 'user' por padrão
      });

      // Adicionar usuário ao arquivo YAML
      await this.yamlService.addUser(yamlUser);

      requestLogger.info("User created successfully", { userId: yamlUser.id });

      return this.yamlUserToUser(yamlUser);
    } catch (error) {
      // Handle unique constraint violation for email
      if (
        error instanceof Error &&
        error.message.includes("already exists")
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
      
      const yamlUser = await this.yamlService.getUserByEmail(email);
      
      requestLogger.debug("User search completed", {
        found: !!yamlUser,
        userId: yamlUser?.id,
      });

      return yamlUser ? this.yamlUserToUser(yamlUser) : null;
    } catch (error) {
      requestLogger.error("Failed to find user by email", error as Error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const requestLogger = this.logger.withContext({ userId: id });
    try {
      requestLogger.debug("Searching for user by ID");
      
      const yamlUser = await this.yamlService.getUserById(id);
      
      requestLogger.debug("User search by ID completed", { found: !!yamlUser });

      return yamlUser ? this.yamlUserToUser(yamlUser) : null;
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

      // Preparar updates
      const updates: Partial<YamlUser> = {};

      if (data.email) {
        updates.email = data.email;
      }

      if (data.password) {
        // Validate password strength
        const passwordValidation = this.passwordValidator.validate(data.password);
        if (!passwordValidation.isValid) {
          requestLogger.warn("Password validation failed", { 
            errors: passwordValidation.errors 
          });
          throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
        }

        // Hash da nova senha
        updates.password_hash = await bcrypt.hash(
          data.password,
          config.auth.saltRounds
        );
      }

      // Fazer update no arquivo YAML
      await this.yamlService.updateUser(id, updates);

      // Buscar o usuário atualizado
      const updatedYamlUser = await this.yamlService.getUserById(id);
      if (!updatedYamlUser) {
        throw new Error(`User with id ${id} not found after update`);
      }

      requestLogger.info("User updated successfully");
      return this.yamlUserToUser(updatedYamlUser);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("not found")
      ) {
        requestLogger.error("User update failed: user not found", error);
        throw new Error(`User with id ${id} not found`);
      }
      if (
        error instanceof Error &&
        error.message.includes("already in use")
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

      // Buscar o usuário antes de deletar para retornar
      const yamlUser = await this.yamlService.getUserById(id);
      if (!yamlUser) {
        throw new Error(`User with id ${id} not found`);
      }

      // Deletar usuário do arquivo YAML
      await this.yamlService.deleteUser(id);

      requestLogger.info("User deleted successfully");
      return this.yamlUserToUser(yamlUser);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("not found")
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
      
      const data = await this.yamlService.readUsers();
      const users = data.users.map(yamlUser => this.yamlUserToUser(yamlUser));
      
      // Ordenar por data de criação (mais recentes primeiro)
      users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      this.logger.debug("All users retrieved", { count: users.length });
      return users;
    } catch (error) {
      this.logger.error("Failed to retrieve all users", error as Error);
      throw error;
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
   * Cleanup method (caso seja necessário no futuro)
   */
  destroy(): void {
    // Implementar cleanup se necessário
  }
}