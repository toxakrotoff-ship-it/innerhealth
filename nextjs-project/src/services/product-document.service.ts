import 'server-only'

import { Prisma, type ProductDocumentType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { BrandId } from '@/lib/brand/brand'
import { resolveDbBrand } from '@/lib/brand/brand-db'
import { productBelongsToBrandScope, SPRINT_POWER_PRODUCT_BRAND } from '@/lib/brand/brand-scope'
import { deleteManagedUpload } from '@/lib/media-storage'
import {
  getProductDocumentTypeLabel,
  getProductDocumentTypeOrder,
} from '@/lib/product-documents'

export interface PublicProductDocument {
  id: string
  title: string
  type: ProductDocumentType
  typeLabel: string
  fileUrl: string
  fileName: string | null
  mimeType: string | null
  fileSize: number | null
  documentNumber: string | null
  issuedAt: string | null
  expiresAt: string | null
}

export interface AdminProductDocument {
  id: string
  title: string
  type: ProductDocumentType
  typeLabel: string
  fileUrl: string
  fileName: string | null
  originalName: string | null
  mimeType: string | null
  fileSize: number | null
  documentNumber: string | null
  issuedAt: string | null
  expiresAt: string | null
  sortOrder: number
  isPublished: boolean
  productSortOrder: number
  linkedProducts: Array<{
    id: string
    title: string
    slug: string | null
    brand: string | null
  }>
}

export interface ProductDocumentSuggestion {
  id: string
  title: string
  type: ProductDocumentType
  typeLabel: string
  fileName: string | null
  documentNumber: string | null
  isPublished: boolean
}

class ProductDocumentError extends Error {
  readonly status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ProductDocumentError'
    this.status = status
  }
}

function buildBrandScopedProductWhere(brandId?: BrandId | null): Prisma.ProductWhereInput {
  if (brandId === 'sprint-power') {
    return { brand: SPRINT_POWER_PRODUCT_BRAND }
  }

  return {
    OR: [{ brand: null }, { brand: { not: SPRINT_POWER_PRODUCT_BRAND } }],
  }
}

async function loadScopedProductOrThrow(productId: string, brandId?: BrandId | null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      slug: true,
      title: true,
      brand: true,
    },
  })

  if (!product) throw new ProductDocumentError('Товар не найден', 404)
  if (!productBelongsToBrandScope(product.brand, brandId)) {
    throw new ProductDocumentError('Товар вне выбранного brand scope', 404)
  }

  return product
}

async function loadDocumentOrThrow(documentId: string, brandId?: BrandId | null) {
  const document = await prisma.productDocument.findUnique({
    where: { id: documentId },
    include: {
      products: {
        select: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              brand: true,
            },
          },
        },
      },
    },
  })

  if (!document) throw new ProductDocumentError('Документ не найден', 404)
  if (document.brand !== resolveDbBrand(brandId)) {
    throw new ProductDocumentError('Документ вне выбранного brand scope', 404)
  }

  return document
}

function toIsoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

function toPublicDocument(
  row: Pick<
    Prisma.ProductDocumentGetPayload<Record<string, never>>,
    | 'id'
    | 'title'
    | 'type'
    | 'fileUrl'
    | 'fileName'
    | 'mimeType'
    | 'fileSize'
    | 'documentNumber'
    | 'issuedAt'
    | 'expiresAt'
  >
): PublicProductDocument {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    typeLabel: getProductDocumentTypeLabel(row.type),
    fileUrl: row.fileUrl,
    fileName: row.fileName ?? null,
    mimeType: row.mimeType ?? null,
    fileSize: row.fileSize ?? null,
    documentNumber: row.documentNumber ?? null,
    issuedAt: toIsoDate(row.issuedAt),
    expiresAt: toIsoDate(row.expiresAt),
  }
}

export async function getPublishedProductDocuments(params: {
  productId: string
  brandId?: BrandId | null
}): Promise<PublicProductDocument[]> {
  await loadScopedProductOrThrow(params.productId, params.brandId)

  const rows = await prisma.productDocumentProduct.findMany({
    where: {
      productId: params.productId,
      document: {
        brand: resolveDbBrand(params.brandId),
        isPublished: true,
      },
    },
    orderBy: [
      { sortOrder: 'asc' },
      { document: { sortOrder: 'asc' } },
      { document: { title: 'asc' } },
    ],
    select: {
      sortOrder: true,
      document: {
        select: {
          id: true,
          title: true,
          type: true,
          fileUrl: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          documentNumber: true,
          issuedAt: true,
          expiresAt: true,
          sortOrder: true,
        },
      },
    },
  })

  return rows
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      if (a.document.sortOrder !== b.document.sortOrder) {
        return a.document.sortOrder - b.document.sortOrder
      }
      const typeDiff =
        getProductDocumentTypeOrder(a.document.type) - getProductDocumentTypeOrder(b.document.type)
      if (typeDiff !== 0) return typeDiff
      return a.document.title.localeCompare(b.document.title, 'ru')
    })
    .map((row) => toPublicDocument(row.document))
}

