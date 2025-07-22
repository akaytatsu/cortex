import { prisma } from '~/lib/prisma'
import type { User } from 'shared-types'

export class UserService {
  static async createUser(data: { email: string; password: string }): Promise<User> {
    try {
      return await prisma.user.create({
        data,
      })
    } catch (error) {
      // Handle unique constraint violation for email
      if (error instanceof Error && error.message.includes('Unique constraint failed')) {
        throw new Error(`User with email ${data.email} already exists`)
      }
      throw error
    }
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
    try {
      return await prisma.user.update({
        where: { id },
        data,
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('No record was found for an update')) {
        throw new Error(`User with id ${id} not found`)
      }
      if (error instanceof Error && error.message.includes('Unique constraint failed')) {
        throw new Error(`Email ${data.email} is already in use`)
      }
      throw error
    }
  }

  static async deleteUser(id: string): Promise<User> {
    try {
      return await prisma.user.delete({
        where: { id },
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('No record was found for a delete')) {
        throw new Error(`User with id ${id} not found`)
      }
      throw error
    }
  }

  static async getAllUsers(): Promise<User[]> {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }
}