import 'server-only'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CHECKOUT_GUEST_COOKIE_NAME, type CheckoutOwnerContext } from '@/lib/checkout-tracking'

/** Владелец текущего запроса: гостевая cookie или залогиненный пользователь. Общий для всех PATCH-роутов checkout-session. */
export async function resolveCheckoutOwnerFromRequest(): Promise<CheckoutOwnerContext> {
  const [cookieStore, session] = await Promise.all([cookies(), getServerSession(authOptions)])
  return {
    guestToken: cookieStore.get(CHECKOUT_GUEST_COOKIE_NAME)?.value ?? null,
    userId: session?.user?.id ?? null,
  }
}
