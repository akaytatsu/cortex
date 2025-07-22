import { prisma } from '~/lib/prisma'
import type { User } from 'shared-types'

export class UserService {
  static async createUser(data: { email: string; password: string }): Promise<User> {
    return prisma.user.create({
      data,
    })
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    })
  }

  static async getUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    })
  }

  static async updateUser(id: string, data: Partial<Pick<User, 'email' | 'password'>>): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    })
  }

  static async deleteUser(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    })
  }

  static async getAllUsers(): Promise<User[]> {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }
}