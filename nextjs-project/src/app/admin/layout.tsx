import '../globals.css'
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import AdminLayoutClient from './components/AdminLayoutClient'
import { cookies, headers } from 'next/headers'
import { resolveAdminBrand, ACTIVE_BRAND_COOKIE_NAME, ADMIN_BRAND_COOKIE_NAME } from '@/lib/brand/brand-context'

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
  const headersStore = await headers()
  const cookiesStore = await cookies()
  const activeBrand = resolveAdminBrand({
    forwardedBrand: headersStore.get('x-brand'),
    adminBrandCookie: cookiesStore.get(ADMIN_BRAND_COOKIE_NAME)?.value ?? null,
    activeBrandCookie: cookiesStore.get(ACTIVE_BRAND_COOKIE_NAME)?.value ?? null,
    host: headersStore.get('x-forwarded-host') || headersStore.get('host'),
  })

  return (
    <AdminLayoutClient session={session} adminBasePath={adminBasePath} activeBrand={activeBrand}>
      {children}
    </AdminLayoutClient>
  )
}
