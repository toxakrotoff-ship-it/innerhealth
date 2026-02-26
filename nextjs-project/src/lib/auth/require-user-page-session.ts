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

  if (session.user.role !== 'USER') {
    redirect('/')
  }

  if (options?.requiresVerifiedEmail && !session.user.isEmailVerified) {
    redirect('/account?verify=required')
  }

  return session
}
