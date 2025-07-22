import { prisma } from "../lib/prisma";
import type { User } from "shared-types";
import type { IUserService, ILogger } from "../types/services";
import { createServiceLogger } from "../lib/logger";

export class UserService implements IUserService {
  private logger: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger || createServiceLogger("UserService");
  }
  async createUser(data: {
    email: string;
    password: string;
  }): Promise<User> {
    const requestLogger = this.logger.withContext({ email: data.email });
    try {
      requestLogger.info("Attempting to create user");
      const user = await prisma.user.create({
        data,
      });
      requestLogger.info("User created successfully", { userId: user.id });
      return user;
    } catch (error) {
      // Handle unique constraint violation for email
      if (
        error instanceof Error &&
        error.message.includes("Unique constraint failed")
      ) {
        requestLogger.error("User creation failed: email already exists", error);
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
      const user = await prisma.user.findUnique({
        where: { email },
      });
      requestLogger.debug("User search completed", { found: !!user, userId: user?.id });
      return user;
    } catch (error) {
      requestLogger.error("Failed to find user by email", error as Error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    const requestLogger = this.logger.withContext({ userId: id });
    try {
      requestLogger.debug("Searching for user by ID");
      const user = await prisma.user.findUnique({
        where: { id },
      });
      requestLogger.debug("User search by ID completed", { found: !!user });
      return user;
    } catch (error) {
      requestLogger.error("Failed to find user by ID", error as Error);
      throw error;
    }
  }

  async updateUser(
    id: string,
    data: Partial<Pick<User, "email" | "password">>
  ): Promise<User> {
    const requestLogger = this.logger.withContext({ userId: id, email: data.email });
    try {
      requestLogger.info("Attempting to update user");
      const user = await prisma.user.update({
        where: { id },
        data,
      });
      requestLogger.info("User updated successfully");
      return user;
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
      const user = await prisma.user.delete({
        where: { id },
      });
      requestLogger.info("User deleted successfully");
      return user;
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
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      });
      this.logger.debug("All users retrieved", { count: users.length });
      return users;
    } catch (error) {
      this.logger.error("Failed to retrieve all users", error as Error);
      throw error;
    }
  }
}
