import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const findManyMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}))

describe('getProductsForHomeInBrandScope', () => {
  beforeEach(() => {
    findManyMock.mockReset()
  })

  it('returns only featured new-arrival products without fallback fill', async () => {
    findManyMock.mockResolvedValue([
      { id: 'p-1', isFeaturedInNewArrivals: true },
      { id: 'p-2', isFeaturedInNewArrivals: true },
    ])

    const productService = await import('@/services/product.service')
    const result = await productService.getProductsForHomeInBrandScope(8, 'inner')

    expect(result).toEqual([
      { id: 'p-1', isFeaturedInNewArrivals: true },
      { id: 'p-2', isFeaturedInNewArrivals: true },
    ])
    expect(findManyMock).toHaveBeenCalledTimes(1)
    expect(findManyMock.mock.calls[0]?.[0]).toMatchObject({
      where: {
        isFeaturedInNewArrivals: true,
        isDraft: false,
      },
      take: 8,
    })
  })
})
