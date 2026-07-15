import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'
import { requireAdminSession } from '@/lib/require-admin'
import { revalidateStorefrontPaths } from '@/lib/site-revalidation'
import {
  createProductRelationSchema,
  deleteProductRelationSchema,
  reorderProductRelationsSchema,
  updateProductRelationSchema,
} from '@/lib/validations/product-relation'
import {
  createProductRelation,
  deleteProductRelation,
  getAdminProductRelations,
  getRelationSourceProductSlug,
  getSourceProductSlugById,
  isProductRelationError,
  reorderProductRelations,
  updateProductRelation,
} from '@/services/product-relation.service'

function revalidateProductPageBySlug(slug: string | null): void {
  if (!slug) return
  revalidateStorefrontPaths([`/product/${slug}`])
}

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)
  const sourceProductId = new URL(request.url).searchParams.get('sourceProductId')?.trim()

  if (!sourceProductId) {
    return NextResponse.json({ error: 'Source product is required' }, { status: 400 })
  }

  try {
    const relations = await getAdminProductRelations({ sourceProductId, brandId })
    return NextResponse.json(relations)
  } catch (error) {
    if (isProductRelationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('admin product-relations GET', error)
    return NextResponse.json({ error: 'Failed to load product relations' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)

  try {
    const payload = createProductRelationSchema.parse(await request.json())
    const created = await createProductRelation({ ...payload, brandId })
    const sourceSlug = await getSourceProductSlugById(payload.sourceProductId, brandId)
    revalidateProductPageBySlug(sourceSlug)
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join('; ') },
        { status: 400 }
      )
    }
    if (isProductRelationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('admin product-relations POST', error)
    return NextResponse.json({ error: 'Failed to create product relation' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)

  try {
    const payload = updateProductRelationSchema.parse(await request.json())
    const updated = await updateProductRelation({ ...payload, brandId })
    const sourceSlug = await getRelationSourceProductSlug(payload.id, brandId)
    revalidateProductPageBySlug(sourceSlug)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join('; ') },
        { status: 400 }
      )
    }
    if (isProductRelationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('admin product-relations PATCH', error)
    return NextResponse.json({ error: 'Failed to update product relation' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)

  try {
    const payload = reorderProductRelationsSchema.parse(await request.json())
    await reorderProductRelations({ ...payload, brandId })
    const sourceSlug = await getSourceProductSlugById(payload.sourceProductId, brandId)
    revalidateProductPageBySlug(sourceSlug)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join('; ') },
        { status: 400 }
      )
    }
    if (isProductRelationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('admin product-relations PUT', error)
    return NextResponse.json({ error: 'Failed to reorder product relations' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)

  try {
    const payload = deleteProductRelationSchema.parse(await request.json())
    const sourceSlug = await getRelationSourceProductSlug(payload.id, brandId)
    await deleteProductRelation({ ...payload, brandId })
    revalidateProductPageBySlug(sourceSlug)
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues.map((issue) => issue.message).join('; ') },
        { status: 400 }
      )
    }
    if (isProductRelationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('admin product-relations DELETE', error)
    return NextResponse.json({ error: 'Failed to delete product relation' }, { status: 500 })
  }
}
