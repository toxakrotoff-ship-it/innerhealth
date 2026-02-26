import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface RequireUserSessionOptions {
  requiresVerifiedEmail?: boolean
}

export async function requireUserSession(
  options?: RequireUserSessionOptions
): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'USER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isEmailVerified = Boolean((session.user as { isEmailVerified?: boolean }).isEmailVerified)
  if (options?.requiresVerifiedEmail && !isEmailVerified) {
    return NextResponse.json({ error: 'Email verification required' }, { status: 403 })
  }

  return session
}
