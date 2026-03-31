import { NextResponse } from 'next/server'
import { z } from 'zod'
import { syncCdekTrackNumberIfDue } from '@/lib/cdek'
import { accountOrderParamsSchema } from '@/lib/validations/account'
import { requireUserSession } from '@/lib/auth/require-user-session'
import {
  ACCOUNT_SERVICE_ERROR_CODES,
  type AccountServiceError,
  getUserOrderById,
} from '@/services/account.service'

function isAccountServiceError(error: unknown): error is AccountServiceError {
  if (!error || typeof error !== 'object') return false
  return 'code' in error
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireUserSession({ requiresVerifiedEmail: true })
  if (session instanceof NextResponse) return session

  let parsedParams: z.infer<typeof accountOrderParamsSchema>
  try {
    parsedParams = accountOrderParamsSchema.parse(await params)
  } catch (error) {
    const message =
      error instanceof z.ZodError ? error.issues.map((issue) => issue.message).join('; ') : 'Invalid params'
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
    await syncCdekTrackNumberIfDue(parsedParams.id)
    const order = await getUserOrderById(session.user.id as string, parsedParams.id)
    return NextResponse.json(order, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (isAccountServiceError(error) && error.code === ACCOUNT_SERVICE_ERROR_CODES.orderNotFound) {
      return NextResponse.json(
        { error: 'Order not found' },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }
    console.error('[account/orders/:id] Failed to fetch order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}
