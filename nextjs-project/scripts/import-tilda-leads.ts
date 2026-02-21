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

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан. Проверьте .env.local')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

/** Парсит одну строку CSV с разделителем ; и учётом кавычек */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && c === ';') {
      result.push(current.trim())
      current = ''
      continue
    }
    current += c
  }
  result.push(current.trim())
  return result
}

/** Парсит дату из формата "2026-02-21 11:17:41" */
function parseTildaDate(s: string): Date | null {
  const trimmed = s.replace(/^"|"$/g, '').trim()
  if (!trimmed) return null
  const d = new Date(trimmed)
  return isNaN(d.getTime()) ? null : d
}

function safeStr(val: string | undefined): string | null {
  if (val === undefined) return null
  const t = val.replace(/^"|"$/g, '').trim()
  return t === '' ? null : t
}

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

  const header = parseCsvLine(lines[0])
  console.log('Столбцы в файле:', header.length)
  // Индексы нужных столбцов (0-based): Email=0, Name=1, Phone=2, Date=3, tranid=4, Input=7, Input_2=8, Комментарии=9, Адрес_доставки=10, Отзыв=11, Доставка=12, Промокод=14
  const col = {
    email: 0,
    name: 1,
    phone: 2,
    date: 3,
    tranid: 4,
    input: 7,
    input2: 8,
    comment: 9,
    deliveryAddress: 10,
    review: 11,
    delivery: 12,
    promoCode: 14,
  }

  let created = 0
  let skipped = 0
  let errors = 0

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i])
    const tranid = safeStr(row[col.tranid])
    if (!tranid) {
      skipped++
      continue
    }

    const tildaDate = parseTildaDate(row[col.date] ?? '')
    if (!tildaDate) {
      errors++
      console.warn(`Строка ${i + 1}: неверная дата "${row[col.date]}"`)
      continue
    }

    try {
      await prisma.tildaLead.upsert({
        where: { tildaTranId: tranid },
        update: {
          email: safeStr(row[col.email]) ?? undefined,
          name: safeStr(row[col.name]) ?? undefined,
          phone: safeStr(row[col.phone]) ?? undefined,
          tildaDate,
          input: safeStr(row[col.input]) ?? undefined,
          input2: safeStr(row[col.input2]) ?? undefined,
          comment: safeStr(row[col.comment]) ?? undefined,
          deliveryAddress: safeStr(row[col.deliveryAddress]) ?? undefined,
          review: safeStr(row[col.review]) ?? undefined,
          delivery: safeStr(row[col.delivery]) ?? undefined,
          promoCode: safeStr(row[col.promoCode]) ?? undefined,
        },
        create: {
          tildaTranId: tranid,
          email: safeStr(row[col.email]) ?? undefined,
          name: safeStr(row[col.name]) ?? undefined,
          phone: safeStr(row[col.phone]) ?? undefined,
          tildaDate,
          input: safeStr(row[col.input]) ?? undefined,
          input2: safeStr(row[col.input2]) ?? undefined,
          comment: safeStr(row[col.comment]) ?? undefined,
          deliveryAddress: safeStr(row[col.deliveryAddress]) ?? undefined,
          review: safeStr(row[col.review]) ?? undefined,
          delivery: safeStr(row[col.delivery]) ?? undefined,
          promoCode: safeStr(row[col.promoCode]) ?? undefined,
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
