import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    giftPromotion: {
      findMany: vi.fn(),
    },
  },
}))

describe('calculateGiftLinesFromPromotions', () => {
  it('keeps only the highest-priority promotion inside one exclusion group', async () => {
    const giftPromotionService = await import('@/services/gift-promotion.service')

    const result = giftPromotionService.calculateGiftLinesFromPromotions({
      promotions: [
        {
          id: 'promo-3000',
          title: 'Подарок от 3000',
          status: 'enabled',
          validFrom: null,
          validTo: null,
          giftProductId: 'gift-a',
          triggerType: 'CART_TOTAL',
          triggerProductId: null,
          triggerProductMinQty: null,
          minCartTotal: 3000,
          giftQuantityMode: 'ONE_PER_ORDER',
          maxGiftsPerOrder: null,
          exclusionGroup: 'cart-total-gifts',
          priority: 10,
          promoProductInteractionMode: null,
          promoCodeInteractionMode: null,
        },
        {
          id: 'promo-5000',
          title: 'Подарок от 5000',
          status: 'enabled',
          validFrom: null,
          validTo: null,
          giftProductId: 'gift-b',
          triggerType: 'CART_TOTAL',
          triggerProductId: null,
          triggerProductMinQty: null,
          minCartTotal: 5000,
          giftQuantityMode: 'ONE_PER_ORDER',
          maxGiftsPerOrder: null,
          exclusionGroup: 'cart-total-gifts',
          priority: 20,
          promoProductInteractionMode: null,
          promoCodeInteractionMode: null,
        },
      ],
      items: [
        {
          productId: 'product-1',
          quantity: 1,
          price: 6000,
          hasPromoPrice: false,
        },
      ],
      hasPromoCode: false,
    })

    expect(result).toEqual([
      {
        giftProductId: 'gift-b',
        quantity: 1,
        giftPromotionId: 'promo-5000',
      },
    ])
  })

  it('keeps stackable promotions without an exclusion group', async () => {
    const giftPromotionService = await import('@/services/gift-promotion.service')

    const result = giftPromotionService.calculateGiftLinesFromPromotions({
      promotions: [
        {
          id: 'promo-3000',
          title: 'Подарок от 3000',
          status: 'enabled',
          validFrom: null,
          validTo: null,
          giftProductId: 'gift-a',
          triggerType: 'CART_TOTAL',
          triggerProductId: null,
          triggerProductMinQty: null,
          minCartTotal: 3000,
          giftQuantityMode: 'ONE_PER_ORDER',
          maxGiftsPerOrder: null,
          exclusionGroup: null,
          priority: 0,
          promoProductInteractionMode: null,
          promoCodeInteractionMode: null,
        },
        {
          id: 'promo-product',
          title: 'Подарок за товар',
          status: 'enabled',
          validFrom: null,
          validTo: null,
          giftProductId: 'gift-b',
          triggerType: 'PRODUCT',
          triggerProductId: 'product-1',
          triggerProductMinQty: 1,
          minCartTotal: null,
          giftQuantityMode: 'ONE_PER_ORDER',
          maxGiftsPerOrder: null,
          exclusionGroup: null,
          priority: 0,
          promoProductInteractionMode: null,
          promoCodeInteractionMode: null,
        },
      ],
      items: [
        {
          productId: 'product-1',
          quantity: 1,
          price: 4000,
          hasPromoPrice: false,
        },
      ],
      hasPromoCode: false,
    })

    expect(result).toEqual([
      {
        giftProductId: 'gift-a',
        quantity: 1,
        giftPromotionId: 'promo-3000',
      },
      {
        giftProductId: 'gift-b',
        quantity: 1,
        giftPromotionId: 'promo-product',
      },
    ])
  })
})
