import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ozonCartFingerprint } from '@/lib/ozon-delivery/parcel'
import type { OzonCreateOrderRequest } from '@/lib/ozon-delivery/types'

vi.mock('server-only', () => ({}))

const calculateGiftsForOrderMock = vi.fn()
const transactionMock = vi.fn()

const txProductFindManyMock = vi.fn()
const txProductUpdateManyMock = vi.fn()
const txProductUpdateMock = vi.fn()
const txOrderCreateMock = vi.fn()
const txOrderFindUniqueMock = vi.fn()
const txOrderUpdateMock = vi.fn()
const txShippingInfoCreateMock = vi.fn()
const txPromoCodeUpdateMock = vi.fn()
const txOzonQuoteFindFirstMock = vi.fn()
const txPackageSettingsMock = vi.fn()
const orderFindManyMock = vi.fn()
const rootOrderUpdateManyMock = vi.fn()
const rootOrderUpdateMock = vi.fn()

vi.mock('@/services/gift-promotion.service', () => ({
  calculateGiftsForOrder: (...args: unknown[]) => calculateGiftsForOrderMock(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transactionMock(...args),
    order: {
      findMany: (...args: unknown[]) => orderFindManyMock(...args),
      updateMany: (...args: unknown[]) => rootOrderUpdateManyMock(...args),
      update: (...args: unknown[]) => rootOrderUpdateMock(...args),
    },
  },
}))

