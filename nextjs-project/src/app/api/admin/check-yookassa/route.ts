import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { checkYookassaConnection } from '@/lib/yookassa'
import * as settingsService from '@/services/settings.service'

/**
 * GET /api/admin/check-yookassa
 * Проверяет подключение к API ЮKassa (учётные данные из настроек админки или env).
 * Только для администраторов.
 */
export async function GET() {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const yookassaSettings = await settingsService.getYookassaSettingsMap()
  const shopIdFromAdmin = (yookassaSettings.yookassa_shop_id ?? '').trim()
  const secretKeyFromAdmin = (yookassaSettings.yookassa_secret_key ?? '').trim()
  const hasFromAdmin = shopIdFromAdmin.length > 0 && secretKeyFromAdmin.length > 0
  const hasFromEnv =
    typeof process.env.YOOKASSA_SHOP_ID === 'string' &&
    process.env.YOOKASSA_SHOP_ID.length > 0 &&
    typeof process.env.YOOKASSA_SECRET_KEY === 'string' &&
    process.env.YOOKASSA_SECRET_KEY.length > 0

  if (!hasFromAdmin && !hasFromEnv) {
    return NextResponse.json(
      { ok: false, error: 'Учётные данные ЮKassa не заданы (настройки или YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY)' },
      { status: 400 }
    )
  }

  const credentials = hasFromAdmin
    ? { shopId: shopIdFromAdmin, secretKey: secretKeyFromAdmin }
    : undefined

  const result = await checkYookassaConnection(credentials)
  if (result.ok) {
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json(
    { ok: false, error: result.error },
    { status: 502 }
  )
}
