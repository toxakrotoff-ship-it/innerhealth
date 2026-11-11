import { describe, expect, it, vi } from 'vitest'
import type { GiftPromotionForCalculation } from './gift-promotion.service'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    giftPromotion: {
      findMany: vi.fn(),
    },
  },
}))

describe('calculateGiftLinesFromPromotions', () => {
  const cartPromotion: GiftPromotionForCalculation = {
    id: 'cart-promo', title: 'Подарок от 2000', status: 'enabled',
    validFrom: null, validTo: null, giftProductId: 'gift',
    triggerType: 'CART_TOTAL', triggerProductId: null, triggerProductMinQty: null,
    minCartTotal: 2000, giftQuantityMode: 'ONE_PER_ORDER', maxGiftsPerOrder: null,
    exclusionGroup: null, priority: 0,
    promoProductInteractionMode: null, promoCodeInteractionMode: null,
  }

  it.each([null, 'ALWAYS_ALLOW'])('excludes half-price sale items from cart-total gifts even in %s mode', async (mode) => {
    const { calculateGiftLinesFromPromotions } = await import('./gift-promotion.service')
    expect(calculateGiftLinesFromPromotions({
      promotions: [{ ...cartPromotion, promoProductInteractionMode: mode }],
      items: [{ productId: 'sale', quantity: 2, price: 1000, priceOld: 2000, hasPromoPrice: true }],
      hasPromoCode: false,
    })).toEqual([])
  })

  it.each([
    { priceOld: 1999, expected: 1 },
    { priceOld: 2000, expected: 0 },
    { priceOld: 2500, expected: 0 },
    { priceOld: null, expected: 1 },
  ])('applies the half-price boundary using the original price $priceOld', async ({ priceOld, expected }) => {
    const { calculateGiftLinesFromPromotions } = await import('./gift-promotion.service')
    expect(calculateGiftLinesFromPromotions({
      promotions: [cartPromotion],
      items: [{ productId: 'product', quantity: 2, price: 1000, priceOld, hasPromoPrice: priceOld != null }],
      hasPromoCode: false,
    })).toHaveLength(expected)
  })

  it('counts only eligible goods toward gifts in a mixed cart', async () => {
    const { calculateGiftLinesFromPromotions } = await import('./gift-promotion.service')
    const calculate = (regularQuantity: number) => calculateGiftLinesFromPromotions({
      promotions: [cartPromotion],
      items: [
        { productId: 'sale', quantity: 3, price: 1000, priceOld: 2000, hasPromoPrice: true },
        { productId: 'regular', quantity: regularQuantity, price: 1500, priceOld: null, hasPromoPrice: false },
      ],
      hasPromoCode: false,
    })
    expect(calculate(1)).toEqual([])
    expect(calculate(2)).toEqual([{ giftProductId: 'gift', quantity: 1, giftPromotionId: 'cart-promo' }])
  })

  it.each(['ONE_PER_ORDER', 'PER_TRIGGER'])('excludes half-price sale items from product-trigger gifts in %s mode', async (giftQuantityMode) => {
    const { calculateGiftLinesFromPromotions } = await import('./gift-promotion.service')
    expect(calculateGiftLinesFromPromotions({
      promotions: [{ ...cartPromotion, triggerType: 'PRODUCT', triggerProductId: 'sale', triggerProductMinQty: 1, giftQuantityMode }],
      items: [{ productId: 'sale', quantity: 3, price: 1000, priceOld: 2000, hasPromoPrice: true }],
      hasPromoCode: false,
    })).toEqual([])
  })

  it('preserves the explicit block on all promo products in a mixed cart', async () => {
    const { calculateGiftLinesFromPromotions } = await import('./gift-promotion.service')
    expect(calculateGiftLinesFromPromotions({
      promotions: [{ ...cartPromotion, promoProductInteractionMode: 'BLOCK_IF_PROMO_PRODUCTS_PRESENT' }],
      items: [
        { productId: 'sale', quantity: 1, price: 1000, priceOld: 2000, hasPromoPrice: true },
        { productId: 'regular', quantity: 2, price: 1500, priceOld: null, hasPromoPrice: false },
      ],
      hasPromoCode: false,
    })).toEqual([])
  })

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
          priceOld: null,
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
          priceOld: null,
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
