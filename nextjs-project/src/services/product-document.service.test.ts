import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const productFindUniqueMock = vi.fn()
const productDocumentFindUniqueMock = vi.fn()
const productDocumentFindManyMock = vi.fn()
const productDocumentCreateMock = vi.fn()
const productDocumentUpdateMock = vi.fn()
const productDocumentDeleteMock = vi.fn()
const productDocumentProductFindManyMock = vi.fn()
const productDocumentProductFindUniqueMock = vi.fn()
const productDocumentProductCreateMock = vi.fn()
const productDocumentProductDeleteMock = vi.fn()
const transactionMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findUnique: (...args: unknown[]) => productFindUniqueMock(...args),
    },
    productDocument: {
      findUnique: (...args: unknown[]) => productDocumentFindUniqueMock(...args),
      findMany: (...args: unknown[]) => productDocumentFindManyMock(...args),
      create: (...args: unknown[]) => productDocumentCreateMock(...args),
      update: (...args: unknown[]) => productDocumentUpdateMock(...args),
      delete: (...args: unknown[]) => productDocumentDeleteMock(...args),
    },
    productDocumentProduct: {
      findMany: (...args: unknown[]) => productDocumentProductFindManyMock(...args),
      findUnique: (...args: unknown[]) => productDocumentProductFindUniqueMock(...args),
      create: (...args: unknown[]) => productDocumentProductCreateMock(...args),
      delete: (...args: unknown[]) => productDocumentProductDeleteMock(...args),
      update: vi.fn(),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}))

describe('product-document.service', () => {
  beforeEach(() => {
    productFindUniqueMock.mockReset()
    productDocumentFindUniqueMock.mockReset()
    productDocumentFindManyMock.mockReset()
    productDocumentCreateMock.mockReset()
    productDocumentUpdateMock.mockReset()
    productDocumentDeleteMock.mockReset()
    productDocumentProductFindManyMock.mockReset()
    productDocumentProductFindUniqueMock.mockReset()
    productDocumentProductCreateMock.mockReset()
    productDocumentProductDeleteMock.mockReset()
    transactionMock.mockReset()
  })

  it('returns published product documents sorted by relation sort, document sort, type and title', async () => {
    productFindUniqueMock.mockResolvedValue({
      id: 'p-1',
      slug: 'collagen',
      title: 'Коллаген',
      brand: null,
    })
    productDocumentProductFindManyMock.mockResolvedValue([
      {
        sortOrder: 1,
        document: {
          id: 'd-2',
          title: 'B документ',
          type: 'DECLARATION',
          fileUrl: '/uploads/documents/2.pdf',
          fileName: '2.pdf',
          mimeType: 'application/pdf',
          fileSize: 1024,
          documentNumber: null,
          issuedAt: null,
          expiresAt: null,
          sortOrder: 5,
        },
      },
      {
        sortOrder: 1,
        document: {
          id: 'd-1',
          title: 'A документ',
          type: 'CERTIFICATE',
          fileUrl: '/uploads/documents/1.pdf',
          fileName: '1.pdf',
          mimeType: 'application/pdf',
          fileSize: 2048,
          documentNumber: 'RU-1',
          issuedAt: new Date('2026-01-01T00:00:00.000Z'),
          expiresAt: null,
          sortOrder: 5,
        },
      },
    ])

    const service = await import('@/services/product-document.service')
    const result = await service.getPublishedProductDocuments({
      productId: 'p-1',
      brandId: 'inner',
    })

    expect(productDocumentProductFindManyMock).toHaveBeenCalledTimes(1)
    expect(productDocumentProductFindManyMock.mock.calls[0]?.[0]).toMatchObject({
      where: {
        productId: 'p-1',
        document: {
          brand: 'inner',
          isPublished: true,
        },
      },
    })
    expect(result.map((item) => item.id)).toEqual(['d-1', 'd-2'])
    expect(result[0]).toMatchObject({
      typeLabel: 'Сертификат',
      documentNumber: 'RU-1',
    })
  })

  it('rejects duplicate attachments for the same product', async () => {
    productFindUniqueMock.mockResolvedValue({
      id: 'p-1',
      slug: 'collagen',
      title: 'Коллаген',
      brand: null,
    })
    productDocumentFindUniqueMock.mockResolvedValue({
      id: 'd-1',
      brand: 'inner',
      title: 'Документ',
      fileUrl: '/uploads/documents/1.pdf',
      sortOrder: 0,
      isPublished: true,
      products: [],
    })
    productDocumentProductFindUniqueMock.mockResolvedValue({
      documentId: 'd-1',
      productId: 'p-1',
    })

    const service = await import('@/services/product-document.service')

    await expect(
      service.attachDocumentToProduct({
        documentId: 'd-1',
        productId: 'p-1',
        brandId: 'inner',
      })
    ).rejects.toMatchObject({
      message: 'Документ уже привязан к этому товару',
    })

    expect(productDocumentProductCreateMock).not.toHaveBeenCalled()
  })

  it('searches only inside the active brand scope and excludes already attached documents', async () => {
    productDocumentFindManyMock.mockResolvedValue([])

    const service = await import('@/services/product-document.service')
    await service.searchAdminProductDocuments({
      query: 'collagen',
      productId: 'p-1',
      brandId: 'inner',
      limit: 5,
    })

    expect(productDocumentFindManyMock).toHaveBeenCalledTimes(1)
    expect(productDocumentFindManyMock.mock.calls[0]?.[0]).toMatchObject({
      where: {
        brand: 'inner',
        NOT: {
          products: {
            some: { productId: 'p-1' },
          },
        },
      },
      take: 5,
    })
  })
})
