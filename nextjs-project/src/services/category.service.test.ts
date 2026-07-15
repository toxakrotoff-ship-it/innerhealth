import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const categoryFindManyMock = vi.fn()
const categoryFindUniqueMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findMany: (...args: unknown[]) => categoryFindManyMock(...args),
      findUnique: (...args: unknown[]) => categoryFindUniqueMock(...args),
    },
    productCategory: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('category.service public queries', () => {
  beforeEach(() => {
    categoryFindManyMock.mockReset()
    categoryFindUniqueMock.mockReset()
  })

  it('loads catalog block categories only for the current brand with stable order', async () => {
    categoryFindManyMock.mockResolvedValue([])

    const categoryService = await import('@/services/category.service')
    await categoryService.getCatalogBlockCategories('inner')

    expect(categoryFindManyMock).toHaveBeenCalledTimes(1)
    expect(categoryFindManyMock.mock.calls[0]?.[0]).toMatchObject({
      where: {
        brand: 'inner',
        isPublished: true,
        showInCategoriesBlock: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    })
  })

  it('loads category page data in brand scope and constrains products query to inner vitrine', async () => {
    categoryFindUniqueMock.mockResolvedValue({
      id: 'cat-1',
      brand: 'inner',
      title: 'Категория',
      pageTitle: 'Категория H1',
      slug: 'category',
      catalogTeaser: 'teaser',
      linePageBodyRichJson: null,
      showLegacyLinePageBlocks: false,
      seoTitle: null,
      seoDescription: null,
      seoKeywords: null,
      image: null,
      imageAlt: null,
      isPublished: true,
      featuredProductId: null,
      children: [],
      products: [
        {
          sortOrder: 0,
          product: {
            id: 'p-1',
            parentUid: null,
            title: 'Inner',
            brand: 'inner',
            sku: null,
            weight: null,
            price: 1,
            priceOld: null,
            quantity: 1,
            photo: null,
            slug: 'inner',
            isPromoEligible: true,
            discountPrice: null,
            isPreorderEnabled: false,
            photos: null,
          },
        },
        {
          sortOrder: 1,
          product: {
            id: 'p-2',
            parentUid: null,
            title: 'Sprint',
            brand: 'sprint-power',
            sku: null,
            weight: null,
            price: 1,
            priceOld: null,
            quantity: 1,
            photo: null,
            slug: 'sprint',
            isPromoEligible: true,
            discountPrice: null,
            isPreorderEnabled: false,
            photos: null,
          },
        },
      ],
    })

    const categoryService = await import('@/services/category.service')
    const result = await categoryService.getPublicCategoryBySlug('category', 'inner')

    expect(categoryFindUniqueMock).toHaveBeenCalledTimes(1)
    expect(categoryFindUniqueMock.mock.calls[0]?.[0]).toMatchObject({
      where: { brand_slug: { brand: 'inner', slug: 'category' } },
      select: {
        products: {
          where: {
            product: {
              isDraft: false,
              OR: [{ brand: null }, { brand: { not: 'sprint-power' } }],
            },
          },
        },
      },
    })
    expect(result?.products).toHaveLength(2)
  })

  it('loads published category tree with stable order', async () => {
    categoryFindManyMock.mockResolvedValue([])

    const categoryService = await import('@/services/category.service')
    await categoryService.getPublishedCategoryTree('inner')

    expect(categoryFindManyMock).toHaveBeenCalledTimes(1)
    expect(categoryFindManyMock.mock.calls[0]?.[0]).toMatchObject({
      where: { brand: 'inner', isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    })
  })
})
