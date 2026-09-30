import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import { cartActivityActions } from '@/lib/cart-activity'
import { CheckoutSessionNotFoundError, trackCheckoutCartActivity } from '@/lib/checkout-tracking'
import { resolveCheckoutOwnerFromRequest } from '@/lib/checkout-session-request'

const bodySchema = z.object({
  events: z.array(z.object({
    id: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
    action: z.enum(cartActivityActions),
    scope: z.enum(['cart', 'cdek-widget', 'cdek-api']),
    occurredAt: z.iso.datetime(),
    data: z.record(z.string(), z.unknown()).optional(),
  })).min(1).max(25),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (Number(request.headers.get('content-length')) > 16_384) {
    return NextResponse.json({ ok: false }, { status: 413 })
  }
  const rate = await checkRateLimit(getClientIdentifier(request), 'checkout-cart-activity', 90)
  if (!rate.success) {
    return NextResponse.json({ ok: false }, { status: 429, headers: { 'Cache-Control': 'no-store' } })
  }
  const { id } = await params
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })
    const owner = await resolveCheckoutOwnerFromRequest()
    await trackCheckoutCartActivity(id, owner, resolveBrandOrDefaultFromRequest(request), parsed.data.events)
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof CheckoutSessionNotFoundError) {
      return NextResponse.json({ ok: false }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('[checkout/cart-activity] Failed to store events:', error)
    return NextResponse.json({ ok: false }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
