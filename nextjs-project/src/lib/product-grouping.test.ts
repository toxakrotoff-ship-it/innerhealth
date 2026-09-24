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
    weight: input.weight ?? null,
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

describe('size variants', () => {
  it('parses trailing ", 105 г" as size label', () => {
    expect(getProductListingTitlePresentation('Бульон говяжий натуральный концентрированный сухой, 105 г', 105)).toEqual({
      displayTitle: 'Бульон говяжий натуральный концентрированный сухой',
      sizeLabel: '105 г',
    })
  })

  it('keeps commas that are not a size suffix', () => {
    expect(getProductListingTitlePresentation('Бульон куриный, натуральный')).toEqual({
      displayTitle: 'Бульон куриный, натуральный',
      sizeLabel: null,
    })
  })

  it('groups packages into one card sorted by weight with size option kind', () => {
    const listing = groupProductsForListing([
      createProduct({ id: 'beef-210', parentUid: 'beef', title: 'Бульон говяжий сухой, 210 г', weight: 210 }),
      createProduct({ id: 'beef-105', parentUid: 'beef', title: 'Бульон говяжий сухой, 105 г', weight: 105 }),
      createProduct({ id: 'beef-1kg', parentUid: 'beef', title: 'Бульон говяжий сухой, 1 кг', weight: 1000 }),
    ])
    expect(listing).toHaveLength(1)
    const group = listing[0]
    expect(group?.kind).toBe('group')
    if (group?.kind !== 'group') return
    expect(group.optionKind).toBe('size')
    expect(group.baseTitle).toBe('Бульон говяжий сухой')
    expect(group.flavorOptions.map((option) => option.label)).toEqual(['105 г', '210 г', '1 кг'])
  })

  it('falls back to weight for label when title has no size suffix', () => {
    const listing = groupProductsForListing([
      createProduct({ id: 'a', parentUid: 'g', title: 'Бульон', weight: 210 }),
      createProduct({ id: 'b', parentUid: 'g', title: 'Бульон', weight: 105 }),
    ])
    const group = listing[0]
    if (group?.kind !== 'group') throw new Error('expected group')
    expect(group.optionKind).toBe('size')
    expect(group.flavorOptions.map((option) => option.label)).toEqual(['105 г', '210 г'])
  })

  it('keeps flavor kind for flavor groups', () => {
    const listing = groupProductsForListing([
      createProduct({ id: 'v', parentUid: 'g', title: 'Протеин - Ваниль' }),
      createProduct({ id: 'c', parentUid: 'g', title: 'Протеин - Шоколад' }),
    ])
    const group = listing[0]
    if (group?.kind !== 'group') throw new Error('expected group')
    expect(group.optionKind).toBe('flavor')
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
