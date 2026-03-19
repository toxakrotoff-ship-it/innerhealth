import { NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const bodySchema = z.object({
  query: z.string().trim().min(2).max(200),
  path: z.string().trim().max(512).optional(),
})

const RATE_WINDOW_MS = 60_000
const RATE_MAX = 20
const rateByKey = new Map<string, { start: number; count: number }>()

function rateLimited(key: string): boolean {
  const now = Date.now()
  const row = rateByKey.get(key)
  if (!row || now - row.start > RATE_WINDOW_MS) {
    rateByKey.set(key, { start: now, count: 1 })
    return false
  }
  row.count += 1
  return row.count > RATE_MAX
}

function hashIp(ip: string | undefined): string {
  if (!ip) return 'unknown'
  const salt = process.env.ZERO_HIT_RATE_SALT ?? 'innerhealth'
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)
}

export async function POST(request: Request): Promise<Response> {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ipKey = hashIp(forwarded)
  if (rateLimited(ipKey)) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 202 })
  }

  const path = parsed.data.path?.startsWith('/') ? parsed.data.path : '/catalog'

  try {
    await prisma.catalogSearchZeroHit.create({
      data: {
        query: parsed.data.query,
        path,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Persist failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
