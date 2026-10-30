import { NextResponse } from 'next/server'
import { readCdekPvzManifest } from '@/lib/cdek-pvz-publication'

export const dynamic = 'force-dynamic'

/** Always requested from origin: a completed nightly publication is visible immediately. */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' }
  try {
    return NextResponse.json(await readCdekPvzManifest(), { headers })
  } catch {
    return NextResponse.json({ error: 'PVZ publication unavailable' }, { status: 503, headers })
  }
}
