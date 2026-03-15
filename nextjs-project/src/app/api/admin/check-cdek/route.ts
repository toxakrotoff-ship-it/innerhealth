import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { checkCdekConnection } from '@/lib/cdek'

/**
 * GET /api/admin/check-cdek
 * Проверяет подключение к API СДЭК (OAuth по CDEK_CLIENT_ID и CDEK_CLIENT_SECRET из env).
 * Только для администраторов.
 */
export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const hasFromEnv =
    typeof process.env.CDEK_CLIENT_ID === 'string' &&
    process.env.CDEK_CLIENT_ID.length > 0 &&
    typeof process.env.CDEK_CLIENT_SECRET === 'string' &&
    process.env.CDEK_CLIENT_SECRET.length > 0
  const hasFromLegacyEnv =
    typeof process.env.CDEK_ACCOUNT === 'string' &&
    process.env.CDEK_ACCOUNT.length > 0 &&
    typeof process.env.CDEK_SECURE === 'string' &&
    process.env.CDEK_SECURE.length > 0

  if (!hasFromEnv && !hasFromLegacyEnv) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Учётные данные СДЭК не заданы. Укажите CDEK_CLIENT_ID и CDEK_CLIENT_SECRET (или CDEK_ACCOUNT и CDEK_SECURE) в .env',
      },
      { status: 400 }
    )
  }

  const result = await checkCdekConnection()
  if (result.ok) {
    return NextResponse.json({ ok: true })
  }
  const isMissingCreds = result.error?.includes('задайте')
  return NextResponse.json(
    { ok: false, error: result.error },
    { status: isMissingCreds ? 400 : 502 }
  )
}
