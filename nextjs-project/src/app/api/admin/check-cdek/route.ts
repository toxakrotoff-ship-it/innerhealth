import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { checkCdekConnection } from '@/lib/cdek'
import * as settingsService from '@/services/settings.service'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'

/**
 * GET /api/admin/check-cdek
 * Проверяет подключение к API СДЭК. Учётные данные из настроек админки или из env.
 * Только для администраторов.
 */
export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)
  const creds = await settingsService.getCdekCredentials({ brandId })
  if (!creds) {
    const credentialsStatus = await settingsService.getCdekCredentialsStatus({ brandId })
    if (credentialsStatus.status === 'unreadable_encrypted') {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Ключи СДЭК сохранены, но не читаются (проверьте SETTINGS_ENCRYPTION_KEY в runtime/.env и перезапустите сервис). После исправления пересохраните ключи в админке.',
        },
        { status: 500 }
      )
    }
    return NextResponse.json(
      {
        ok: false,
        error:
          'Учётные данные СДЭК не заданы. Укажите API-ключ и секрет в настройках.',
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
