import { NextResponse } from 'next/server'
import { z } from 'zod'
import { aggregateForDateRange } from '@/lib/analytics/aggregation-service'

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
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
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
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  })
}