export async function getAdminProductDocuments(params: {
  productId: string
  brandId?: BrandId | null
}): Promise<AdminProductDocument[]> {
  await loadScopedProductOrThrow(params.productId, params.brandId)

  const rows = await prisma.productDocumentProduct.findMany({
    where: {
      productId: params.productId,
      document: {
        brand: resolveDbBrand(params.brandId),
      },
    },
    orderBy: [
      { sortOrder: 'asc' },
      { document: { sortOrder: 'asc' } },
      { createdAt: 'asc' },
    ],
    select: {
      sortOrder: true,
      document: {
        include: {
          products: {
            where: {
              product: buildBrandScopedProductWhere(params.brandId),
            },
            select: {
              product: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  brand: true,
                },
              },
            },
          },
        },
      },
    },
  })

  return rows.map((row) => ({
    id: row.document.id,
    title: row.document.title,
    type: row.document.type,
    typeLabel: getProductDocumentTypeLabel(row.document.type),
    fileUrl: row.document.fileUrl,
    fileName: row.document.fileName ?? null,
    originalName: row.document.originalName ?? null,
    mimeType: row.document.mimeType ?? null,
    fileSize: row.document.fileSize ?? null,
    documentNumber: row.document.documentNumber ?? null,
    issuedAt: toIsoDate(row.document.issuedAt),
    expiresAt: toIsoDate(row.document.expiresAt),
    sortOrder: row.document.sortOrder,
    isPublished: row.document.isPublished,
    productSortOrder: row.sortOrder,
    linkedProducts: row.document.products.map((link) => link.product),
  }))
}

export async function searchAdminProductDocuments(params: {
  query: string
  brandId?: BrandId | null
  productId?: string | null
  limit?: number
}): Promise<ProductDocumentSuggestion[]> {
  const q = params.query.trim()
  if (!q) return []
  const take = Math.max(1, Math.min(params.limit ?? 8, 20))

  const rows = await prisma.productDocument.findMany({
    where: {
      brand: resolveDbBrand(params.brandId),
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { documentNumber: { contains: q, mode: 'insensitive' } },
        { fileName: { contains: q, mode: 'insensitive' } },
        { originalName: { contains: q, mode: 'insensitive' } },
      ],
      ...(params.productId
        ? {
            NOT: {
              products: {
                some: { productId: params.productId },
              },
            },
          }
        : {}),
    },
    orderBy: [{ updatedAt: 'desc' }],
    take,
    select: {
      id: true,
      title: true,
      type: true,
      fileName: true,
      documentNumber: true,
      isPublished: true,
    },
  })

  return rows.map((row) => ({
    ...row,
    typeLabel: getProductDocumentTypeLabel(row.type),
    fileName: row.fileName ?? null,
    documentNumber: row.documentNumber ?? null,
  }))
}

export async function createProductDocument(params: {
  brandId?: BrandId | null
  productId: string
  title: string
  type: ProductDocumentType
  fileUrl: string
  fileName?: string | null
  originalName?: string | null
  mimeType?: string | null
  fileSize?: number | null
  documentNumber?: string | null
  issuedAt?: string | null
  expiresAt?: string | null
  sortOrder?: number
  isPublished?: boolean
}): Promise<AdminProductDocument> {
  await loadScopedProductOrThrow(params.productId, params.brandId)

  const created = await prisma.productDocument.create({
    data: {
      brand: resolveDbBrand(params.brandId),
      title: params.title.trim(),
      type: params.type,
      fileUrl: params.fileUrl,
      fileName: params.fileName?.trim() || null,
      originalName: params.originalName?.trim() || null,
      mimeType: params.mimeType?.trim() || null,
      fileSize: params.fileSize ?? null,
      documentNumber: params.documentNumber?.trim() || null,
      issuedAt: params.issuedAt ? new Date(params.issuedAt) : null,
      expiresAt: params.expiresAt ? new Date(params.expiresAt) : null,
      sortOrder: params.sortOrder ?? 0,
      isPublished: params.isPublished ?? true,
      products: {
        create: {
          productId: params.productId,
          sortOrder: params.sortOrder ?? 0,
        },
      },
    },
  })

  const attached = await getAdminProductDocuments({
    productId: params.productId,
    brandId: params.brandId,
  })

  const result = attached.find((item) => item.id === created.id)
  if (!result) throw new ProductDocumentError('Не удалось загрузить созданный документ', 500)
  return result
}

