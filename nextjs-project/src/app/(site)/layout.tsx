import nextDynamic from 'next/dynamic'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site/site-header'
import { SiteFooter } from '@/components/site/site-footer'
import { BackToTopButton } from '@/components/site/back-to-top-button'
import { CartOwnerSync } from '@/components/site/cart-owner-sync'
import { CartGiftSync } from '@/components/site/cart-gift-sync'
import { SiteLayoutJsonLd } from './site-layout-json-ld'
import { PageViewTracker } from '@/components/analytics/page-view-tracker'
import { VpnNoticeBanner } from '@/components/site/vpn-notice-banner'
import { getRedirectMap } from '@/services/redirect.service'
import { resolveSiteBrand } from '@/lib/brand/brand-context'
import { shouldShowVpnNotice } from '@/lib/request-country'

const CartDrawer = nextDynamic(
  () => import('@/components/site/cart-drawer').then((m) => ({ default: m.CartDrawer }))
)

const CookieConsent = nextDynamic(
  () => import('@/components/site/cookie-consent').then((m) => ({ default: m.CookieConsent }))
)

const ContactHelpWidget = nextDynamic(
  () => import('@/components/site/contact-help-widget').then((m) => ({ default: m.ContactHelpWidget }))
)

/** Не пререндерим страницы при сборке — в Docker build нет доступа к БД (ECONNREFUSED). */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers()
  const activeBrand = resolveSiteBrand({
    forwardedBrand: headerStore.get('x-brand'),
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })

  return {
    icons: {
      icon: [
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon.ico' },
        { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', type: 'image/png' }],
    },
    ...(activeBrand === 'sprint-power'
      ? {
          themeColor: '#060A14',
        }
      : {}),
  }
}

/**
 * Synchronous layout shell so the root <div> is always the first node in the HTML.
 * Async data (e.g. JSON-LD) is rendered by child components to avoid hydration mismatch.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headerStore = await headers()
  const activeBrand = resolveSiteBrand({
    forwardedBrand: headerStore.get('x-brand'),
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })
  const redirects = await getRedirectMap({ brandId: activeBrand })
  const hashRedirects = redirects.reduce<Record<string, string>>((acc, item) => {
    if (!item.sourcePath.startsWith('/#')) return acc
    acc[item.sourcePath] = item.destination
    return acc
  }, {})
  const hashRedirectsJson = JSON.stringify(hashRedirects).replace(/</g, '\\u003c')
  const showVpnNotice = await shouldShowVpnNotice()

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 antialiased">
      <script
        id="hash-redirect-data"
        type="application/json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: hashRedirectsJson }}
      />
      <script src="/scripts/hash-redirect-bootstrap.js" suppressHydrationWarning />
      <PageViewTracker />
      <CartOwnerSync />
      <CartGiftSync />
      {showVpnNotice ? <VpnNoticeBanner brandId={activeBrand} /> : null}
      <SiteHeader brandId={activeBrand} />
      <main className="flex-1 pt-[calc(4rem+env(safe-area-inset-top)+var(--vpn-notice-offset,0px))] 2xl:pt-[calc(4.5rem+env(safe-area-inset-top)+var(--vpn-notice-offset,0px))] 3xl:pt-[calc(5rem+env(safe-area-inset-top)+var(--vpn-notice-offset,0px))] 4xl:pt-[calc(6rem+env(safe-area-inset-top)+var(--vpn-notice-offset,0px))] 5xl:pt-[calc(7rem+env(safe-area-inset-top)+var(--vpn-notice-offset,0px))] 6xl:pt-[calc(8rem+env(safe-area-inset-top)+var(--vpn-notice-offset,0px))]">
        {children}
      </main>
      <SiteFooter brandId={activeBrand} />
      <BackToTopButton />
      <ContactHelpWidget brandId={activeBrand} />
      <SiteLayoutJsonLd />
      <CartDrawer />
      <CookieConsent brandId={activeBrand} />
    </div>
  )
}
