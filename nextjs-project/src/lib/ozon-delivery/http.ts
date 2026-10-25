import 'server-only'
import { NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { OzonCheckoutError } from './parcel'

export async function ozonRateLimit(request: Request) {
  const rate = await checkRateLimit(getClientIdentifier(request), 'ozon-delivery', 30)
  return rate.success ? null : NextResponse.json({ error: 'Слишком много запросов. Попробуйте позже.' }, {
    status: 429, headers: { 'Retry-After': String(rate.resetIn), 'Cache-Control': 'no-store' },
  })
}

export function ozonErrorResponse(error: unknown) {
  // Upstream bodies may contain recipient data; expose only our own validated messages.
  return NextResponse.json({ error: error instanceof OzonCheckoutError ? error.message : 'Доставка Ozon временно недоступна. Попробуйте позже.' }, {
    status: error instanceof OzonCheckoutError ? error.status : 502, headers: { 'Cache-Control': 'no-store' },
  })
}
