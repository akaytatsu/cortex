import { prisma } from '../lib/prisma'
import type { User } from 'shared-types'
import bcrypt from 'bcryptjs'

export class AuthService {
  /**
   * Verifica se existem usuários no banco de dados
   */
  static async hasUsers(): Promise<boolean> {
    try {
      const userCount = await prisma.user.count()
      return userCount > 0
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to check user count: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Cria o primeiro usuário (para setup inicial)
   */
  static async createFirstUser(data: { email: string; password: string }): Promise<User> {
    try {
      // Verifica se já existe algum usuário
      const hasExistingUsers = await this.hasUsers()
      if (hasExistingUsers) {
        throw new Error('Cannot create first user: users already exist')
      }

      // Hash da senha
      const saltRounds = 12
      const hashedPassword = await bcrypt.hash(data.password, saltRounds)

      return await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
        },
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint failed')) {
        throw new Error(`User with email ${data.email} already exists`)
      }
      throw error
    }
  }
}