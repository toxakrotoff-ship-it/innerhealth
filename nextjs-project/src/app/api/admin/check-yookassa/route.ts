import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { checkYookassaConnection } from '@/lib/yookassa'
import * as settingsService from '@/services/settings.service'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'

/**
 * GET /api/admin/check-yookassa
 * Проверяет подключение к API ЮKassa (учётные данные только из настроек админки).
 * Только для администраторов.
 */
export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)
  const credentials = await settingsService.getYookassaCredentials({ brandId })

  if (!credentials) {
    const credentialsStatus = await settingsService.getYookassaCredentialsStatus({ brandId })
    if (credentialsStatus.status === 'unreadable_encrypted') {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Ключ ЮKassa сохранён, но не читается (проверьте SETTINGS_ENCRYPTION_KEY в runtime/.env и перезапустите сервис). После исправления пересохраните ключ в админке.',
        },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { ok: false, error: 'Учётные данные ЮKassa не заданы в настройках админки' },
      { status: 400 }
    )
  }

  const result = await checkYookassaConnection(credentials)
  if (result.ok) {
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json(
    { ok: false, error: result.error },
    { status: 502 }
  )
}
