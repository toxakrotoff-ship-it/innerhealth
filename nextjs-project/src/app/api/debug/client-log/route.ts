import { NextResponse } from 'next/server'
import { z } from 'zod'

const eventSchema = z.object({
  scope: z.enum(['cart', 'cdek-widget', 'cdek-api']),
  event: z.string().min(1).max(128),
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  data: z.record(z.string(), z.unknown()).optional(),
  error: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().datetime().optional(),
})

const bodySchema = z.object({
  sessionId: z.string().min(1).max(128),
  path: z.string().min(1).max(1024),
  userAgent: z.string().max(1024).optional(),
  events: z.array(eventSchema).min(1).max(50),
})

function isServerCartDebugEnabled(): boolean {
  return process.env.CART_DEBUG_ENABLED === 'true' || process.env.NODE_ENV === 'development'
}

function shouldPersistEvent(level: z.infer<typeof eventSchema>['level']): boolean {
  if (isServerCartDebugEnabled()) return true
  return level === 'warn' || level === 'error'
}

export async function POST(request: Request) {
  try {
    const raw = await request.json()
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const { sessionId, path, userAgent, events } = parsed.data
    const brand = new URL(request.url).searchParams.get('brand')

    for (const event of events) {
      if (!shouldPersistEvent(event.level)) continue

      const payload = {
        sessionId,
        path,
        brand,
        userAgent: userAgent ?? null,
        scope: event.scope,
        event: event.event,
        level: event.level,
        occurredAt: event.occurredAt ?? new Date().toISOString(),
        data: event.data ?? null,
        error: event.error ?? null,
      }

      if (event.level === 'error') {
        console.error('[cart-debug]', payload)
      } else if (event.level === 'warn') {
        console.warn('[cart-debug]', payload)
      } else {
        console.info('[cart-debug]', payload)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'client log error'
    console.error('[cart-debug][ingest-failed]', { message })
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
