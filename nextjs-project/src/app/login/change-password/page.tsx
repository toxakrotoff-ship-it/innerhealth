import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ChangePasswordForm from './ChangePasswordForm'

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/login')
  }
  if (!session.user.mustChangePassword) {
    redirect('/admin')
  }
  return <ChangePasswordForm />
}
