import { NextResponse } from 'next/server'
import { getTelegramBotUserCapabilities } from '@/bot/runtime/capabilities'
import { normalizeBrandId } from '@/lib/brand/brand'
import { createCdekShipmentForOrder } from '@/lib/cdek-shipment-action'

const SERVICE_HEADER = 'x-service-key'
const SERVICE_SECRET_ENV = 'TELEGRAM_SERVICE_SECRET'

function isServiceRequest(request: Request): boolean {
  const secret = process.env[SERVICE_SECRET_ENV]
  if (!secret || typeof secret !== 'string') return false
  const key = request.headers.get(SERVICE_HEADER)
  return key === secret
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isServiceRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const brandId = normalizeBrandId(url.searchParams.get('brand')) ?? 'inner'

  let telegramUserId = ''
  let force = false
  try {
    const body = (await request.json()) as { telegramUserId?: unknown; force?: unknown }
    telegramUserId = typeof body.telegramUserId === 'string' ? body.telegramUserId.trim() : ''
    force = body.force === true
  } catch {
    telegramUserId = ''
    force = false
  }

  if (!telegramUserId) {
    return NextResponse.json({ error: 'Missing telegramUserId' }, { status: 400 })
  }

  const capabilities = await getTelegramBotUserCapabilities(telegramUserId, { brandId })
  if (!capabilities.isAdmin) {
    return NextResponse.json({ error: 'Доступ только для администраторов' }, { status: 403 })
  }

  const { id: orderId } = await context.params
  const result = await createCdekShipmentForOrder(orderId, { force })
  if (result.success) {
    return NextResponse.json({
      success: true,
      uuid: result.uuid,
      trackNumber: result.trackNumber,
      ...(result.message ? { message: result.message } : {}),
    })
  }

  return NextResponse.json({ success: false, error: result.error }, { status: result.status })
}
