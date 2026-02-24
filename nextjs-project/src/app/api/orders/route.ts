import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createOrderBodySchema } from '@/lib/validations/order'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import {
  createYookassaPayment,
  buildReceiptItemsFromOrderItems,
  appendDeliveryReceiptItem,
  getBaseUrl,
} from '@/lib/yookassa'
import { notifyTelegramOrder } from '@/lib/telegram-notify'
import { sendNewOrderNotification } from '@/lib/email'
import { randomUUID } from 'crypto'

/** Скидка по промокоду применяется только к сумме товаров без акционной цены. */
function applyPromoToSubtotal(
  subtotal: number,
  promo: { discountType: string; discountValue: number } | null
): number {
  if (!promo || promo.discountValue == null) return subtotal
  if (promo.discountType === 'percentage') {
    return Math.max(0, subtotal * (1 - promo.discountValue / 100))
  }
  return Math.max(0, subtotal - promo.discountValue)
}

const ORDER_RATE_LIMIT = 10 // orders per minute per IP

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = checkRateLimit(clientId, 'order', ORDER_RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Слишком много заказов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rate.resetIn) } }
    )
  }

  try {
    const raw = await request.json()
    const parsed = createOrderBodySchema.safeParse(raw)
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors
      const message = Object.values(first)[0]?.[0] ?? parsed.error.message
      return NextResponse.json({ error: message }, { status: 400 })
    }
    const { items, total: clientTotal, promoCodeId, deliverySum = 0, shipping } = parsed.data

    const productIds = Array.from(new Set(items.map((i) => i.productId)))
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, priceOld: true, discountPrice: true, isPromoEligible: true },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

    let sumPromoPrice = 0
    let sumEligibleFixed = 0
    let sumEligiblePercent = 0
    let sumIneligible = 0
    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) {
        return NextResponse.json({ error: `Товар не найден: ${item.productId}` }, { status: 400 })
      }
      const hasPromoPrice = product.priceOld != null && product.priceOld > product.price
      const isEligible = product.isPromoEligible !== false
      if (hasPromoPrice) {
        sumPromoPrice += product.price * item.quantity
      } else if (isEligible && product.discountPrice != null) {
        sumEligibleFixed += product.discountPrice * item.quantity
      } else if (isEligible) {
        sumEligiblePercent += product.price * item.quantity
      } else {
        sumIneligible += product.price * item.quantity
      }
    }

    let promo: { discountType: string; discountValue: number } | null = null
    if (promoCodeId) {
      const promoRecord = await prisma.promoCode.findUnique({
        where: { id: promoCodeId },
      })
      if (promoRecord?.isActive) {
        const now = new Date()
        const validFrom = !promoRecord.validFrom || now >= promoRecord.validFrom
        const validTo = !promoRecord.validTo || now <= promoRecord.validTo
        const underLimit =
          promoRecord.usageLimit == null || promoRecord.usedCount < promoRecord.usageLimit
        if (validFrom && validTo && underLimit) {
          promo = {
            discountType: promoRecord.discountType,
            discountValue: promoRecord.discountValue,
          }
        }
      }
    }

    // Промокод применяется только к сумме товаров; доставка прибавляется без скидки
    const goodsTotal =
      sumPromoPrice + sumEligibleFixed + applyPromoToSubtotal(sumEligiblePercent, promo) + sumIneligible
    const total = goodsTotal + deliverySum

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          total,
          status: 'pending',
          promoCodeId: promoCodeId || undefined,
          items: {
            create: items.map((i) => {
              const product = productMap.get(i.productId)!
              return {
                productId: i.productId,
                quantity: i.quantity,
                price: product.price,
              }
            }),
          },
        },
        include: { items: { include: { product: { select: { title: true } } } } },
      })

      await tx.shippingInfo.create({
        data: {
          orderId: created.id,
          fullName: shipping.fullName.trim(),
          phone: shipping.phone.trim(),
          email: shipping.email.trim(),
          address: shipping.address.trim(),
          city: shipping.city.trim(),
          zipCode: (shipping.zipCode ?? '').toString().trim(),
          country: (shipping.country ?? 'Россия').trim(),
        },
      })

      if (promoCodeId) {
        await tx.promoCode.update({
          where: { id: promoCodeId },
          data: { usedCount: { increment: 1 } },
        })
      }

      return created
    })

    let promoCodeStr: string | null = null
    if (promoCodeId) {
      const p = await prisma.promoCode.findUnique({
        where: { id: promoCodeId },
        select: { code: true },
      })
      promoCodeStr = p?.code ?? null
    }
    notifyTelegramOrder({
      orderId: order.id,
      total: order.total,
      items: order.items.map((oi) => ({
        title: oi.product.title,
        quantity: oi.quantity,
        price: oi.price,
      })),
      shipping: {
        fullName: shipping.fullName.trim(),
        phone: shipping.phone.trim(),
        email: shipping.email.trim(),
        address: shipping.address.trim(),
        city: shipping.city.trim(),
        zipCode: (shipping.zipCode ?? '').toString().trim(),
        country: (shipping.country ?? 'Россия').trim(),
      },
      promoCode: promoCodeStr,
    })

    const orderNotificationPayload = {
      orderId: order.id,
      total: order.total,
      items: order.items.map((oi) => ({
        title: oi.product.title,
        quantity: oi.quantity,
        price: oi.price,
      })),
      shipping: {
        fullName: shipping.fullName.trim(),
        phone: shipping.phone.trim(),
        email: shipping.email.trim(),
        address: shipping.address.trim(),
        city: shipping.city.trim(),
        zipCode: (shipping.zipCode ?? '').toString().trim(),
        country: (shipping.country ?? 'Россия').trim(),
      },
      promoCode: promoCodeStr,
    }
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true, notificationEmail: true },
    })
    const adminEmails = admins.map(
      (a) => (a.notificationEmail?.trim() || a.email).trim()
    ).filter(Boolean)
    if (adminEmails.length > 0) {
      void sendNewOrderNotification(adminEmails, orderNotificationPayload).catch((e) =>
        console.error('[orders] New order email notification error:', e)
      )
    }

    const hasYookassa =
      typeof process.env.YOOKASSA_SHOP_ID === 'string' &&
      process.env.YOOKASSA_SHOP_ID.length > 0 &&
      typeof process.env.YOOKASSA_SECRET_KEY === 'string' &&
      process.env.YOOKASSA_SECRET_KEY.length > 0

    if (hasYookassa) {
      try {
        const baseUrl = getBaseUrl()
        const receiptItems = buildReceiptItemsFromOrderItems(
          order.items.map((oi) => ({
            description: oi.product.title,
            quantity: oi.quantity,
            price: oi.price,
          }))
        )
        const receiptWithDelivery = appendDeliveryReceiptItem(receiptItems, deliverySum)
        const { paymentId, confirmationUrl } = await createYookassaPayment({
          amount: total,
          description: `Заказ №${order.id}`,
          orderId: order.id,
          customerEmail: shipping.email.trim(),
          receiptItems: receiptWithDelivery,
          returnUrl: `${baseUrl}/cart?payment=success`,
          idempotenceKey: randomUUID(),
        })
        await prisma.order.update({
          where: { id: order.id },
          data: { yookassaPaymentId: paymentId } as Prisma.OrderUpdateInput,
        })
        return NextResponse.json({
          id: order.id,
          success: true,
          confirmationUrl,
          paymentId,
        })
      } catch (yooErr) {
        console.error('YooKassa create payment error:', yooErr)
        return NextResponse.json(
          { error: 'Заказ создан, но не удалось создать платёж. Мы свяжемся с вами.' },
          { status: 502 }
        )
      }
    }

    return NextResponse.json({ id: order.id, success: true })
  } catch (e) {
    console.error('Order create error:', e)
    return NextResponse.json({ error: 'Ошибка создания заказа' }, { status: 500 })
  }
}
