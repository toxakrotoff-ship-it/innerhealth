import { NextResponse } from 'next/server'
import { requireUserSession } from '@/lib/auth/require-user-session'
import * as accountService from '@/services/account.service'

export async function GET() {
  const session = await requireUserSession()
  if (session instanceof NextResponse) return session

  try {
    const dashboard = await accountService.getAccountDashboard(session.user.id as string)
    return NextResponse.json(dashboard, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[account/dashboard] Failed to fetch dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}
