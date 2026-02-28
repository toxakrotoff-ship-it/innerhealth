import '../globals.css'
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import AdminLayoutClient from './components/AdminLayoutClient'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

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

  if (session.user.role !== 'ADMIN') {
    redirect('/')
  }

  const adminBasePath = process.env.ADMIN_SECRET_PATH || 'admin'

  return (
    <AdminLayoutClient session={session} adminBasePath={adminBasePath}>
      {children}
    </AdminLayoutClient>
  )
}
