import { NextResponse } from 'next/server'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { detectOzonCity } from '@/lib/ozon-delivery/city'

export async function GET(request: Request) {
  const rate = await checkRateLimit(getClientIdentifier(request), 'ozon-city', 15)
  if (!rate.success) return NextResponse.json({ city: null }, {
    status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(rate.resetIn) },
  })
  const city = await detectOzonCity(request, resolveBrandOrDefaultFromRequest(request))
  return NextResponse.json({ city }, { headers: { 'Cache-Control': 'no-store' } })
}
