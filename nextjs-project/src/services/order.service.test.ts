import { beforeEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@/services/gift-promotion.service', () => ({
  calculateGiftsForOrder: (...args: unknown[]) => calculateGiftsForOrderMock(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transactionMock(...args),
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
})
