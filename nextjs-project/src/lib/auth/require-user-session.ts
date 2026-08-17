import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface RequireUserSessionOptions {
  requiresVerifiedEmail?: boolean
  allowedRoles?: readonly string[]
}

export async function requireUserSession(
  options?: RequireUserSessionOptions
): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowedRoles = options?.allowedRoles ?? ['USER']
  if (!allowedRoles.includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Email verification exists to confirm a buyer's contact details before checkout —
  // it's not meaningful for staff accounts (ADMIN/WRITER) that log in separately.
  const isStaffRole = session.user.role === 'ADMIN' || session.user.role === 'WRITER'
  const isEmailVerified = Boolean((session.user as { isEmailVerified?: boolean }).isEmailVerified)
  if (options?.requiresVerifiedEmail && !isStaffRole && !isEmailVerified) {
    return NextResponse.json({ error: 'Email verification required' }, { status: 403 })
  }

  return session
}
