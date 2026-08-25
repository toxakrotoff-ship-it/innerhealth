#!/usr/bin/env ts-node

/**
 * Анонимизирует PII (fullName/phone/email/guestToken) в CheckoutSession старше
 * CHECKOUT_RETENTION_DAYS дней. cartSnapshot и сами записи не удаляются — только
 * PII-поля (ТЗ §27): checkout-сессии не удаляются целиком, чтобы не потерять
 * аналитику по успешным/неуспешным путям (ТЗ §12).
 *
 * Срок retention намеренно без дефолта в коде — определяется бизнесом/юристами.
 * Запуск вручную или периодически (cron), по аналогии с cleanup-auth-tokens.ts.
 *
 * Использует собственный PrismaClient (а не '@/lib/prisma'), т.к. модуль тянет
 * 'server-only', который вне сборки Next.js (в чистом ts-node) кидает исключение.
 */

import path from 'path'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.DATABASE_URL) {
  console.error('[anonymize-old-checkout-sessions] DATABASE_URL не задан. Проверьте .env/.env.local')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const raw = process.env.CHECKOUT_RETENTION_DAYS
  const retentionDays = Number(raw)
  if (!raw || !Number.isFinite(retentionDays) || retentionDays <= 0) {
    console.log(
      '[anonymize-old-checkout-sessions] CHECKOUT_RETENTION_DAYS не задан (или некорректен) — retention-политика ещё не согласована, ничего не делаем.'
    )
    return
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)

  console.log(
    `[anonymize-old-checkout-sessions] Starting anonymization (retentionDays=${retentionDays}, cutoff=${cutoff.toISOString()})...`
  )
  const result = await prisma.checkoutSession.updateMany({
    where: { createdAt: { lt: cutoff }, anonymizedAt: null },
    data: {
      fullName: null,
      phone: null,
      email: null,
      guestToken: null,
      anonymizedAt: new Date(),
    },
  })
  console.log(`[anonymize-old-checkout-sessions] Anonymized ${result.count} session(s).`)
}

main()
  .catch((err) => {
    console.error('[anonymize-old-checkout-sessions] Error:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
