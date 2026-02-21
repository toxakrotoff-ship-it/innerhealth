import '../globals.css'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import AdminLayoutClient from './components/AdminLayoutClient'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.mustChangePassword) {
    redirect('/login/change-password')
  }

  return (
    <AdminLayoutClient session={session}>
      {children}
    </AdminLayoutClient>
  )
}
