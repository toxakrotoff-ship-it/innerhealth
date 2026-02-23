import dynamic from 'next/dynamic'
import { SiteHeader } from '@/components/site/site-header'
import { SiteFooter } from '@/components/site/site-footer'

const CartDrawer = dynamic(
  () => import('@/components/site/cart-drawer').then((m) => ({ default: m.CartDrawer }))
)

const CookieConsent = dynamic(
  () => import('@/components/site/cookie-consent').then((m) => ({ default: m.CookieConsent }))
)

export const revalidate = 60

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-soft-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CartDrawer />
      <CookieConsent />
    </div>
  )
}
