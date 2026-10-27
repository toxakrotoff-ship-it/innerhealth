import { createHash } from 'node:crypto'
import type { OzonDimensions } from './types'

export class OzonCheckoutError extends Error {
  constructor(message: string, public readonly status = 400) { super(message) }
}

export interface ParcelLine {
  id: string
  quantity: number
  price: number
  weight: number | null
  length: number | null
  width: number | null
  height: number | null
}

/** Stack units in one box; callers resolve authorised package defaults before packing. */
export function buildOzonParcel(lines: ParcelLine[]): OzonDimensions {
  if (!lines.length) throw new OzonCheckoutError('Корзина пуста')
  let weight = 0, length = 0, width = 0, height = 0
  for (const line of lines) {
    const values = [line.weight, line.length, line.width, line.height, line.quantity]
    if (values.some(value => value == null || !Number.isSafeInteger(value) || value <= 0)) {
      throw new OzonCheckoutError('Для товара не указаны вес или габариты. Выберите другой способ доставки.')
    }
    weight += line.weight! * line.quantity
    length = Math.max(length, line.length!)
    width = Math.max(width, line.width!)
    height += line.height! * line.quantity
  }
  // Limits are checked by Ozon for the selected point as well.
  if (weight > 125000 || Math.max(length, width, height) > 2500 || length * width * height > 500000000) {
    throw new OzonCheckoutError('Заказ превышает допустимые габариты Ozon. Выберите другой способ доставки.')
  }
  return { weight_g: weight, length_mm: length, width_mm: width, height_mm: height }
}

export function ozonCartFingerprint(lines: ParcelLine[], promoCodeId?: string | null): string {
  return createHash('sha256').update(JSON.stringify({
    promoCodeId: promoCodeId || null,
    lines: lines.map(({ id, quantity, price, weight, length, width, height }) => ({ id, quantity, price, weight, length, width, height })).sort((a, b) => a.id.localeCompare(b.id)),
  })).digest('hex')
}

export function ozonPhoneHash(phone: string): string {
  return createHash('sha256').update(phone).digest('hex')
}

export function ozonMoneyToKopecks(money: { amount: string; currency_code: string }): number {
  if (money.currency_code !== 'RUB' || !/^\d+(\.\d{1,2})?$/.test(money.amount)) {
    throw new OzonCheckoutError('Ozon вернул некорректную стоимость доставки', 502)
  }
  const [whole, fraction = ''] = money.amount.split('.')
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new OzonCheckoutError('Ozon вернул некорректную стоимость доставки', 502)
  }
  return result
}
