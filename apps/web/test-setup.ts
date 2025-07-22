import { beforeEach, afterEach } from 'vitest'
import { prisma } from './app/lib/prisma'

beforeEach(async () => {
  // Ensure clean state before each test
  await prisma.user.deleteMany()
})

afterEach(async () => {
  // Ensure clean state after each test  
  await prisma.user.deleteMany()
})