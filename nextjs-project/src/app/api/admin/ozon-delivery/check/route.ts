import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { getOzonDeliveryClient } from '@/lib/ozon-delivery/client'
import { ozonAdminBrand, ozonAdminErrorResponse } from '@/lib/ozon-delivery/admin'

export async function POST(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  try {
    const client = await getOzonDeliveryClient(ozonAdminBrand(request), { includeDisabled: true })
    await client!.listDeliveryPoints()
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return ozonAdminErrorResponse(error) }
}
