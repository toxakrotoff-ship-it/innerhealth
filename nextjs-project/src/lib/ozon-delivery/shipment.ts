import 'server-only'
import { prisma } from '@/lib/prisma'
import { normalizeBrandId } from '@/lib/brand/brand'
import { getOzonDeliveryClient } from './client'
import { OzonCheckoutError } from './parcel'
import type { OzonCreateOrderRequest } from './types'

function needsReadinessConfirmation(status: string): boolean {
  return status === 'created' || status === 'forming_failed'
}

export async function runOzonShipmentAction(orderId: string, action: 'create' | 'sync' | 'approve' = 'create') {
  let shipment = await prisma.ozonShipment.findUnique({
    where: { orderId }, include: { order: { select: { status: true, brand: true, deletedAt: true, shippingInfo: { select: { deliveryMethod: true } } } } },
  })
  if (!shipment || shipment.order.deletedAt || shipment.order.shippingInfo?.deliveryMethod !== 'ozon_pvz') throw new OzonCheckoutError('У заказа нет доставки Ozon', 404)
  if (shipment.order.status !== 'paid') throw new OzonCheckoutError('Создание отгрузки Ozon доступно только для оплаченных заказов')
  const brand = normalizeBrandId(shipment.order.brand)
  const client = brand ? await getOzonDeliveryClient(brand, { includeDisabled: true }) : null
  if (!client) throw new OzonCheckoutError('Доставка Ozon пока не подключена', 503)
  if (action === 'create' && shipment.postingNumber && !needsReadinessConfirmation(shipment.status)) return shipment
  if (action !== 'create' && !shipment.postingNumber) throw new OzonCheckoutError('Сначала создайте отправление Ozon')
  const shipmentId = shipment.id
  const lockedUntil = new Date(Date.now() + 60000)
  const claimed = await prisma.ozonShipment.updateMany({
    where: { id: shipment.id, OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }] }, data: { lockedUntil },
  })
  if (!claimed.count) throw new OzonCheckoutError('Отправление Ozon уже обрабатывается. Обновите статус позже.', 409)
  try {
    // A previous worker may have finished between our initial read and claiming the lease.
    shipment = await prisma.ozonShipment.findUnique({
      where: { orderId }, include: { order: { select: { status: true, brand: true, deletedAt: true, shippingInfo: { select: { deliveryMethod: true } } } } },
    })
    if (!shipment || shipment.order.status !== 'paid' || shipment.order.deletedAt) throw new OzonCheckoutError('Заказ недоступен для отгрузки')
    if (action === 'create' && shipment.postingNumber && !needsReadinessConfirmation(shipment.status)) return shipment
    if (action === 'create' && !shipment.postingNumber) {
      const response = await client.createOrder(shipment.request as unknown as OzonCreateOrderRequest, shipment.idempotencyKey)
      const posting = response.postings.find(p => p.request_id === 1)
      if (!posting?.posting_number || response.postings.length !== 1) throw new OzonCheckoutError('Ozon вернул некорректное отправление', 502)
      // Save the posting before approval so a failed confirmation can resume without recreating it.
      await prisma.ozonShipment.update({ where: { id: shipment.id }, data: { orderNumber: response.order_number, postingNumber: posting.posting_number, status: 'created', error: null } })
      shipment = { ...shipment, orderNumber: response.order_number, postingNumber: posting.posting_number, status: 'created', error: null }
    }
    if (action === 'approve' || action === 'create') {
      if (!needsReadinessConfirmation(shipment.status)) throw new OzonCheckoutError('Отправление уже подтверждено или недоступно для подтверждения')
      await client.approvePosting(shipment.postingNumber!)
      return await prisma.ozonShipment.update({ where: { id: shipment.id }, data: { status: 'forming', error: null } })
    }
    const info = await client.postingInfo([shipment.postingNumber!])
    const posting = info.postings.find(p => p.posting_number === shipment.postingNumber)
    if (!posting?.status) throw new OzonCheckoutError('Ozon не вернул статус отправления', 502)
    return await prisma.ozonShipment.update({ where: { id: shipment.id }, data: { status: posting.status, error: null } })
  } catch (error) {
    await prisma.ozonShipment.update({ where: { id: shipmentId }, data: { error: error instanceof OzonCheckoutError ? error.message : 'Не удалось выполнить запрос к Ozon. Повторите операцию с тем же отправлением.' } })
    throw error
  } finally {
    await prisma.ozonShipment.updateMany({ where: { id: shipmentId, lockedUntil }, data: { lockedUntil: null } })
  }
}

/** Create and confirm readiness after payment; the saved shipment lets an admin resume either step. */
export async function createOzonShipmentAfterPayment(orderId: string): Promise<void> {
  try {
    if (!await prisma.ozonShipment.findUnique({ where: { orderId }, select: { id: true } })) return
    await runOzonShipmentAction(orderId)
  } catch {
    console.error('[ozon-delivery] Shipment creation or readiness confirmation failed', { orderId })
  }
}
