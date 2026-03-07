import nextDynamic from 'next/dynamic'
import { SiteHeader } from '@/components/site/site-header'
import { SiteFooter } from '@/components/site/site-footer'
import { BackToTopButton } from '@/components/site/back-to-top-button'

const CartDrawer = nextDynamic(
  () => import('@/components/site/cart-drawer').then((m) => ({ default: m.CartDrawer }))
)

const CookieConsent = nextDynamic(
  () => import('@/components/site/cookie-consent').then((m) => ({ default: m.CookieConsent }))
)

/** Не пререндерим страницы при сборке — в Docker build нет доступа к БД (ECONNREFUSED). */
export const dynamic = 'force-dynamic'
export const revalidate = 60

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 antialiased">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <BackToTopButton />
      <CartDrawer />
      <CookieConsent />
    </div>
  )
}
