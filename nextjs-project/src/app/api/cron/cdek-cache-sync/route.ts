import 'server-only'
import { NextResponse } from 'next/server'
import { runCdekCacheSync } from '@/lib/cdek-cache-sync'

/**
 * Ночная синхронизация кэша СДЭК: ПВЗ по регионам РФ + тарифы до популярных/
 * реально используемых городов назначения. Раздача из этого кэша происходит
 * в /api/cdek-widget/service — этот роут только прогревает Postgres-таблицы
 * CdekOfficeCache / CdekTariffCache.
 *
 * Дёргается VPS-кроном раз в сутки (см. deploy/ops/cdek-cache-sync.sh),
 * авторизация — заголовок `x-cron-token`, должен совпадать с
 * `CDEK_CACHE_SYNC_TOKEN` в окружении приложения.
 *
 * Прогон долгий (десятки регионов * ретраи + десятки городов * весовые
 * бакеты), поэтому таймаут на стороне крон-скрипта должен быть щедрым
 * (см. --max-time в cdek-cache-sync.sh).
 */

const TOKEN_HEADER = 'x-cron-token'
const TOKEN_ENV = 'CDEK_CACHE_SYNC_TOKEN'

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

  try {
    const summary = await runCdekCacheSync()
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CDEK cache sync failed'
    console.error('[cron/cdek-cache-sync][error]', { message, error })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return POST(request)
}
