import 'server-only'

import {
  sendAdminCdekTrackNotification,
  sendCustomerCdekTrackNotification,
} from '@/lib/email'
import { resolveShippingCostForOrderNotify } from '@/lib/order-shipping-cost'
import * as orderService from '@/services/order.service'
import * as userService from '@/services/user.service'

export async function sendCdekTrackEmailsForOrder(
  orderId: string,
  trackNumber: string | null | undefined
): Promise<{ adminSent: boolean; customerSent: boolean; errors: string[] }> {
  const normalizedTrack = trackNumber?.trim()
  if (!normalizedTrack) return { adminSent: false, customerSent: false, errors: [] }

  const order = await orderService.findOrderForPaidEmail(orderId)
  if (!order?.shippingInfo) {
    return { adminSent: false, customerSent: false, errors: ['Заказ или адрес доставки не найден'] }
  }

  const brandId = await orderService.findOrderBrandIdForNotify(orderId)
  const shippingCost = resolveShippingCostForOrderNotify(order)

  const payload = {
    orderId: order.id,
    orderNumber: order.orderNumber ?? null,
    total: order.total,
    shippingCost,
    items: order.items.map((oi) => ({
      title: oi.product.title,
      quantity: oi.quantity,
      price: oi.price,
    })),
    shipping: {
      fullName: order.shippingInfo.fullName,
      phone: order.shippingInfo.phone,
      email: order.shippingInfo.email,
      address: order.shippingInfo.address,
      city: order.shippingInfo.city,
      zipCode: order.shippingInfo.zipCode,
      country: order.shippingInfo.country ?? 'Россия',
    },
    promoCode: order.promoCode?.code ?? null,
    cdekTrackNumber: normalizedTrack,
    brandId,
  } as const

  const errors: string[] = []
  const deliveryState = await orderService.findCdekTrackEmailState(orderId)
  let adminSent = deliveryState?.cdekTrackAdminEmailSentAt != null
  let customerSent = deliveryState?.cdekTrackCustomerEmailSentAt != null

  if (!adminSent && await orderService.claimCdekTrackEmailChannel(orderId, 'admin')) {
    const adminEmails = await userService.getAdminNotificationEmails(brandId)
    const result = await sendAdminCdekTrackNotification(adminEmails, payload)
    await orderService.finishCdekTrackEmailChannel({
      orderId,
      channel: 'admin',
      ok: result.ok,
      error: result.error,
    })
    adminSent = result.ok
    if (!result.ok) errors.push(`admin: ${result.error ?? 'SMTP error'}`)
  }

  if (!customerSent && await orderService.claimCdekTrackEmailChannel(orderId, 'customer')) {
    const result = order.shippingInfo.email && order.shippingInfo.fullName
      ? await sendCustomerCdekTrackNotification(
          order.shippingInfo.email,
          order.shippingInfo.fullName,
          payload
        )
      : { ok: true as const }
    await orderService.finishCdekTrackEmailChannel({
      orderId,
      channel: 'customer',
      ok: result.ok,
      error: result.error,
    })
    customerSent = result.ok
    if (!result.ok) errors.push(`customer: ${result.error ?? 'SMTP error'}`)
  }

  return { adminSent, customerSent, errors }
}
