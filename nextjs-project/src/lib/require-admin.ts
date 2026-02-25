import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Use in every Admin API route. Returns session if user is authenticated and has role ADMIN,
 * otherwise returns a 401 or 403 NextResponse to return to the client.
 */
export async function requireAdminSession(): Promise<Session | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return session
}
