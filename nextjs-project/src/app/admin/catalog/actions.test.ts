import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'

vi.mock('server-only', () => ({}))

const categoryFindUniqueMock = vi.fn()
const categoryUpdateMock = vi.fn()
const productCategoryFindFirstMock = vi.fn()
const revalidatePathMock = vi.fn()
const revalidateCategoryStorefrontMock = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
  })),
  headers: vi.fn(async () => ({
    get: vi.fn(() => null),
  })),
}))

vi.mock('@/lib/catalog-revalidation', () => ({
  revalidateCatalogForProduct: vi.fn(),
  revalidateCategoryStorefront: (...args: unknown[]) =>
    revalidateCategoryStorefrontMock(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findUnique: (...args: unknown[]) => categoryFindUniqueMock(...args),
      update: (...args: unknown[]) => categoryUpdateMock(...args),
      findMany: vi.fn(),
    },
    productCategory: {
      findFirst: (...args: unknown[]) => productCategoryFindFirstMock(...args),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

describe('admin catalog actions', () => {
  beforeEach(() => {
    categoryFindUniqueMock.mockReset()
    categoryUpdateMock.mockReset()
    productCategoryFindFirstMock.mockReset()
    revalidatePathMock.mockReset()
    revalidateCategoryStorefrontMock.mockReset()
  })

  it('clears teaser and rich text when editing an inner category', async () => {
    categoryFindUniqueMock
      .mockResolvedValueOnce({ brand: 'inner', slug: 'gribnaya-kollekciya' })
      .mockResolvedValueOnce(null)
    categoryUpdateMock.mockResolvedValue({ id: 'cat-1' })

    const { updateCategory } = await import('@/app/admin/catalog/actions')

    await updateCategory(
      'cat-1',
      {
        title: 'Грибная коллекция Inner Health',
        slug: 'gribnaya-kollekciya',
        catalogTeaser: null,
        linePageBodyRichJson: null,
        showLegacyLinePageBlocks: false,
      },
      { brandId: 'inner' }
    )

    expect(categoryUpdateMock).toHaveBeenCalledTimes(1)
    expect(categoryUpdateMock.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'cat-1' },
      data: {
        title: 'Грибная коллекция Inner Health',
        slug: 'gribnaya-kollekciya',
        catalogTeaser: null,
        showLegacyLinePageBlocks: false,
      },
    })
    expect(categoryUpdateMock.mock.calls[0]?.[0]?.data.linePageBodyRichJson).toBe(Prisma.DbNull)
  })
})
