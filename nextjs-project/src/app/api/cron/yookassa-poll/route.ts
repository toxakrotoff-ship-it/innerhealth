import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { syncPendingOrdersBatch } from '@/lib/yookassa-sync-service'

/**
 * Фолбэк-поллер для ЮKassa: на случай, если webhook не дошёл (или дошёл, но
 * был отвергнут IP-фильтром / упал на верификации). Дёргается VPS-кроном
 * раз в минуту; throttling по возрасту заказа выполняется на стороне сервиса.
 *
 * Авторизация: заголовок `x-cron-token` должен совпадать со значением
 * `YOOKASSA_POLL_TOKEN` в окружении приложения. Эндпоинт — read+update,
 * не идемпотентный с т.з. побочных эффектов (создание СДЭК, уведомления).
 */

const querySchema = z.object({
  /** Глубина просмотра — сколько дней назад идти. По умолчанию 7. */
  days: z.coerce.number().int().min(1).max(60).default(7),
  /** Сколько заказов максимум за один прогон. По умолчанию 100. */
  take: z.coerce.number().int().min(1).max(500).default(100),
})

const TOKEN_HEADER = 'x-cron-token'
const TOKEN_ENV = 'YOOKASSA_POLL_TOKEN'

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
    days: url.searchParams.get('days') ?? undefined,
    take: url.searchParams.get('take') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid query' }, { status: 400 })
  }

  const { days, take } = parsed.data
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const result = await syncPendingOrdersBatch({
    since,
    take,
    brandId: null,
    source: 'cron-poll',
    honorThrottle: true,
  })

  return NextResponse.json({
    ok: true,
    days,
    take,
    scanned: result.scanned,
    skippedByThrottle: result.skippedByThrottle,
    updated: result.updated,
    updatedToPaid: result.updatedToPaid,
    updatedToCanceled: result.updatedToCanceled,
    errors: result.errors,
  })
}

export async function GET(request: Request) {
  return POST(request)
}
