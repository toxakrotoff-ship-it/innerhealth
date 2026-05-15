import { NextResponse } from 'next/server'
import { z } from 'zod'
import { aggregateForDateRange } from '@/lib/analytics/aggregation-service'
import { requireAdminSession } from '@/lib/require-admin'

const periodSchema = z.enum(['7d', '30d', '90d', 'all'])

const requestSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  period: periodSchema.optional(),
})

interface DateRange {
  from: Date
  to: Date
}

function toUtcDayStart(value: string | undefined): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDateResponse(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getRangeFromPeriod(period: z.infer<typeof periodSchema> | undefined): DateRange {
  const to = new Date()
  to.setHours(0, 0, 0, 0)
  const from = new Date(to)

  if (period === '7d') from.setDate(from.getDate() - 6)
  else if (period === '90d') from.setDate(from.getDate() - 89)
  else if (period === 'all') from.setFullYear(from.getFullYear() - 5)
  else from.setDate(from.getDate() - 29)

  return { from, to }
}

function resolveDateRange(input: z.infer<typeof requestSchema>): DateRange {
  const from = toUtcDayStart(input.from)
  const to = toUtcDayStart(input.to)
  if (from && to && from <= to) return { from, to }
  return getRangeFromPeriod(input.period)
}

export async function POST(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    payload = {}
  }

  const parsed = requestSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid analytics aggregate payload' }, { status: 400 })
  }

  const { from, to } = resolveDateRange(parsed.data)
  await aggregateForDateRange(from, to)

  return NextResponse.json({
    ok: true,
    from: formatDateResponse(from),
    to: formatDateResponse(to),
  })
}
