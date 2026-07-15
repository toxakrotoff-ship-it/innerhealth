import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const productFindUniqueMock = vi.fn()
const productFindManyMock = vi.fn()
const relationFindManyMock = vi.fn()
const relationCreateMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: (...args: unknown[]) => productFindUniqueMock(...args),
      findMany: (...args: unknown[]) => productFindManyMock(...args),
    },
    productRelation: {
      findMany: (...args: unknown[]) => relationFindManyMock(...args),
      create: (...args: unknown[]) => relationCreateMock(...args),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

describe('product-relation.service', () => {
  beforeEach(() => {
    productFindUniqueMock.mockReset()
    productFindManyMock.mockReset()
    relationFindManyMock.mockReset()
    relationCreateMock.mockReset()
  })

  it('loads published relation sections in brand scope and groups them by configured titles', async () => {
    relationFindManyMock.mockResolvedValue([
      {
        relationType: 'RELATED',
        sortOrder: 3,
        targetProduct: {
          id: 'p-2',
          parentUid: null,
          title: 'Второй товар',
          brand: null,
          sku: 'SKU-2',
          weight: null,
          price: 2500,
          priceOld: null,
          quantity: 4,
          photo: null,
          photos: null,
          slug: 'second-product',
          isPromoEligible: true,
          discountPrice: null,
          isPreorderEnabled: false,
        },
      },
      {
        relationType: 'RECOMMENDED',
        sortOrder: 1,
        targetProduct: {
          id: 'p-3',
          parentUid: null,
          title: 'Третий товар',
          brand: null,
          sku: 'SKU-3',
          weight: null,
          price: 3100,
          priceOld: 3500,
          quantity: 6,
          photo: null,
          photos: null,
          slug: 'third-product',
          isPromoEligible: true,
          discountPrice: null,
          isPreorderEnabled: false,
        },
      },
    ])

    const service = await import('@/services/product-relation.service')
    const result = await service.getPublishedProductRelations({
      sourceProductId: 'p-1',
      brandId: 'inner',
    })

    expect(relationFindManyMock).toHaveBeenCalledTimes(1)
    expect(relationFindManyMock.mock.calls[0]?.[0]).toMatchObject({
      where: {
        sourceProductId: 'p-1',
        brand: 'inner',
        isPublished: true,
        targetProduct: {
          isDraft: false,
          slug: { not: null },
        },
      },
    })
    expect(result.map((section) => section.title)).toEqual([
      'Рекомендуем также',
      'Похожие товары',
    ])
    expect(result[0]?.items[0]).toMatchObject({
      id: 'p-3',
      slug: 'third-product',
    })
  })

  it('rejects self-relations before touching the database', async () => {
    const service = await import('@/services/product-relation.service')

    await expect(
      service.createProductRelation({
        sourceProductId: 'same-id',
        targetProductId: 'same-id',
        relationType: 'RELATED',
        brandId: 'inner',
      })
    ).rejects.toMatchObject({
      message: 'Товар не может быть связан сам с собой',
    })

    expect(productFindUniqueMock).not.toHaveBeenCalled()
    expect(relationCreateMock).not.toHaveBeenCalled()
  })

  it('suggests relation targets by title, slug or sku inside the active brand scope', async () => {
    productFindManyMock.mockResolvedValue([])

    const service = await import('@/services/product-relation.service')
    await service.suggestProductRelationTargets({
      query: 'collagen',
      sourceProductId: 'p-1',
      brandId: 'inner',
      limit: 5,
    })

    expect(productFindManyMock).toHaveBeenCalledTimes(1)
    expect(productFindManyMock.mock.calls[0]?.[0]).toMatchObject({
      where: {
        isDraft: false,
        id: { not: 'p-1' },
        OR: [
          { title: { contains: 'collagen', mode: 'insensitive' } },
          { slug: { contains: 'collagen', mode: 'insensitive' } },
          { sku: { contains: 'collagen', mode: 'insensitive' } },
        ],
      },
      take: 5,
    })
  })
})
