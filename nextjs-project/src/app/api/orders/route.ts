import { NextResponse } from 'next/server'
import { createOrderBodySchema } from '@/lib/validations/order'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import {
  createYookassaPayment,
  buildReceiptItemsFromOrderItems,
  appendDeliveryReceiptItem,
  getBaseUrl,
} from '@/lib/yookassa'
import { notifyTelegramOrder, notifyTelegramPaymentError } from '@/lib/telegram-notify'
import { sendNewOrderNotification } from '@/lib/email'
import { randomUUID } from 'crypto'
import * as productService from '@/services/product.service'
import * as promoService from '@/services/promo.service'
import * as orderService from '@/services/order.service'
import * as userService from '@/services/user.service'
import * as settingsService from '@/services/settings.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/** Код НДС для чека 54-ФЗ (1–12 по справочнику ЮKassa). По умолчанию 1 — без НДС. */
function parseVatCode(value: string | undefined, fallback: number): number {
  const n = parseInt(value ?? '', 10)
  if (Number.isNaN(n) || n < 1 || n > 12) return fallback
  return n
}

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
  const rate = await checkRateLimit(clientId, 'order', ORDER_RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Слишком много заказов. Попробуйте позже.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.resetIn),
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  try {
    const raw = await request.json()
    const parsed = createOrderBodySchema.safeParse(raw)
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors
      const message = Object.values(first)[0]?.[0] ?? parsed.error.message
      return NextResponse.json(
        { error: message },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }
    const { items, promoCodeId, deliverySum = 0, shipping } = parsed.data

    const productIds = Array.from(new Set(items.map((i) => i.productId)))
    const products = await productService.getProductsForOrder(productIds)
    const productMap = new Map(products.map((p) => [p.id, p]))

    let sumPromoPrice = 0
    let sumEligibleFixed = 0
    let sumEligiblePercent = 0
    let sumIneligible = 0
    for (const item of items) {
      const product = productMap.get(item.productId)
      if (!product) {
        return NextResponse.json(
          { error: `Товар не найден: ${item.productId}` },
          {
            status: 400,
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        )
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
      const promoRecord = await promoService.findPromoById(promoCodeId)
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
    const promoDiscountAmount =
      promo != null ? sumEligiblePercent - applyPromoToSubtotal(sumEligiblePercent, promo) : 0

    const session = await getServerSession(authOptions)
    const userId = session?.user?.id ?? null

    const order = await orderService.createOrderWithItemsAndShipping({
      total,
      promoCodeId: promoCodeId || null,
      promoDiscountAmount: promoDiscountAmount > 0 ? promoDiscountAmount : null,
      userId,
      items: items.map((i) => {
        const product = productMap.get(i.productId)!
        return {
          productId: i.productId,
          quantity: i.quantity,
          price: product.price,
        }
      }),
      shipping: {
        fullName: shipping.fullName.trim(),
        phone: shipping.phone.trim(),
        email: shipping.email.trim(),
        address: shipping.address.trim(),
        city: shipping.city.trim(),
        zipCode: (shipping.zipCode ?? '').toString().trim(),
        country: (shipping.country ?? 'Россия').trim(),
        deliveryMethod: shipping.deliveryMethod ?? undefined,
        cdekCityCode: shipping.cdekCityCode ?? undefined,
        cdekPvzCode: shipping.cdekPvzCode ?? undefined,
        cdekTariffCode: shipping.cdekTariffCode ?? undefined,
        doorAddress: shipping.doorAddress,
      },
    })

    const promoCodeStr = promoCodeId
      ? await promoService.getPromoCodeStringById(promoCodeId)
      : null
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
      promoCodeId: order.promoCodeId ?? undefined,
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
    const adminEmails = await userService.getAdminNotificationEmails()
    if (adminEmails.length > 0) {
      void sendNewOrderNotification(adminEmails, orderNotificationPayload).catch((e) =>
        console.error('[orders] New order email notification error:', e)
      )
    }

    const yookassaSettings = await settingsService.getYookassaSettingsMap()
    const shopIdFromAdmin = (yookassaSettings.yookassa_shop_id ?? '').trim()
    const secretKeyFromAdmin = (yookassaSettings.yookassa_secret_key ?? '').trim()
    const hasYookassaFromAdmin = shopIdFromAdmin.length > 0 && secretKeyFromAdmin.length > 0
    const hasYookassaFromEnv =
      typeof process.env.YOOKASSA_SHOP_ID === 'string' &&
      process.env.YOOKASSA_SHOP_ID.length > 0 &&
      typeof process.env.YOOKASSA_SECRET_KEY === 'string' &&
      process.env.YOOKASSA_SECRET_KEY.length > 0
    const hasYookassa = hasYookassaFromAdmin || hasYookassaFromEnv

    if (hasYookassa) {
      try {
        const baseUrl = getBaseUrl()
        const vatCodeGoods = parseVatCode(yookassaSettings.yookassa_receipt_vat_code, 1)
        const vatCodeDelivery = parseVatCode(
          yookassaSettings.yookassa_receipt_vat_code_delivery,
          vatCodeGoods
        )
        const receiptItems = buildReceiptItemsFromOrderItems(
          order.items.map((oi) => ({
            description: oi.product.title,
            quantity: oi.quantity,
            price: oi.price,
          })),
          vatCodeGoods
        )
        const receiptWithDelivery = appendDeliveryReceiptItem(
          receiptItems,
          deliverySum,
          vatCodeDelivery
        )
        const credentials =
          hasYookassaFromAdmin
            ? { shopId: shopIdFromAdmin, secretKey: secretKeyFromAdmin }
            : undefined
        const { paymentId, confirmationUrl } = await createYookassaPayment({
          amount: total,
          description: `Заказ №${order.id}`,
          orderId: order.id,
          customerEmail: shipping.email.trim(),
          receiptItems: receiptWithDelivery,
          returnUrl: `${baseUrl}/cart?payment=success`,
          idempotenceKey: randomUUID(),
          credentials,
        })
        await orderService.updateOrder(order.id, { yookassaPaymentId: paymentId })
        return NextResponse.json(
          {
            id: order.id,
            success: true,
            confirmationUrl,
            paymentId,
          },
          {
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        )
      } catch (yooErr) {
        console.error('YooKassa create payment error:', yooErr)
        const errorMessage = yooErr instanceof Error ? yooErr.message : String(yooErr)
        notifyTelegramPaymentError({
          orderId: order.id,
          total,
          errorMessage,
          context: 'create',
        })
        return NextResponse.json(
          { error: 'Заказ создан, но не удалось создать платёж. Мы свяжемся с вами.' },
          {
            status: 502,
            headers: {
              'Cache-Control': 'no-store',
            },
          }
        )
      }
    }

    return NextResponse.json(
      { id: order.id, success: true },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (e) {
    console.error('Order create error:', e)
    return NextResponse.json(
      { error: 'Ошибка создания заказа' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}
