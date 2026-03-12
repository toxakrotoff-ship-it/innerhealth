import nextDynamic from 'next/dynamic'
import { getSettingsMap } from '@/services/settings.service'
import { buildOrganizationJsonLd } from '@/lib/schema-org'
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

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getSettingsMap()
  const organizationJsonLd = buildOrganizationJsonLd(settings)

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 antialiased">
      <SiteHeader />
      <main className="flex-1 pt-16 2xl:pt-18 3xl:pt-20 4xl:pt-24 5xl:pt-28 6xl:pt-32">
        {children}
      </main>
      <SiteFooter />
      <BackToTopButton />
      {organizationJsonLd && (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      )}
      <CartDrawer />
      <CookieConsent />
    </div>
  )
}
