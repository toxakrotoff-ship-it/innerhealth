import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/require-admin'
import {
  getAllLeadsForExport,
  buildLeadsCsv,
  LeadExportFilter,
  type LeadsExportBrandScope,
} from '@/services/leads-export.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'

const presetSchema = z
  .enum(['all', 'today', 'last7', 'last30', 'thisMonth', 'prevMonth'])
  .optional()

const querySchema = z.object({
  /** При значении `1` или `on` — лиды всех витрин (см. чекбокс на странице выгрузки). */
  allBrands: z.string().optional(),
  preset: presetSchema,
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid from date format')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid to date format')
    .optional(),
})

interface ParsedQuery {
  preset?: z.infer<typeof presetSchema>
  from?: string
  to?: string
}

function buildFilterFromQuery(data: ParsedQuery): LeadExportFilter | undefined {
  const setDayBounds = (date: Date, isStart: boolean): Date => {
    const result = new Date(date)
    if (isStart) {
      result.setHours(0, 0, 0, 0)
    } else {
      result.setHours(23, 59, 59, 999)
    }
    return result
  }

  if (data.preset && data.preset !== 'all') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (data.preset) {
      case 'today': {
        const from = setDayBounds(today, true)
        const to = setDayBounds(today, false)
        return { from, to }
      }
      case 'last7': {
        const from = new Date(today)
        from.setDate(from.getDate() - 6)
        return {
          from: setDayBounds(from, true),
          to: setDayBounds(today, false),
        }
      }
      case 'last30': {
        const from = new Date(today)
        from.setDate(from.getDate() - 29)
        return {
          from: setDayBounds(from, true),
          to: setDayBounds(today, false),
        }
      }
      case 'thisMonth': {
        const from = new Date(today.getFullYear(), today.getMonth(), 1)
        const to = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        return {
          from: setDayBounds(from, true),
          to: setDayBounds(to, false),
        }
      }
      case 'prevMonth': {
        const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const to = new Date(today.getFullYear(), today.getMonth(), 0)
        return {
          from: setDayBounds(from, true),
          to: setDayBounds(to, false),
        }
      }
      default:
        return undefined
    }
  }

  if (data.from || data.to) {
    const filter: LeadExportFilter = {}
    if (data.from) {
      const fromDate = new Date(`${data.from}T00:00:00`)
      filter.from = setDayBounds(fromDate, true)
    }
    if (data.to) {
      const toDate = new Date(`${data.to}T00:00:00`)
      filter.to = setDayBounds(toDate, false)
    }
    if (filter.from && filter.to && filter.from > filter.to) {
      throw new Error('from date is after to date')
    }
    return filter
  }

  if (data.preset === 'all' || (!data.preset && !data.from && !data.to)) {
    return undefined
  }

  return undefined
}

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  try {
    const url = new URL(request.url)
    const rawQuery = Object.fromEntries(url.searchParams.entries())
    const parseResult = querySchema.safeParse(rawQuery)

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Неверные параметры фильтра периода' }, { status: 400 })
    }

    let filter: LeadExportFilter | undefined
    try {
      filter = buildFilterFromQuery(parseResult.data)
    } catch {
      return NextResponse.json({ error: 'Неверный диапазон дат' }, { status: 400 })
    }

    const allBrandsRaw = parseResult.data.allBrands
    const includeAllBrands = allBrandsRaw === '1' || allBrandsRaw === 'on'
    const brandScope: LeadsExportBrandScope = includeAllBrands
      ? 'all'
      : resolveBrandOrDefaultFromRequest(request)

    const rows = await getAllLeadsForExport(filter, brandScope)
    const csv = buildLeadsCsv(rows)
    const date = new Date().toISOString().slice(0, 10)
    const filename =
      brandScope === 'all' ? `leads-all-brands-${date}.csv` : `leads-${brandScope}-${date}.csv`
    const bom = '\uFEFF'
    return new NextResponse(bom + csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    console.error('[admin/leads/export] Error:', e)
    return NextResponse.json(
      { error: 'Не удалось сформировать выгрузку лидов' },
      { status: 500 }
    )
  }
}
