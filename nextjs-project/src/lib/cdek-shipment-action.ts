import 'server-only'
import { createCdekOrder } from '@/lib/cdek'
import * as orderService from '@/services/order.service'

export type CdekShipmentActionResult =
  | { success: true; uuid: string; trackNumber: string | null; message?: string }
  | { success: false; error: string; status: number }

export async function createCdekShipmentForOrder(
  orderId: string,
  options?: { force?: boolean }
): Promise<CdekShipmentActionResult> {
  const force = options?.force === true
  const order = await orderService.findOrderForCdekShipment(orderId)

  if (!order) {
    return { success: false, error: 'Заказ не найден', status: 404 }
  }
  if (order.status !== 'paid') {
    return {
      success: false,
      error: 'Создание отгрузки СДЭК доступно только для оплаченных заказов',
      status: 400,
    }
  }

  const isCdek =
    order.shippingInfo?.deliveryMethod === 'cdek_pvz' ||
    order.shippingInfo?.deliveryMethod === 'cdek_door'
  if (!isCdek) {
    return {
      success: false,
      error: 'У заказа не выбрана доставка СДЭК',
      status: 400,
    }
  }

  if (order.cdekOrderUuid && !order.cdekOrderError && !force) {
    return {
      success: true,
      uuid: order.cdekOrderUuid,
      trackNumber: order.cdekTrackNumber ?? null,
      message: 'Заказ СДЭК уже создан',
    }
  }

  const result = await createCdekOrder(orderId)
  if ('error' in result) {
    await orderService.updateOrder(orderId, { cdekOrderError: result.error })
    return { success: false, error: result.error, status: 502 }
  }

  await orderService.updateOrder(orderId, {
    cdekOrderUuid: result.uuid,
    cdekTrackNumber: result.trackNumber ?? null,
    cdekOrderError: null,
  })
  return { success: true, uuid: result.uuid, trackNumber: result.trackNumber ?? null }
}
