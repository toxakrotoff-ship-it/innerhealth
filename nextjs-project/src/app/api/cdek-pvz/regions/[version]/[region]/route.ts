import { NextResponse } from 'next/server'
import { PVZ_IMMUTABLE_CACHE_CONTROL, readCdekPvzSnapshot } from '@/lib/cdek-pvz-publication'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ version: string; region: string }> }
) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
  try {
    const { version, region } = await context.params
    const snapshot = await readCdekPvzSnapshot(version, region)
    if (snapshot === null) return NextResponse.json({ error: 'Not found' }, { status: 404, headers })
    return new NextResponse(snapshot, {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Cache-Control': PVZ_IMMUTABLE_CACHE_CONTROL,
      },
    })
  } catch {
    return NextResponse.json({ error: 'PVZ snapshot unavailable' }, { status: 503, headers })
  }
}