export async function updateProductDocument(params: {
  brandId?: BrandId | null
  id: string
  title: string
  type: ProductDocumentType
  fileUrl?: string
  fileName?: string | null
  originalName?: string | null
  mimeType?: string | null
  fileSize?: number | null
  documentNumber?: string | null
  issuedAt?: string | null
  expiresAt?: string | null
  sortOrder?: number
  isPublished?: boolean
}): Promise<{
  documentId: string
  affectedProductSlugs: string[]
}> {
  const existing = await loadDocumentOrThrow(params.id, params.brandId)

  const updated = await prisma.productDocument.update({
    where: { id: params.id },
    data: {
      title: params.title.trim(),
      type: params.type,
      ...(params.fileUrl ? { fileUrl: params.fileUrl } : {}),
      ...(params.fileName !== undefined ? { fileName: params.fileName?.trim() || null } : {}),
      ...(params.originalName !== undefined
        ? { originalName: params.originalName?.trim() || null }
        : {}),
      ...(params.mimeType !== undefined ? { mimeType: params.mimeType?.trim() || null } : {}),
      ...(params.fileSize !== undefined ? { fileSize: params.fileSize ?? null } : {}),
      documentNumber: params.documentNumber?.trim() || null,
      issuedAt: params.issuedAt ? new Date(params.issuedAt) : null,
      expiresAt: params.expiresAt ? new Date(params.expiresAt) : null,
      sortOrder: params.sortOrder ?? existing.sortOrder,
      isPublished: params.isPublished ?? existing.isPublished,
    },
  })

  return {
    documentId: updated.id,
    affectedProductSlugs: existing.products
      .map((link) => link.product.slug)
      .filter((slug): slug is string => Boolean(slug)),
  }
}

export async function attachDocumentToProduct(params: {
  brandId?: BrandId | null
  productId: string
  documentId: string
  sortOrder?: number
}): Promise<void> {
  await Promise.all([
    loadScopedProductOrThrow(params.productId, params.brandId),
    loadDocumentOrThrow(params.documentId, params.brandId),
  ])

  const existingLink = await prisma.productDocumentProduct.findUnique({
    where: {
      documentId_productId: {
        documentId: params.documentId,
        productId: params.productId,
      },
    },
  })

  if (existingLink) {
    throw new ProductDocumentError('Документ уже привязан к этому товару')
  }

  await prisma.productDocumentProduct.create({
    data: {
      documentId: params.documentId,
      productId: params.productId,
      sortOrder: params.sortOrder ?? 0,
    },
  })
}

export async function detachDocumentFromProduct(params: {
  brandId?: BrandId | null
  productId: string
  documentId: string
}): Promise<void> {
  await Promise.all([
    loadScopedProductOrThrow(params.productId, params.brandId),
    loadDocumentOrThrow(params.documentId, params.brandId),
  ])

  await prisma.productDocumentProduct.delete({
    where: {
      documentId_productId: {
        documentId: params.documentId,
        productId: params.productId,
      },
    },
  })
}

export async function reorderProductDocuments(params: {
  brandId?: BrandId | null
  productId: string
  items: Array<{ documentId: string; sortOrder: number }>
}): Promise<void> {
  await loadScopedProductOrThrow(params.productId, params.brandId)

  const documentIds = params.items.map((item) => item.documentId)
  const scopedLinks = await prisma.productDocumentProduct.findMany({
    where: {
      productId: params.productId,
      documentId: { in: documentIds },
      document: {
        brand: resolveDbBrand(params.brandId),
      },
    },
    select: { documentId: true },
  })

  if (scopedLinks.length !== params.items.length) {
    throw new ProductDocumentError('Не все документы найдены в текущем brand scope', 404)
  }

  await prisma.$transaction(
    params.items.map((item) =>
      prisma.productDocumentProduct.update({
        where: {
          documentId_productId: {
            documentId: item.documentId,
            productId: params.productId,
          },
        },
        data: { sortOrder: item.sortOrder },
      })
    )
  )
}

export async function deleteProductDocument(params: {
  brandId?: BrandId | null
  id: string
}): Promise<{ affectedProductSlugs: string[]; fileUrl: string | null }> {
  const document = await loadDocumentOrThrow(params.id, params.brandId)

  await prisma.productDocument.delete({
    where: { id: params.id },
  })

  return {
    affectedProductSlugs: document.products
      .map((link) => link.product.slug)
      .filter((slug): slug is string => Boolean(slug)),
    fileUrl: document.fileUrl || null,
  }
}

export async function removeDocumentFileIfManaged(fileUrl: string | null | undefined): Promise<void> {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) return
  await deleteManagedUpload(fileUrl)
}

export async function getDocumentProductSlugs(params: {
  documentId: string
  brandId?: BrandId | null
}): Promise<string[]> {
  const document = await loadDocumentOrThrow(params.documentId, params.brandId)
  return document.products
    .map((link) => link.product.slug)
    .filter((slug): slug is string => Boolean(slug))
}

export function isProductDocumentError(error: unknown): error is ProductDocumentError {
  return error instanceof ProductDocumentError
}