describe('order.service stock reservation', () => {
  beforeEach(() => {
    calculateGiftsForOrderMock.mockReset()
    transactionMock.mockReset()
    txProductFindManyMock.mockReset()
    txProductUpdateManyMock.mockReset()
    txProductUpdateMock.mockReset()
    txOrderCreateMock.mockReset()
    txOrderFindUniqueMock.mockReset()
    txOrderUpdateMock.mockReset()
    txShippingInfoCreateMock.mockReset()
    txPromoCodeUpdateMock.mockReset()
    txOzonQuoteFindFirstMock.mockReset()
    txPackageSettingsMock.mockReset().mockResolvedValue([])

    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        product: {
          findMany: (...args: unknown[]) => txProductFindManyMock(...args),
          updateMany: (...args: unknown[]) => txProductUpdateManyMock(...args),
          update: (...args: unknown[]) => txProductUpdateMock(...args),
        },
        order: {
          create: (...args: unknown[]) => txOrderCreateMock(...args),
          findUnique: (...args: unknown[]) => txOrderFindUniqueMock(...args),
          update: (...args: unknown[]) => txOrderUpdateMock(...args),
        },
        shippingInfo: {
          create: (...args: unknown[]) => txShippingInfoCreateMock(...args),
        },
        ozonDeliveryQuote: {
          findFirst: (...args: unknown[]) => txOzonQuoteFindFirstMock(...args),
        },
        siteSetting: { findMany: (...args: unknown[]) => txPackageSettingsMock(...args) },
        promoCode: {
          update: (...args: unknown[]) => txPromoCodeUpdateMock(...args),
        },
      })
    )
  })

  it('reserves stock before creating the order', async () => {
    calculateGiftsForOrderMock.mockResolvedValue([])
    txProductFindManyMock.mockResolvedValue([
      {
        id: 'p-1',
        title: 'Коллаген',
        quantity: 5,
        isPreorderEnabled: false,
      },
    ])
    txProductUpdateManyMock.mockResolvedValue({ count: 1 })
    txOrderCreateMock.mockResolvedValue({
      id: 'order-1',
      items: [],
    })
    txShippingInfoCreateMock.mockResolvedValue({ id: 'ship-1' })

    const service = await import('@/services/order.service')
    await service.createOrderWithItemsAndShipping({
      total: 1000,
      deliverySum: 0,
      promoCodeId: null,
      promoDiscountAmount: null,
      userId: null,
      brandId: 'inner',
      items: [{ productId: 'p-1', quantity: 2, price: 1000 }],
      shipping: {
        fullName: 'Иван',
        phone: '+79990000000',
        email: 'ivan@example.com',
        address: 'ул. Пушкина, 1',
        city: 'Москва',
        zipCode: '101000',
        country: 'Россия',
      },
    })

    expect(txProductUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: 'p-1',
        quantity: { gte: 2 },
      },
      data: {
        quantity: { decrement: 2 },
      },
    })
    expect(txOrderCreateMock).toHaveBeenCalledTimes(1)
  })

  it('throws a stock conflict when finite stock is not enough', async () => {
    calculateGiftsForOrderMock.mockResolvedValue([])
    txProductFindManyMock.mockResolvedValue([
      {
        id: 'p-1',
        title: 'Коллаген',
        quantity: 1,
        isPreorderEnabled: false,
      },
    ])
    txProductUpdateManyMock.mockResolvedValue({ count: 0 })

    const service = await import('@/services/order.service')

    await expect(
      service.createOrderWithItemsAndShipping({
        total: 1000,
        deliverySum: 0,
        promoCodeId: null,
        promoDiscountAmount: null,
        userId: null,
        brandId: 'inner',
        items: [{ productId: 'p-1', quantity: 2, price: 1000 }],
        shipping: {
          fullName: 'Иван',
          phone: '+79990000000',
          email: 'ivan@example.com',
          address: 'ул. Пушкина, 1',
          city: 'Москва',
          zipCode: '101000',
          country: 'Россия',
        },
      })
    ).rejects.toMatchObject({
      name: 'OrderStockConflictError',
      productTitle: 'Коллаген',
    })

    expect(txOrderCreateMock).not.toHaveBeenCalled()
  })

  it('restores reserved stock when a pending order is canceled', async () => {
    txOrderFindUniqueMock.mockResolvedValue({
      status: 'pending',
      items: [
        {
          quantity: 2,
          product: {
            id: 'p-1',
            title: 'Коллаген',
            quantity: 3,
            isPreorderEnabled: false,
          },
        },
      ],
    })
    txProductUpdateMock.mockResolvedValue({ id: 'p-1' })
    txOrderUpdateMock.mockResolvedValue({ id: 'order-1', status: 'canceled' })

    const service = await import('@/services/order.service')
    const result = await service.cancelPendingOrderAndRestoreStock('order-1')

    expect(txProductUpdateMock).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: {
        quantity: { increment: 2 },
      },
    })
    expect(txOrderUpdateMock).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'canceled' },
    })
    expect(result).toEqual({
      found: true,
      changed: true,
      previousStatus: 'pending',
      status: 'canceled',
    })
  })
  describe('Ozon quote validation in the order transaction', () => {
    const product = {
      id: 'p-1', title: 'Коллаген', quantity: 5, isPreorderEnabled: false,
      price: 1000, weight: 200, length: 100, width: 80, height: 120,
    }
    const giftProduct = {
      id: 'gift-1', title: 'Подарок', quantity: 10, isPreorderEnabled: false,
      price: 200, weight: 50, length: 40, width: 30, height: 20,
    }
    // The quote contains parcel fields only; the transaction also loads stock/title columns.
    const quotedProductLine = {
      id: 'p-1', quantity: 1, price: 1000, weight: 200, length: 100, width: 80, height: 120,
    }
    const quotedGiftLine = {
      id: 'gift:gift-1:promotion-1', quantity: 1, price: 200, weight: 50, length: 40, width: 30, height: 20,
    }
    const gift = { giftProductId: 'gift-1', giftPromotionId: 'promotion-1', quantity: 1 }
    const request: OzonCreateOrderRequest = {
      order_external_id: 'external-order-1',
      recipient: { phone_number: '+79990000000', full_name: 'Иван' },
      delivery: { delivery_point: { delivery_point_id: 123 } },
      postings: [{
        request_id: 1, shipment_method_id: 10, cutoff_at: '2026-10-26T12:00:00Z',
        declared_value: { amount: '1000.00', currency_code: 'RUB' },
        dimensions: { weight_g: 200, length_mm: 100, width_mm: 80, height_mm: 120 },
        posting_external_id: 'external-posting-1', description: 'Заказ с сайта',
      }],
    }
    const params = {
      total: 1250, deliverySum: 250, promoCodeId: null, userId: null,
      brandId: 'inner' as const,
      items: [{ productId: 'p-1', quantity: 1, price: 1000 }],
      shipping: {
        fullName: 'Иван', phone: '+79990000000', email: 'ivan@example.com',
        address: 'Москва, Тверская, 10', city: 'Москва', zipCode: '', country: 'Россия',
        deliveryMethod: 'ozon_pvz', ozonDeliveryPointId: '123',
      },
      ozon: { quoteId: '123e4567-e89b-42d3-a456-426614174000', request },
    }

    beforeEach(() => {
      calculateGiftsForOrderMock.mockResolvedValue([])
      txProductFindManyMock.mockResolvedValue([product])
      txProductUpdateManyMock.mockResolvedValue({ count: 1 })
      txOrderCreateMock.mockResolvedValue({ id: 'order-1', items: [] })
      txShippingInfoCreateMock.mockResolvedValue({ id: 'shipping-1' })
      txOzonQuoteFindFirstMock.mockResolvedValue({
        id: params.ozon.quoteId,
        cartFingerprint: ozonCartFingerprint([quotedProductLine]),
      })
    })

    it('rejects an unavailable quote and restricts lookup to unexpired, unused quotes of the same brand', async () => {
      txOzonQuoteFindFirstMock.mockResolvedValue(null)
      const service = await import('@/services/order.service')
      const startedAt = Date.now()
      await expect(service.createOrderWithItemsAndShipping(params)).rejects.toThrow('Расчёт доставки Ozon устарел')
      expect(txOzonQuoteFindFirstMock).toHaveBeenCalledWith({
        where: { id: params.ozon.quoteId, brand: 'inner', expiresAt: { gt: expect.any(Date) }, shipment: null },
      })
      const lookup = txOzonQuoteFindFirstMock.mock.calls[0][0]
      expect(lookup.where.expiresAt.gt.getTime()).toBeGreaterThanOrEqual(startedAt)
      expect(calculateGiftsForOrderMock).not.toHaveBeenCalled()
      expect(txProductUpdateManyMock).not.toHaveBeenCalled()
      expect(txOrderCreateMock).not.toHaveBeenCalled()
      expect(txShippingInfoCreateMock).not.toHaveBeenCalled()
    })

    it.each([
      ['price', { price: 1100 }],
      ['weight', { weight: 250 }],
      ['dimensions', { height: 150 }],
    ] as const)('requires a new quote when current product %s changes', async (_name, changed) => {
      txProductFindManyMock.mockResolvedValue([{ ...product, ...changed }])
      const service = await import('@/services/order.service')
      await expect(service.createOrderWithItemsAndShipping(params)).rejects.toThrow('Корзина изменилась')
      expect(txProductUpdateManyMock).not.toHaveBeenCalled()
      expect(txOrderCreateMock).not.toHaveBeenCalled()
    })

    it('requires a new quote when the purchased quantity changes', async () => {
      const service = await import('@/services/order.service')
      await expect(service.createOrderWithItemsAndShipping({
        ...params, items: [{ ...params.items[0], quantity: 2 }],
      })).rejects.toThrow('Корзина изменилась')
      expect(txOrderCreateMock).not.toHaveBeenCalled()
    })

    it('resolves incomplete fields through the same transaction before matching a quote', async () => {
      txProductFindManyMock.mockResolvedValue([{ ...product, height: null }])
      txPackageSettingsMock.mockResolvedValue([{ key: 'inner:cdek_default_package_height_mm', value: '50' }])
      txOzonQuoteFindFirstMock.mockResolvedValue({ id: params.ozon.quoteId, cartFingerprint: ozonCartFingerprint([{ ...quotedProductLine, height: 50 }]) })
      const service = await import('@/services/order.service')
      const withFallback = { ...params, ozon: { ...params.ozon, request: { ...request,
        postings: request.postings.map(posting => ({ ...posting, dimensions: { ...posting.dimensions, height_mm: 50 } })),
      } } }
      await expect(service.createOrderWithItemsAndShipping(withFallback)).resolves.toMatchObject({ id: 'order-1' })
      expect(txPackageSettingsMock).toHaveBeenCalledOnce()
      expect(txPackageSettingsMock.mock.calls[0][0].where.key.in).toContain('inner:cdek_default_package_height_mm')
      txOrderCreateMock.mockClear()
      txPackageSettingsMock.mockResolvedValue([{ key: 'inner:cdek_default_package_height_mm', value: '60' }])
      await expect(service.createOrderWithItemsAndShipping(withFallback)).rejects.toThrow('Корзина изменилась')
      expect(txOrderCreateMock).not.toHaveBeenCalled()
    })

    it('rejects a gift added after the quote was calculated', async () => {
      calculateGiftsForOrderMock.mockResolvedValue([gift])
      txProductFindManyMock.mockResolvedValue([product, giftProduct])
      const service = await import('@/services/order.service')
      await expect(service.createOrderWithItemsAndShipping(params)).rejects.toThrow('Корзина изменилась')
      expect(txProductUpdateManyMock).not.toHaveBeenCalled()
      expect(txOrderCreateMock).not.toHaveBeenCalled()
    })

    it.each(['quantity', 'promotion', 'weight'] as const)('rejects a changed gift %s after the quote was calculated', async (changed) => {
      txOzonQuoteFindFirstMock.mockResolvedValue({
        id: params.ozon.quoteId,
        cartFingerprint: ozonCartFingerprint([
          quotedProductLine,
          quotedGiftLine,
        ]),
      })
      calculateGiftsForOrderMock.mockResolvedValue([{
        ...gift, quantity: changed === 'quantity' ? 2 : 1,
        giftPromotionId: changed === 'promotion' ? 'promotion-2' : gift.giftPromotionId,
      }])
      txProductFindManyMock.mockResolvedValue([product, {
        ...giftProduct, weight: changed === 'weight' ? 100 : giftProduct.weight,
      }])
      const service = await import('@/services/order.service')
      await expect(service.createOrderWithItemsAndShipping(params)).rejects.toThrow('Корзина изменилась')
      expect(txProductUpdateManyMock).not.toHaveBeenCalled()
      expect(txOrderCreateMock).not.toHaveBeenCalled()
    })

    it('uses authoritative product and gift data to match the quote, then persists the snapshot and Ozon shipping reference', async () => {
      calculateGiftsForOrderMock.mockResolvedValue([gift])
      txProductFindManyMock.mockResolvedValue([product, giftProduct])
      txOzonQuoteFindFirstMock.mockResolvedValue({
        id: params.ozon.quoteId,
        cartFingerprint: ozonCartFingerprint([
          quotedProductLine,
          quotedGiftLine,
        ]),
      })
      const service = await import('@/services/order.service')
      const result = await service.createOrderWithItemsAndShipping({
        ...params, items: [{ ...params.items[0], price: 1 }],
      })
      expect(result.id).toBe('order-1')
      expect(txProductUpdateManyMock).toHaveBeenCalledTimes(2)
      expect(txOrderCreateMock).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          deliverySum: 250,
          ozonShipment: { create: { quoteId: params.ozon.quoteId, request } },
          items: { create: expect.arrayContaining([
            expect.objectContaining({ productId: 'p-1', quantity: 1, isGift: false }),
            expect.objectContaining({ productId: 'gift-1', quantity: 1, price: 0, isGift: true, giftPromotionId: 'promotion-1' }),
          ]) },
        }),
      }))
      const persistedRequest = txOrderCreateMock.mock.calls[0][0].data.ozonShipment.create.request
      expect(persistedRequest).toEqual(request)
      expect(persistedRequest).not.toBe(request)
      expect(txShippingInfoCreateMock).toHaveBeenCalledWith({ data: expect.objectContaining({
        orderId: 'order-1', deliveryMethod: 'ozon_pvz', ozonDeliveryPointId: '123',
        address: params.shipping.address,
      }) })
    })
  })
})

