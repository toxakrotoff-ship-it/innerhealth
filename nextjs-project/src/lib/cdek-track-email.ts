import 'server-only'

import {
  sendAdminCdekTrackNotification,
  sendCustomerCdekTrackNotification,
} from '@/lib/email'
import * as orderService from '@/services/order.service'
import * as userService from '@/services/user.service'

export async function sendCdekTrackEmailsForOrder(
  orderId: string,
  trackNumber: string | null | undefined
): Promise<void> {
  const normalizedTrack = trackNumber?.trim()
  if (!normalizedTrack) return

  const order = await orderService.findOrderForPaidEmail(orderId)
  if (!order?.shippingInfo) return

  const itemsSubtotal = order.items.reduce((sum, oi) => sum + oi.quantity * oi.price, 0)
  const shippingCost = Math.max(0, order.total - itemsSubtotal)

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
  } as const

  const adminEmails = await userService.getAdminNotificationEmails()
  await sendAdminCdekTrackNotification(adminEmails, payload)

  if (order.shippingInfo.email && order.shippingInfo.fullName) {
    await sendCustomerCdekTrackNotification(
      order.shippingInfo.email,
      order.shippingInfo.fullName,
      payload
    )
  }
}
