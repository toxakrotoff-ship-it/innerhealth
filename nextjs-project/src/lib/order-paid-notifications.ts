import 'server-only'

import { after } from 'next/server'
import * as orderService from '@/services/order.service'
import * as userService from '@/services/user.service'
import { notifyTelegramOrder } from '@/lib/telegram-notify'
import { notifyMaxOrder } from '@/lib/max-notify'
import { sendPaidOrderEmailsWithDelay } from '@/lib/email'
import { resolveShippingCostForOrderNotify } from '@/lib/order-shipping-cost'

/**
 * Полные уведомления о заказе (админы: Telegram, MAX, почта; клиент: письмо об оплате; партнёр по промокоду).
 * Вызывать только после перевода заказа в статус «оплачен».
 */
export function scheduleNotifyAllChannelsAfterOrderPaid(orderId: string): void {
  after(() => {
    void notifyAllChannelsAfterOrderPaid(orderId)
  })
}

async function notifyAllChannelsAfterOrderPaid(orderId: string): Promise<void> {
  try {
    const order = await orderService.findOrderForPaidEmail(orderId)
    if (!order?.shippingInfo) {
      console.warn('[order-paid-notifications] skip: missing order or shipping', orderId)
      return
    }

    const brandId = await orderService.findOrderBrandIdForNotify(orderId)
    const shippingCost = resolveShippingCostForOrderNotify(order)

    const items = order.items.map((oi) => ({
      title: oi.product.title,
      quantity: oi.quantity,
      price: oi.price,
    }))

    const shipping = {
      fullName: order.shippingInfo.fullName,
      phone: order.shippingInfo.phone,
      email: order.shippingInfo.email,
      address: order.shippingInfo.address,
      city: order.shippingInfo.city,
      zipCode: order.shippingInfo.zipCode,
      country: order.shippingInfo.country ?? 'Россия',
    }

    const promoDiscountAmount =
      order.promoDiscountAmount != null && order.promoDiscountAmount > 0
        ? order.promoDiscountAmount
        : null

    const notifyPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber ?? null,
      total: order.total,
      shippingCost,
      items,
      shipping,
      promoCode: order.promoCode?.code ?? null,
      promoCodeId: order.promoCodeId ?? undefined,
      promoDiscountAmount,
      deliveryMethod: order.shippingInfo.deliveryMethod ?? null,
      cdekOrderUuid: order.cdekOrderUuid ?? null,
      cdekOrderError: order.cdekOrderError ?? null,
      brandId,
    } as const

    notifyTelegramOrder(notifyPayload)
    void notifyMaxOrder({
      ...notifyPayload,
      customerUserId: order.userId ?? undefined,
    })

    const adminEmails = await userService.getAdminNotificationEmails()
    void sendPaidOrderEmailsWithDelay(adminEmails, shipping.email.trim(), shipping.fullName, {
      orderId: order.id,
      orderNumber: order.orderNumber ?? null,
      total: order.total,
      shippingCost,
      items,
      shipping,
      promoCode: order.promoCode?.code ?? null,
      promoDiscountAmount,
      cdekTrackNumber: order.cdekTrackNumber ?? null,
    })
  } catch (e) {
    console.error('[order-paid-notifications] failed', orderId, e)
  }
}
