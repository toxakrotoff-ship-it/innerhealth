import { describe, expect, it } from 'vitest'
import {
  detectCsvDelimiter,
  parseCsvLine,
  parseTildaLeadRow,
  resolveTildaLeadColumnIndexes,
} from '@/lib/tilda-leads-import'

describe('tilda leads import helpers', () => {
  it('parses semicolons inside quoted values', () => {
    const row = parseCsvLine('"a;b";"c";"d"')
    expect(row).toEqual(['a;b', 'c', 'd'])
  })

  it('detects comma-delimited csv lines and parses quoted commas', () => {
    expect(detectCsvDelimiter('a,b,c')).toBe(',')
    const row = parseCsvLine('"x,y",z,100')
    expect(row).toEqual(['x,y', 'z', '100'])
  })

  it('resolves dynamic order composition column by header name', () => {
    const header = [
      'Email',
      'Name',
      'Phone',
      'Date',
      'tranid',
      'Some Extra',
      'Состав заказа',
      'Input',
      'Input_2',
      'Комментарии',
      'Адрес_доставки',
      'Отзыв',
      'Доставка',
      'Другой столбец',
      'Промокод',
    ]

    const indexes = resolveTildaLeadColumnIndexes(header)
    expect(indexes.orderComposition).toBe(6)
    expect(indexes.input).toBe(7)
    expect(indexes.input2).toBe(8)
  })

  it('uses order composition as fallback when input is empty', () => {
    const header = ['Date', 'tranid', 'Состав заказа', 'Input']
    const indexes = resolveTildaLeadColumnIndexes(header)
    const row = ['2026-03-10 12:00:00', 'txn-1', '[{"title":"Коллаген","quantity":2,"price":900}]', '']

    const parsed = parseTildaLeadRow(row, indexes)
    expect(parsed.tranid).toBe('txn-1')
    expect(parsed.input).toBe('[{"title":"Коллаген","quantity":2,"price":900}]')
  })

  it('parses modern orders export fields into product and order meta', () => {
    const header = [
      'created',
      'phone',
      'email',
      'product',
      'amount',
      'prodamount',
      'tilda_orderid',
      'tilda_order_currency',
      'order_delivery_name',
      'order_delivery_address',
      'paymentid',
      'tilda_status',
      'promocode',
      'discount',
      'subtotal',
      'name',
    ]

    const row = [
      '2026-03-23 20:17:51',
      '+7 (987) 495-79-90',
      'fdaf@yandex.ru',
      'Траметес разноцветный - 1x1100 = 1100',
      '1520',
      '1100',
      '1853240521',
      'RUB',
      'Доставка СДЭК до пункта самовывоза = 420',
      'RU: Point...',
      'yakassa:xxx',
      'sent',
      'PROMO1',
      '0.000',
      '1100.0000',
      'Серов Герман Сергеевич',
    ]

    const indexes = resolveTildaLeadColumnIndexes(header)
    const parsed = parseTildaLeadRow(row, indexes)

    expect(parsed.input).toBe('Траметес разноцветный - 1x1100 = 1100')
    expect(parsed.promoCode).toBe('PROMO1')
    expect(parsed.delivery).toContain('Доставка СДЭК')
    expect(parsed.deliveryAddress).toContain('RU: Point')
    expect(parsed.input2).toContain('"amount":"1520"')
    expect(parsed.input2).toContain('"paymentStatus":"sent"')
    expect(parsed.tranid).toBe('1853240521')
  })
})
