import 'server-only'
import { prisma } from '@/lib/prisma'
import type { BrandId } from '@/lib/brand/brand'
import { productBelongsToBrandScope } from '@/lib/brand/brand-scope'
import { getPhoneDigits, validatePhoneRu } from '@/lib/phone-mask'
import { calculateGiftsForOrder } from '@/services/gift-promotion.service'
import { getOzonDeliveryConfig } from './config'
import { getOzonDeliveryClient } from './client'
import { buildOzonParcel, ozonCartFingerprint, ozonMoneyToKopecks, ozonPhoneHash, OzonCheckoutError } from './parcel'
import type { OzonCheckoutPosting } from './types'
import { resolveOzonParcelLines } from './package-defaults'

export interface OzonQuoteInput {
  items: Array<{ productId: string; quantity: number }>
  phone: string
  deliveryPointId: number
  promoCodeId?: string | null
}

export function normalizeOzonPhone(phone: string): string {
  const result = validatePhoneRu(phone)
  if (result.valid === false) throw new OzonCheckoutError(result.message)
  return `+${getPhoneDigits(phone)}`
}

async function getParcelLines(input: OzonQuoteInput, brandId: BrandId) {
  const quantities = new Map<string, number>()
  for (const item of input.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
  const products = await prisma.product.findMany({
    where: { id: { in: [...quantities.keys()] }, isDraft: false },
    select: { id: true, brand: true, price: true, weight: true, length: true, width: true, height: true },
  })
  if (products.length !== quantities.size || products.some(p => !productBelongsToBrandScope(p.brand, brandId))) {
    throw new OzonCheckoutError('Товар недоступен для заказа')
  }
  const gifts = await calculateGiftsForOrder({
    items: input.items.map(item => ({ ...item, price: products.find(p => p.id === item.productId)!.price, hasPromoPrice: false })),
    hasPromoCode: Boolean(input.promoCodeId), brandId,
  })
  const giftProducts = gifts.length ? await prisma.product.findMany({
    where: { id: { in: gifts.map(g => g.giftProductId) } },
    select: { id: true, price: true, weight: true, length: true, width: true, height: true },
  }) : []
  if (gifts.some(g => !giftProducts.some(p => p.id === g.giftProductId))) throw new OzonCheckoutError('Подарок недоступен для доставки')
  return resolveOzonParcelLines([
    ...products.map(p => ({ id: p.id, quantity: quantities.get(p.id)!, price: p.price, weight: p.weight, length: p.length, width: p.width, height: p.height })),
    ...gifts.map(g => ({ ...giftProducts.find(p => p.id === g.giftProductId)!, id: `gift:${g.giftProductId}:${g.giftPromotionId}`, quantity: g.quantity })),
  ], brandId)
}

export async function quoteOzonDelivery(input: OzonQuoteInput, brandId: BrandId) {
  const config = await getOzonDeliveryConfig(brandId)
  const client = await getOzonDeliveryClient(brandId)
  if (!config || !client) throw new OzonCheckoutError('Доставка Ozon пока не подключена', 503)
  const phone = normalizeOzonPhone(input.phone)
  const point = await prisma.ozonDeliveryPointCache.findUnique({
    where: { brand_pointId: { brand: brandId, pointId: String(input.deliveryPointId) } },
  })
  if (!point || point.syncedAt.getTime() < Date.now() - 48 * 60 * 60 * 1000) {
    throw new OzonCheckoutError('Пункт выдачи недоступен. Выберите другой пункт.')
  }
  const lines = await getParcelLines(input, brandId)
  const dimensions = buildOzonParcel(lines)
  const declaredValue = lines.reduce((sum, line) => sum + Math.round(line.price * 100) * line.quantity, 0)
  if (!Number.isSafeInteger(declaredValue) || declaredValue <= 0) throw new OzonCheckoutError('Некорректная объявленная стоимость заказа')
  const availability = await client.checkClient(phone)
  if (!availability.can_be_delivered) throw new OzonCheckoutError('Ozon не может доставить заказ по указанному телефону. Выберите другой способ доставки.')
  const hours = config.handlingHours
  if (!Number.isFinite(hours) || hours < 1 || hours > 168) throw new OzonCheckoutError('Неверная настройка срока отгрузки Ozon', 503)
  const posting: OzonCheckoutPosting = {
    request_id: 1, shipment_method_id: config.shipmentMethodId,
    cutoff_at: new Date(Date.now() + hours * 3600000).toISOString(),
    declared_value: { amount: (declaredValue / 100).toFixed(2), currency_code: 'RUB' }, dimensions,
  }
  const response = await client.checkout({ recipient: { phone_number: phone }, delivery: { delivery_point: { delivery_point_id: input.deliveryPointId } }, postings: [posting] })
  const result = response.results.find(r => r.request_id === 1)
  if (!result?.posting || result.error) throw new OzonCheckoutError('Ozon не может доставить заказ в выбранный ПВЗ. Выберите другой пункт.')
  const cost = ozonMoneyToKopecks(result.posting.estimated_delivery_cost) + ozonMoneyToKopecks(result.posting.estimated_insurance_cost)
  if (!Number.isSafeInteger(cost)) throw new OzonCheckoutError('Ozon вернул некорректную стоимость доставки', 502)
  const cutoff = Date.parse(result.posting.cutoff_at)
  if (!Number.isFinite(cutoff) || cutoff <= Date.now()) throw new OzonCheckoutError('Ozon вернул недоступный срок отгрузки', 502)
  const quote = await prisma.ozonDeliveryQuote.create({ data: {
    brand: brandId, phoneHash: ozonPhoneHash(phone), cartFingerprint: ozonCartFingerprint(lines, input.promoCodeId),
    pointId: point.pointId, pointName: point.name, pointAddress: point.address,
    deliverySum: cost / 100, estimatedDeliveryDays: result.posting.estimated_delivery_days,
    posting: JSON.parse(JSON.stringify({ ...posting, cutoff_at: result.posting.cutoff_at })),
    expiresAt: new Date(Math.min(Date.now() + 15 * 60000, cutoff)),
  } })
  return { quoteToken: quote.id, deliverySum: quote.deliverySum, estimatedDeliveryDays: quote.estimatedDeliveryDays,
    expiresAt: quote.expiresAt.toISOString(), point: { id: input.deliveryPointId, name: point.name, address: point.address } }
}

/** Never accepts a price or address supplied by the browser. */
export async function validateOzonQuote(token: string, input: OzonQuoteInput, brandId: BrandId) {
  const config = await getOzonDeliveryConfig(brandId)
  if (!config) throw new OzonCheckoutError('Доставка Ozon пока не подключена', 503)
  const quote = await prisma.ozonDeliveryQuote.findUnique({ where: { id: token }, include: { shipment: { select: { id: true } } } })
  if (!quote || quote.brand !== brandId || quote.expiresAt.getTime() <= Date.now() || quote.shipment
    || quote.pointId !== String(input.deliveryPointId) || quote.phoneHash !== ozonPhoneHash(normalizeOzonPhone(input.phone))) {
    throw new OzonCheckoutError('Расчёт доставки Ozon устарел. Рассчитайте доставку ещё раз.')
  }
  const lines = await getParcelLines(input, brandId)
  if (quote.cartFingerprint !== ozonCartFingerprint(lines, input.promoCodeId)) throw new OzonCheckoutError('Корзина изменилась. Рассчитайте доставку Ozon ещё раз.')
  const posting = quote.posting as unknown as OzonCheckoutPosting
  if (posting.shipment_method_id !== config.shipmentMethodId) throw new OzonCheckoutError('Условия доставки изменились. Рассчитайте доставку ещё раз.')
  return quote
}
