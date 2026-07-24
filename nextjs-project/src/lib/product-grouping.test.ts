import { describe, expect, it } from 'vitest'
import {
  getProductListingTitlePresentation,
  groupProductsForListing,
  type ProductVariantForListing,
} from '@/lib/product-grouping'

function createProduct(input: Partial<ProductVariantForListing> & Pick<ProductVariantForListing, 'id' | 'title'>): ProductVariantForListing {
  return {
    id: input.id,
    parentUid: input.parentUid ?? null,
    title: input.title,
    brand: input.brand ?? null,
    sku: input.sku ?? null,
    price: input.price ?? 1000,
    priceOld: input.priceOld ?? null,
    quantity: input.quantity ?? 1,
    photo: input.photo ?? null,
    slug: input.slug ?? input.id,
    isPromoEligible: input.isPromoEligible ?? true,
    discountPrice: input.discountPrice ?? null,
    isPreorderEnabled: input.isPreorderEnabled ?? false,
  }
}

describe('getProductListingTitlePresentation', () => {
  it('hides trailing parentheses size from title when badge is shown', () => {
    expect(getProductListingTitlePresentation('Биойодин (90 капсул)')).toEqual({
      displayTitle: 'Биойодин',
      sizeLabel: '90 капсул',
    })
  })

  it('keeps full title when size badge comes only from weight field', () => {
    expect(getProductListingTitlePresentation('Костный бульон', 100)).toEqual({
      displayTitle: 'Костный бульон',
      sizeLabel: '100 г',
    })
  })

  it('prefers parentheses segment over weight for the badge', () => {
    expect(getProductListingTitlePresentation('Протеин (210 г)', 210)).toEqual({
      displayTitle: 'Протеин',
      sizeLabel: '210 г',
    })
  })
})

describe('groupProductsForListing', () => {
  it('preserves incoming order when grouped and single items are mixed', () => {
    const items: ProductVariantForListing[] = [
      createProduct({ id: 'single-1', title: 'Single 1' }),
      createProduct({ id: 'g1-v1', parentUid: 'g-1', title: 'Group 1 - Vanilla' }),
      createProduct({ id: 'single-2', title: 'Single 2' }),
      createProduct({ id: 'g2-v1', parentUid: 'g-2', title: 'Group 2 - Orange' }),
      createProduct({ id: 'g1-v2', parentUid: 'g-1', title: 'Group 1 - Chocolate' }),
      createProduct({ id: 'g2-v2', parentUid: 'g-2', title: 'Group 2 - Mango' }),
    ]

    const listing = groupProductsForListing(items)
    expect(listing.map((item) => (item.kind === 'single' ? item.product.id : item.parentUid))).toEqual([
      'single-1',
      'g-1',
      'single-2',
      'g-2',
    ])
  })
})
