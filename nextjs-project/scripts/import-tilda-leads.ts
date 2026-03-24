#!/usr/bin/env ts-node
/**
 * Импорт заявок из CSV Тильды в таблицу TildaLead.
 * Используются только столбцы: 1–5, 8–13, 15 (Email, Name, Phone, Date, tranid, Input, Input_2, Комментарии, Адрес_доставки, Отзыв, Доставка, Промокод).
 *
 * Запуск: npx ts-node scripts/import-tilda-leads.ts <путь к CSV>
 * Пример: npx ts-node scripts/import-tilda-leads.ts ~/Downloads/leads-....csv
 */

import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import {
  detectCsvDelimiter,
  parseCsvLineWithDelimiter,
  parseTildaLeadRow,
  resolveTildaLeadColumnIndexes,
} from '../src/lib/tilda-leads-import'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан. Проверьте .env.local')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
const IMPORT_BRAND = 'inner' as const

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath || !fs.existsSync(csvPath)) {
    console.error('Укажите путь к CSV: npx ts-node scripts/import-tilda-leads.ts <path-to-leads.csv>')
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) {
    console.error('В файле нет данных (нужен заголовок и хотя бы одна строка)')
    process.exit(1)
  }

  const delimiter = detectCsvDelimiter(lines[0])
  const header = parseCsvLineWithDelimiter(lines[0], delimiter)
  console.log('Столбцы в файле:', header.length)
  const col = resolveTildaLeadColumnIndexes(header)
  console.log('Распознанные индексы:', col)

  let created = 0
  let skipped = 0
  let errors = 0

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLineWithDelimiter(lines[i], delimiter)
    const parsed = parseTildaLeadRow(row, col)
    const tranid = parsed.tranid
    if (!tranid) {
      skipped++
      continue
    }

    const tildaDate = parsed.tildaDate
    if (!tildaDate) {
      errors++
      console.warn(`Строка ${i + 1}: неверная дата "${row[col.date] ?? ''}"`)
      continue
    }

    try {
      await prisma.tildaLead.upsert({
        where: {
          brand_tildaTranId: {
            brand: IMPORT_BRAND,
            tildaTranId: tranid,
          },
        },
        update: {
          email: parsed.email ?? undefined,
          name: parsed.name ?? undefined,
          phone: parsed.phone ?? undefined,
          tildaDate,
          input: parsed.input ?? undefined,
          input2: parsed.input2 ?? undefined,
          comment: parsed.comment ?? undefined,
          deliveryAddress: parsed.deliveryAddress ?? undefined,
          review: parsed.review ?? undefined,
          delivery: parsed.delivery ?? undefined,
          promoCode: parsed.promoCode ?? undefined,
        },
        create: {
          brand: IMPORT_BRAND,
          tildaTranId: tranid,
          email: parsed.email ?? undefined,
          name: parsed.name ?? undefined,
          phone: parsed.phone ?? undefined,
          tildaDate,
          input: parsed.input ?? undefined,
          input2: parsed.input2 ?? undefined,
          comment: parsed.comment ?? undefined,
          deliveryAddress: parsed.deliveryAddress ?? undefined,
          review: parsed.review ?? undefined,
          delivery: parsed.delivery ?? undefined,
          promoCode: parsed.promoCode ?? undefined,
        },
      })
      created++
    } catch (e) {
      errors++
      console.warn(`Строка ${i + 1} (tranid=${tranid}):`, e)
    }
  }

  console.log('Готово. Создано/обновлено:', created, 'Пропущено (нет tranid):', skipped, 'Ошибок:', errors)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
    await prisma.$disconnect()
  })
