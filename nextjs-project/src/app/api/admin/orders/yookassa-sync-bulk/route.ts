import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/require-admin'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'
import { syncPendingOrdersBatch } from '@/lib/yookassa-sync-service'

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(60).default(7),
  take: z.coerce.number().int().min(1).max(200).default(50),
})

export async function POST(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    days: url.searchParams.get('days') ?? undefined,
    take: url.searchParams.get('take') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid query' },
      { status: 400 }
    )
  }

  const { days, take } = parsed.data
  const brandId = resolveAdminBrandFromRequest(request)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const result = await syncPendingOrdersBatch({
    since,
    take,
    brandId,
    source: 'admin-sync',
    honorThrottle: false,
  })

  return NextResponse.json({
    ok: true,
    days,
    take,
    scanned: result.scanned,
    skippedByThrottle: result.skippedByThrottle,
    updated: result.updated,
    updatedToPaid: result.updatedToPaid,
    updatedToCanceled: result.updatedToCanceled,
    errors: result.errors,
    items: result.items,
  })
}
