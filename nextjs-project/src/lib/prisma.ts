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

const databasePoolMax = (() => {
  const raw = Number(process.env.DATABASE_POOL_MAX ?? '5')
  return Number.isFinite(raw) && raw > 0 ? raw : 5
})()

const pool = new Pool({
  connectionString,
  // Ограничиваем число активных соединений к Postgres на малых VPS,
  // иначе при всплесках параллелизма расходуются CPU/RAM и растёт latency.
  max: databasePoolMax,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
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