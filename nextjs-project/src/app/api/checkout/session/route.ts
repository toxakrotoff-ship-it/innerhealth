import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit'
import {
  CHECKOUT_GUEST_COOKIE_MAX_AGE_SECONDS,
  CHECKOUT_GUEST_COOKIE_NAME,
  startCheckout,
} from '@/lib/checkout-tracking'

const CHECKOUT_SESSION_RATE_LIMIT = 30 // requests per minute per IP

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request)
  const rate = await checkRateLimit(clientId, 'checkout-session', CHECKOUT_SESSION_RATE_LIMIT)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429, headers: { 'Retry-After': String(rate.resetIn), 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const brand = resolveBrandOrDefaultFromRequest(request)
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id ?? null

    const cookieStore = await cookies()
    const existingGuestToken = cookieStore.get(CHECKOUT_GUEST_COOKIE_NAME)?.value ?? null

    const { session: checkoutSession, guestToken } = await startCheckout({
      brand,
      userId,
      guestToken: existingGuestToken,
    })

    const response = NextResponse.json(
      { sessionId: checkoutSession.id },
      { headers: { 'Cache-Control': 'no-store' } }
    )

    if (guestToken) {
      response.cookies.set(CHECKOUT_GUEST_COOKIE_NAME, guestToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: CHECKOUT_GUEST_COOKIE_MAX_AGE_SECONDS,
      })
    }

    return response
  } catch (error) {
    console.error('[checkout/session] Failed to start checkout:', error)
    return NextResponse.json(
      { error: 'Не удалось начать оформление' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
