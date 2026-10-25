import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { BRAND_IDS } from '@/lib/brand/brand'
import { syncOzonDeliveryPoints } from '@/lib/ozon-delivery/points-sync'

export const maxDuration = 600

export async function POST(request: Request) {
  const expected = process.env.OZON_POINTS_SYNC_TOKEN
  const actual = request.headers.get('x-cron-token')
  if (!expected) return NextResponse.json({ error: 'Cron is not configured' }, { status: 503 })
  if (!actual || Buffer.byteLength(actual) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const results = []
    for (const brand of BRAND_IDS) results.push(await syncOzonDeliveryPoints(brand))
    return NextResponse.json({ ok: true, results }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    console.error('[ozon-delivery] Point synchronization failed')
    return NextResponse.json({ error: 'Ozon point synchronization failed' }, { status: 502 })
  }
}
