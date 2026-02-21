import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import path from 'path'
import dotenv from 'dotenv'

// Загружаем переменные окружения: сначала из корня проекта, затем .env.local
const projectRoot = process.cwd()
dotenv.config({ path: path.join(projectRoot, '.env') })
dotenv.config({ path: path.join(projectRoot, '.env.local') })

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Add it to .env or .env.local in the project root.'
  )
}

const pool = new Pool({
  connectionString,
})

const adapter = new PrismaPg(pool)

/** В production не логируем каждый query для производительности и безопасности */
const logLevels: Array<'query' | 'info' | 'warn' | 'error'> =
  process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['query', 'info', 'warn', 'error']

const prismaClient = new PrismaClient({
  adapter,
  log: logLevels,
})

export const prisma = globalForPrisma.prisma || prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma