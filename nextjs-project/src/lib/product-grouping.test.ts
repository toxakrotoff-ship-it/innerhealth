import { describe, expect, it } from 'vitest'
import { groupProductsForListing, type ProductVariantForListing } from '@/lib/product-grouping'

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
