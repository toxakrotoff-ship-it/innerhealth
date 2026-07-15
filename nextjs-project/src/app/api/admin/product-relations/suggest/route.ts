import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'
import { requireAdminSession } from '@/lib/require-admin'
import { suggestProductRelationTargets } from '@/services/product-relation.service'

const querySchema = z.object({
  q: z.string().trim().default(''),
  sourceProductId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
})

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)

  try {
    const params = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries())
    )
    const suggestions = await suggestProductRelationTargets({
      query: params.q,
      sourceProductId: params.sourceProductId,
      limit: params.limit,
      brandId,
    })

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('admin product-relations suggest', error)
    return NextResponse.json({ error: 'Failed to load suggestions' }, { status: 500 })
  }
}
