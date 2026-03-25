import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { checkCdekConnection } from '@/lib/cdek'
import * as settingsService from '@/services/settings.service'
import { resolveBrandFromRequest } from '@/lib/brand/brand-request'

/**
 * GET /api/admin/check-cdek
 * Проверяет подключение к API СДЭК. Учётные данные из настроек админки или из env.
 * Только для администраторов.
 */
export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveBrandFromRequest(request)
  const creds = await settingsService.getCdekCredentials({ brandId })
  if (!creds) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Учётные данные СДЭК не заданы. Укажите API-ключ и секрет в настройках или CDEK_CLIENT_ID и CDEK_CLIENT_SECRET в .env',
      },
      { status: 400 }
    )
  }

  const result = await checkCdekConnection(creds)
  if (result.ok) {
    return NextResponse.json({ ok: true, mode: creds.useTest ? 'test' : 'prod' })
  }
  const isMissingCreds = result.error?.includes('задайте')
  return NextResponse.json(
    { ok: false, error: result.error, mode: creds.useTest ? 'test' : 'prod' },
    { status: isMissingCreds ? 400 : 502 }
  )
}
