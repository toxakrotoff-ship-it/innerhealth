import { NextResponse } from 'next/server'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'
import { requireAdminSession } from '@/lib/require-admin'
import { searchAdminProductDocuments } from '@/services/product-document.service'

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)
  const url = new URL(request.url)
  const query = url.searchParams.get('q')?.trim() ?? ''
  const productId = url.searchParams.get('productId')?.trim() ?? null
  const limit = Number.parseInt(url.searchParams.get('limit') ?? '8', 10)

  try {
    const documents = await searchAdminProductDocuments({
      query,
      productId,
      brandId,
      limit: Number.isFinite(limit) ? limit : 8,
    })
    return NextResponse.json(documents)
  } catch (error) {
    console.error('admin product-documents suggest', error)
    return NextResponse.json({ error: 'Failed to search product documents' }, { status: 500 })
  }
}