describe('getPendingOrdersWithYookassaPayment brand filtering', () => {
  beforeEach(() => {
    orderFindManyMock.mockReset()
    orderFindManyMock.mockResolvedValue([])
  })

  it('does not restrict by brand when brandId is null (cron-poll scans all brands)', async () => {
    const service = await import('@/services/order.service')
    await service.getPendingOrdersWithYookassaPayment({
      since: new Date('2026-01-01'),
      take: 100,
      brandId: null,
    })

    expect(orderFindManyMock).toHaveBeenCalledTimes(1)
    const call = orderFindManyMock.mock.calls[0][0]
    expect(call.where).not.toHaveProperty('brand')
  })

  it('restricts to sprint-power when brandId is explicitly sprint-power', async () => {
    const service = await import('@/services/order.service')
    await service.getPendingOrdersWithYookassaPayment({
      since: new Date('2026-01-01'),
      take: 100,
      brandId: 'sprint-power',
    })

    const call = orderFindManyMock.mock.calls[0][0]
    expect(call.where.brand).toBe('sprint-power')
  })
})

describe('CDEK track polling persistence', () => {
  beforeEach(() => {
    orderFindManyMock.mockReset()
    rootOrderUpdateManyMock.mockReset()
    rootOrderUpdateMock.mockReset()
  })

  it('selects only paid CDEK shipments and prioritizes never-checked orders', async () => {
    orderFindManyMock.mockResolvedValue([])
    const service = await import('@/services/order.service')

    await service.getCdekTrackPollCandidates({
      since: new Date('2026-08-01T00:00:00Z'),
      take: 50,
    })

    expect(orderFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'paid',
        cdekOrderUuid: { not: null },
        shippingInfo: { deliveryMethod: { in: ['cdek_pvz', 'cdek_door'] } },
      }),
      orderBy: [
        { cdekTrackCheckedAt: { sort: 'asc', nulls: 'first' } },
        { createdAt: 'asc' },
      ],
      take: 50,
    }))
  })

  it('claims an email channel atomically with a recoverable stale lock', async () => {
    rootOrderUpdateManyMock.mockResolvedValue({ count: 1 })
    const service = await import('@/services/order.service')
    const now = new Date('2026-08-31T13:00:00Z')

    await expect(service.claimCdekTrackEmailChannel('order-1', 'customer', now)).resolves.toBe(true)

    expect(rootOrderUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
        cdekTrackCustomerEmailSentAt: null,
        OR: [
          { cdekTrackCustomerEmailAttemptedAt: null },
          { cdekTrackCustomerEmailAttemptedAt: { lt: new Date('2026-08-31T12:50:00Z') } },
        ],
      },
      data: { cdekTrackCustomerEmailAttemptedAt: now },
    })
  })
})
