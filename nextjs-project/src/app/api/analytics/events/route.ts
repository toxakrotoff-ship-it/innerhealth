import { NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  analyticsEventInputArraySchema,
  analyticsEventInputSchema,
  type AnalyticsEventInput,
} from '@/lib/analytics/analytics-event-schema'
import {
  createAnalyticsEvent,
  createAnalyticsEventsBatch,
} from '@/lib/analytics/analytics-event-service'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_EVENTS = 200

interface RateLimitState {
  windowStart: number
  count: number
}

const rateLimitStore = new Map<string, RateLimitState>()

function getClientIp(request: Request): string | undefined {
  const header = request.headers.get('x-forwarded-for') ?? ''
  if (!header) return undefined
  const first = header.split(',')[0]?.trim()
  return first || undefined
}

function getUserAgent(request: Request): string | undefined {
  const header = request.headers.get('user-agent') ?? ''
  const value = header.trim()
  return value || undefined
}

function getIpHash(ip: string | undefined): string | undefined {
  if (!ip) return undefined
  const salt = process.env.ANALYTICS_IP_HASH_SALT ?? ''
  if (!salt) return undefined
  const hash = crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex')
  return hash
}

function isRateLimited(key: string, eventsCount: number): boolean {
  const now = Date.now()
  const existing = rateLimitStore.get(key)

  if (!existing || now - existing.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, {
      windowStart: now,
      count: eventsCount,
    })
    return eventsCount > RATE_LIMIT_MAX_EVENTS
  }

  const nextCount = existing.count + eventsCount
  existing.count = nextCount
  return nextCount > RATE_LIMIT_MAX_EVENTS
}

export async function POST(request: Request) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const clientIp = getClientIp(request)
  const userAgent = getUserAgent(request)
  const ipHash = getIpHash(clientIp)

  try {
    let events: AnalyticsEventInput[]

    if (Array.isArray(payload)) {
      events = analyticsEventInputArraySchema.parse(payload)
    } else {
      events = [analyticsEventInputSchema.parse(payload)]
    }

    const rateKey = ipHash ?? clientIp ?? 'unknown'
    if (isRateLimited(rateKey, events.length)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    if (events.length === 1) {
      const [input] = events
      await createAnalyticsEvent({
        ...input,
        ipHash,
        userAgent,
      })

      return NextResponse.json({ ok: true, insertedCount: 1 })
    }

    const result = await createAnalyticsEventsBatch(
      events.map((event) => ({
        ...event,
        ipHash,
        userAgent,
      }))
    )

    return NextResponse.json({ ok: true, insertedCount: result.insertedCount })
  } catch (err) {
    console.error('Analytics events POST error:', err)
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    return NextResponse.json(
      { error: 'Failed to log analytics events' },
      { status: 500 }
    )
  }
}

