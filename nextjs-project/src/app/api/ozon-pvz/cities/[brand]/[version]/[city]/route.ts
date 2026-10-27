import { NextResponse } from 'next/server'
import { OZON_PVZ_IMMUTABLE_CACHE_CONTROL, readOzonPvzSnapshot } from '@/lib/ozon-pvz-publication'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ brand: string; version: string; city: string }> }) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
  try {
    const { brand, version, city } = await context.params
    const snapshot = await readOzonPvzSnapshot(brand, version, city)
    if (snapshot === null) return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
    return new NextResponse(snapshot, { headers: {
      ...headers, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': OZON_PVZ_IMMUTABLE_CACHE_CONTROL,
      ETag: `"${version}"`,
    } })
  } catch { return NextResponse.json({ error: 'Ozon point snapshot unavailable' }, { status: 503, headers }) }
}
