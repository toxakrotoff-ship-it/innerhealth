import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { createCdekShipmentForOrder } from '@/lib/cdek-shipment-action'

/**
 * POST /api/admin/orders/[id]/cdek-shipment
 * Создаёт заказ на отгрузку в СДЭК для оплаченного заказа с доставкой СДЭК.
 * Используется для повтора при ошибке автоматического создания после оплаты.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  let force = false
  try {
    const body = (await request.json()) as { force?: unknown }
    force = body.force === true
  } catch {
    force = false
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
