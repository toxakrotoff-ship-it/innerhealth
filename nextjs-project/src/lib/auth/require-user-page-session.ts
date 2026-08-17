import 'server-only'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export interface RequireUserPageSessionOptions {
  requiresVerifiedEmail?: boolean
}

export async function requireUserPageSession(options?: RequireUserPageSessionOptions) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  const allowedRoles = ['USER', 'PARTNER', 'ADMIN', 'WRITER']
  if (!allowedRoles.includes(session.user.role ?? '')) {
    redirect('/')
  }

  // Email verification exists to confirm a buyer's contact details before checkout —
  // it's not meaningful for staff accounts (ADMIN/WRITER) that log in separately.
  const isStaffRole = session.user.role === 'ADMIN' || session.user.role === 'WRITER'
  if (options?.requiresVerifiedEmail && !isStaffRole && !session.user.isEmailVerified) {
    redirect('/account?verify=required')
  }

  return session
}
