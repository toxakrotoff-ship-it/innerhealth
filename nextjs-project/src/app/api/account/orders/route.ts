import { NextResponse } from 'next/server'
import { z } from 'zod'
import { syncCdekTrackNumbersForOrderIds } from '@/lib/cdek'
import { accountOrdersQuerySchema } from '@/lib/validations/account'
import { requireUserSession } from '@/lib/auth/require-user-session'
import * as accountService from '@/services/account.service'

export async function GET(request: Request) {
  const session = await requireUserSession({ requiresVerifiedEmail: true })
  if (session instanceof NextResponse) return session

  const searchParams = new URL(request.url).searchParams
  let query: z.infer<typeof accountOrdersQuerySchema>

  try {
    query = accountOrdersQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    })
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues.map((issue) => issue.message).join('; ') : 'Invalid query'
    return NextResponse.json(
      { error: message },
      {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }

  try {
    let orders = await accountService.getUserOrders(session.user.id as string, query)
    await syncCdekTrackNumbersForOrderIds(
      orders.items
        .filter((order) => order.cdekTrackNumber == null && order.shippingInfo?.deliveryMethod != null)
        .map((order) => order.id)
    )
    orders = await accountService.getUserOrders(session.user.id as string, query)
    return NextResponse.json(orders, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[account/orders] Failed to fetch orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}
