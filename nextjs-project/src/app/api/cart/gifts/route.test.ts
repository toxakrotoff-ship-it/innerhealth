import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const mocks = vi.hoisted(() => ({ products: vi.fn(), promotions: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ prisma: { giftPromotion: { findMany: mocks.promotions } } }))
vi.mock('@/services/product.service', () => ({ getProductsForCart: mocks.products }))
vi.mock('@/lib/brand/brand-request', () => ({ resolveBrandOrDefaultFromRequest: () => 'inner' }))

describe('cart gift calculation for sale products', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.products.mockResolvedValue([
      { id: 'sale', price: 1000, priceOld: 2000 },
      { id: 'regular', price: 1500, priceOld: null },
    ])
    mocks.promotions.mockResolvedValue([{
      id: 'promotion', title: 'Подарок от 2000', status: 'enabled',
      giftProductId: 'gift', triggerType: 'CART_TOTAL', minCartTotal: 2000,
      giftQuantityMode: 'ONE_PER_ORDER', priority: 0, promoProductInteractionMode: 'ALWAYS_ALLOW',
    }])
  })

  it.each([
    { regularQuantity: 0, expectedGifts: [] },
    { regularQuantity: 1, expectedGifts: [] },
    { regularQuantity: 2, expectedGifts: [{ giftProductId: 'gift', quantity: 1, giftPromotionId: 'promotion' }] },
  ])('counts only regular goods toward the threshold (quantity $regularQuantity)', async ({ regularQuantity, expectedGifts }) => {
    const response = await POST(new Request('http://localhost/api/cart/gifts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          // Browser-supplied prices cannot turn a sale product into an eligible one.
          { productId: 'sale', quantity: 3, price: 10000, priceOld: null, hasPromoPrice: false },
          { productId: 'regular', quantity: regularQuantity },
        ],
        hasPromoCode: false,
      }),
    }))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ gifts: expectedGifts })
    expect(mocks.products).toHaveBeenCalledWith(['sale', 'regular'], 'inner')
  })
})
