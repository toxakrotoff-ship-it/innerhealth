import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { BRAND_IDS } from '@/lib/brand/brand'
import { syncOzonDeliveryPoints } from '@/lib/ozon-delivery/points-sync'
import { ozonAdminBrand, ozonAdminErrorResponse } from '@/lib/ozon-delivery/admin'

export const maxDuration = 600
export async function POST(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  try {
    const brand = ozonAdminBrand(request)
    const results = []
    for (const target of brand ? [brand] : BRAND_IDS) results.push(await syncOzonDeliveryPoints(target, { includeDisabled: true }))
    return NextResponse.json({ ok: true, results }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return ozonAdminErrorResponse(error) }
}
