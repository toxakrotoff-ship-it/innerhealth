import 'server-only';
import { prisma } from '@/lib/prisma';
import {
  detectCsvDelimiter,
  parseCsvLineWithDelimiter,
  parseTildaLeadRow,
  resolveTildaLeadColumnIndexes,
} from '@/lib/tilda-leads-import';

/** Get all Tilda leads for admin. */
export async function getTildaLeads() {
  return prisma.tildaLead.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

interface ImportTildaLeadsResult {
  upserted: number
  skipped: number
  errors: number
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null
  const digitsOnly = value.replace(/\D/g, '')
  return digitsOnly.length > 0 ? digitsOnly : null
}

async function findLeadByMatchingContacts(params: {
  email: string | null
  name: string | null
  phone: string | null
}) {
  const { email, name, phone } = params
  const whereConditions = []
  if (email) whereConditions.push({ email: { equals: email, mode: 'insensitive' as const } })
  if (name) whereConditions.push({ name: { equals: name, mode: 'insensitive' as const } })
  if (!email && !name) return null

  const candidates = await prisma.tildaLead.findMany({
    where: { OR: whereConditions },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    candidates.find((candidate) => {
      const candidatePhone = normalizePhone(candidate.phone)
      const score =
        (email && candidate.email?.toLowerCase() === email.toLowerCase() ? 1 : 0) +
        (name && candidate.name?.toLowerCase() === name.toLowerCase() ? 1 : 0) +
        (phone && candidatePhone === phone ? 1 : 0)

      return score >= 2
    }) ?? null
  )
}

export async function importTildaLeadsFromCsv(csvContent: string): Promise<ImportTildaLeadsResult> {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    return { upserted: 0, skipped: 0, errors: 1 }
  }

  const delimiter = detectCsvDelimiter(lines[0])
  const header = parseCsvLineWithDelimiter(lines[0], delimiter)
  const columnIndexes = resolveTildaLeadColumnIndexes(header)

  let upserted = 0
  let skipped = 0
  let errors = 0

  for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
    const row = parseCsvLineWithDelimiter(lines[rowIndex], delimiter)
    const parsed = parseTildaLeadRow(row, columnIndexes)
    const tildaDate = parsed.tildaDate
    if (!tildaDate) {
      errors++
      continue
    }

    const payload = {
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
    }

    try {
      if (parsed.tranid) {
        await prisma.tildaLead.upsert({
          where: { tildaTranId: parsed.tranid },
          update: payload,
          create: {
            tildaTranId: parsed.tranid,
            ...payload,
          },
        })
        upserted++
        continue
      }

      const matchedLead = await findLeadByMatchingContacts({
        email: parsed.email,
        name: parsed.name,
        phone: normalizePhone(parsed.phone),
      })

      if (!matchedLead) {
        skipped++
        continue
      }

      await prisma.tildaLead.update({
        where: { id: matchedLead.id },
        data: payload,
      })
      upserted++
    } catch {
      errors++
    }
  }

  return { upserted, skipped, errors }
}
