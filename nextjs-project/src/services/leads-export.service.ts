import 'server-only'
import { prisma } from '@/lib/prisma'
import type { BrandId } from '@/lib/brand/brand'
import { resolveDbBrand } from '@/lib/brand/brand-db'

export type LeadSource = 'partnership' | 'tilda' | 'quick_order'

export interface LeadExportRow {
  source: LeadSource
  name: string
  email: string
  phone: string
  address: string
  role: string
  messageComment: string
  product: string
  quantity: string
  promoCode: string
  delivery: string
  tildaTranId: string
  date: string
  id: string
}

export interface LeadExportFilter {
  from?: Date
  to?: Date
}

const CSV_HEADERS: (keyof LeadExportRow)[] = [
  'source',
  'name',
  'email',
  'phone',
  'address',
  'role',
  'messageComment',
  'product',
  'quantity',
  'promoCode',
  'delivery',
  'tildaTranId',
  'date',
  'id',
]

const CSV_HEADER_LABELS: Record<keyof LeadExportRow, string> = {
  source: 'Источник',
  name: 'ФИО',
  email: 'Email',
  phone: 'Телефон',
  address: 'Адрес',
  role: 'Роль',
  messageComment: 'Сообщение/Комментарий',
  product: 'Товар',
  quantity: 'Кол-во',
  promoCode: 'Промокод',
  delivery: 'Доставка',
  tildaTranId: 'ID в Тильде',
  date: 'Дата заявки',
  id: 'Внутренний ID',
}

function formatExportDate(date: Date): string {
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function emptyRow(source: LeadSource, id: string, date: string): LeadExportRow {
  return {
    source,
    name: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    messageComment: '',
    product: '',
    quantity: '',
    promoCode: '',
    delivery: '',
    tildaTranId: '',
    date,
    id,
  }
}

/** Escape a CSV cell: wrap in quotes if contains comma, quote or newline; double internal quotes. */
function escapeCsvCell(value: string): string {
  const s = String(value ?? '').trim()
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Build CSV string from rows. UTF-8, comma-separated. */
export function buildLeadsCsv(rows: LeadExportRow[]): string {
  const headerLine = CSV_HEADERS.map((h) => CSV_HEADER_LABELS[h]).map(escapeCsvCell).join(',')
  const dataLines = rows.map((row) =>
    CSV_HEADERS.map((h) => escapeCsvCell(row[h] ?? '')).join(',')
  )
  return [headerLine, ...dataLines].join('\r\n')
}

/** Fetch all leads from PartnershipLead, TildaLead, QuickOrder and map to unified export rows. */
export async function getAllLeadsForExport(
  filter?: LeadExportFilter,
  brandId: BrandId | null = null
): Promise<LeadExportRow[]> {
  const dbBrand = resolveDbBrand(brandId)
  const partnershipWhere =
    filter && (filter.from || filter.to)
      ? {
          brand: dbBrand,
          createdAt: {
            ...(filter.from ? { gte: filter.from } : {}),
            ...(filter.to ? { lte: filter.to } : {}),
          },
        }
      : { brand: dbBrand }

  const tildaWhere =
    filter && (filter.from || filter.to)
      ? {
          brand: dbBrand,
          tildaDate: {
            ...(filter.from ? { gte: filter.from } : {}),
            ...(filter.to ? { lte: filter.to } : {}),
          },
        }
      : { brand: dbBrand }

  const quickOrderWhere =
    filter && (filter.from || filter.to)
      ? {
          brand: dbBrand,
          createdAt: {
            ...(filter.from ? { gte: filter.from } : {}),
            ...(filter.to ? { lte: filter.to } : {}),
          },
        }
      : { brand: dbBrand }

  const [partnershipLeads, tildaLeads, quickOrders] = await Promise.all([
    prisma.partnershipLead.findMany({
      where: partnershipWhere,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tildaLead.findMany({
      where: tildaWhere,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.quickOrder.findMany({
      where: quickOrderWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { title: true, slug: true } },
      },
    }),
  ])

  const partnershipRows: LeadExportRow[] = partnershipLeads.map((l) => ({
    ...emptyRow('partnership', l.id, formatExportDate(l.createdAt)),
    name: l.name ?? '',
    email: l.email ?? '',
    phone: l.phone ?? '',
    role: l.role ?? '',
    messageComment: l.message ?? '',
  }))

  const tildaRows: LeadExportRow[] = tildaLeads.map((l) => ({
    ...emptyRow('tilda', l.id, formatExportDate(l.tildaDate)),
    name: l.name ?? '',
    email: l.email ?? '',
    phone: l.phone ?? '',
    address: l.deliveryAddress ?? '',
    messageComment: l.comment ?? '',
    promoCode: l.promoCode ?? '',
    delivery: l.delivery ?? '',
    tildaTranId: l.tildaTranId ?? '',
  }))

  const quickOrderRows: LeadExportRow[] = quickOrders.map((o) => ({
    ...emptyRow('quick_order', o.id, formatExportDate(o.createdAt)),
    name: o.name ?? '',
    phone: o.phone ?? '',
    messageComment: o.comment ?? '',
    product: o.product ? `${o.product.title} (${o.product.slug})` : '',
    quantity: String(o.quantity),
  }))

  return [...partnershipRows, ...tildaRows, ...quickOrderRows]
}
