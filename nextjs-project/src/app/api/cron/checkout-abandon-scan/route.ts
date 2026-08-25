import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  DEFAULT_CHECKOUT_ABANDON_TIMEOUT_MINUTES,
  scanAndMarkAbandonedCheckouts,
} from '@/lib/checkout-abandon-scan-service'

/**
 * Периодически помечает зависшие checkout-сессии как ABANDONED (ТЗ §10). Дёргается
 * VPS-кроном раз в 5–10 минут — задержка в пределах нескольких минут не критична.
 *
 * Авторизация: заголовок `x-cron-token` должен совпадать со значением
 * `CHECKOUT_ABANDON_SCAN_TOKEN` в окружении приложения (отдельный от токена
 * ЮKassa-поллера, по тому же паттерну).
 */

const querySchema = z.object({
  minutes: z.coerce.number().int().min(1).max(24 * 60).optional(),
  take: z.coerce.number().int().min(1).max(2000).optional(),
})

const TOKEN_HEADER = 'x-cron-token'
const TOKEN_ENV = 'CHECKOUT_ABANDON_SCAN_TOKEN'

export async function POST(request: Request) {
  const expectedToken = process.env[TOKEN_ENV]
  if (!expectedToken) {
    return NextResponse.json(
      { ok: false, error: `Cron is not configured (missing ${TOKEN_ENV})` },
      { status: 500 }
    )
  }
  const actualToken = request.headers.get(TOKEN_HEADER)
  if (!actualToken || actualToken !== expectedToken) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    minutes: url.searchParams.get('minutes') ?? undefined,
    take: url.searchParams.get('take') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid query' }, { status: 400 })
  }

  const envTimeout = Number(process.env.CHECKOUT_ABANDON_TIMEOUT_MINUTES)
  const defaultTimeout =
    Number.isFinite(envTimeout) && envTimeout > 0
      ? envTimeout
      : DEFAULT_CHECKOUT_ABANDON_TIMEOUT_MINUTES
  const olderThanMinutes = parsed.data.minutes ?? defaultTimeout

  const result = await scanAndMarkAbandonedCheckouts({
    olderThanMinutes,
    batchSize: parsed.data.take,
  })

  return NextResponse.json({ ok: true, olderThanMinutes, ...result })
}

export async function GET(request: Request) {
  return POST(request)
}
