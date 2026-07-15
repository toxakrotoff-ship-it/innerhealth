import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'
import { requireAdminSession } from '@/lib/require-admin'
import { revalidateStorefrontPaths } from '@/lib/site-revalidation'
import {
  attachProductDocumentSchema,
  createProductDocumentSchema,
  deleteProductDocumentSchema,
  detachProductDocumentSchema,
  reorderProductDocumentsSchema,
  updateProductDocumentSchema,
} from '@/lib/validations/product-document'
import {
  attachDocumentToProduct,
  createProductDocument,
  deleteProductDocument,
  detachDocumentFromProduct,
  getAdminProductDocuments,
  getDocumentProductSlugs,
  isProductDocumentError,
  removeDocumentFileIfManaged,
  reorderProductDocuments,
  updateProductDocument,
} from '@/services/product-document.service'
import * as productService from '@/services/product.service'

function revalidateProductSlugs(slugs: readonly string[]): void {
  revalidateStorefrontPaths(slugs.map((slug) => `/product/${slug}`))
}

async function revalidateProductId(productId: string, brandId: 'inner' | 'sprint-power'): Promise<void> {
  const product = await productService.findProductByIdInBrandScope(productId, brandId)
  if (product?.slug) revalidateProductSlugs([product.slug])
}

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)
  const productId = new URL(request.url).searchParams.get('productId')?.trim()

  if (!productId) {
    return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
  }

  try {
    const documents = await getAdminProductDocuments({ productId, brandId })
    return NextResponse.json(documents)
  } catch (error) {
    if (isProductDocumentError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('admin product-documents GET', error)
    return NextResponse.json({ error: 'Failed to load product documents' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)

  try {
    const payload = createProductDocumentSchema.parse(await request.json())
    const created = await createProductDocument({ ...payload, brandId })
    const slugs = created.linkedProducts
      .map((product) => product.slug)
      .filter((slug): slug is string => Boolean(slug))
    revalidateProductSlugs(slugs)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join('; ') },
        { status: 400 }
      )
    }
    if (isProductDocumentError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('admin product-documents POST', error)
    return NextResponse.json({ error: 'Failed to create product document' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)

  try {
    const payload = updateProductDocumentSchema.parse(await request.json())
    const result = await updateProductDocument({ ...payload, brandId })
    revalidateProductSlugs(result.affectedProductSlugs)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join('; ') },
        { status: 400 }
      )
    }
    if (isProductDocumentError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('admin product-documents PATCH', error)
    return NextResponse.json({ error: 'Failed to update product document' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)
  const url = new URL(request.url)
  const action = url.searchParams.get('action')?.trim()

  try {
    if (action === 'attach') {
      const payload = attachProductDocumentSchema.parse(await request.json())
      await attachDocumentToProduct({ ...payload, brandId })
      const slugs = await getDocumentProductSlugs({ documentId: payload.documentId, brandId })
      revalidateProductSlugs(slugs)
      return NextResponse.json({ ok: true })
    }

    const payload = reorderProductDocumentsSchema.parse(await request.json())
    await reorderProductDocuments({ ...payload, brandId })
    await revalidateProductId(payload.productId, brandId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join('; ') },
        { status: 400 }
      )
    }
    if (isProductDocumentError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('admin product-documents PUT', error)
    return NextResponse.json({ error: 'Failed to process product document action' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)
  const url = new URL(request.url)
  const action = url.searchParams.get('action')?.trim()

  try {
    if (action === 'detach') {
      const payload = detachProductDocumentSchema.parse(await request.json())
      const slugs = await getDocumentProductSlugs({ documentId: payload.documentId, brandId })
      await detachDocumentFromProduct({ ...payload, brandId })
      revalidateProductSlugs(slugs)
      return NextResponse.json({ ok: true })
    }

    const payload = deleteProductDocumentSchema.parse(await request.json())
    const result = await deleteProductDocument({ ...payload, brandId })
    await removeDocumentFileIfManaged(result.fileUrl)
    revalidateProductSlugs(result.affectedProductSlugs)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join('; ') },
        { status: 400 }
      )
    }
    if (isProductDocumentError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('admin product-documents DELETE', error)
    return NextResponse.json({ error: 'Failed to delete product document' }, { status: 500 })
  }
}
