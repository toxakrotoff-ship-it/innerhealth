import nextDynamic from 'next/dynamic'
import { cookies, headers } from 'next/headers'
import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site/site-header'
import { SiteFooter } from '@/components/site/site-footer'
import { BackToTopButton } from '@/components/site/back-to-top-button'
import { CartOwnerSync } from '@/components/site/cart-owner-sync'
import { CartGiftSync } from '@/components/site/cart-gift-sync'
import { SiteLayoutJsonLd } from './site-layout-json-ld'
import * as settingsService from '@/services/settings.service'
import { PageViewTracker } from '@/components/analytics/page-view-tracker'
import { getRedirectMap } from '@/services/redirect.service'
import { resolveSiteBrand, ACTIVE_BRAND_COOKIE_NAME } from '@/lib/brand/brand-context'

const CartDrawer = nextDynamic(
  () => import('@/components/site/cart-drawer').then((m) => ({ default: m.CartDrawer }))
)

const CookieConsent = nextDynamic(
  () => import('@/components/site/cookie-consent').then((m) => ({ default: m.CookieConsent }))
)

/** Не пререндерим страницы при сборке — в Docker build нет доступа к БД (ECONNREFUSED). */
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    icons: {
      icon: [
        {
          url: '/favicon-on-black.svg',
          type: 'image/svg+xml',
          media: '(prefers-color-scheme: light)',
        },
        {
          url: '/favicon-on-white.svg',
          type: 'image/svg+xml',
          media: '(prefers-color-scheme: dark)',
        },
        // Fallbacks for UAs that ignore media/type variants
        { url: '/icon.png', type: 'image/png' },
      ],
      apple: [{ url: '/apple-icon.png', type: 'image/png' }],
    },
  }
}

function createHashRedirectScript(hashRedirectsJson: string): string {
  return `
(() => {
  const redirectMap = ${hashRedirectsJson};
  const normalizedMap = new Map(Object.entries(redirectMap));
  function toSourcePath(hash) {
    const cleanHash = (hash || '').trim();
    if (!cleanHash || cleanHash === '#') return null;
    return cleanHash.startsWith('/') ? cleanHash : '/' + cleanHash;
  }
  function toTargetUrl(destination) {
    return destination.startsWith('http')
      ? destination
      : window.location.origin + (destination.startsWith('/') ? '' : '/') + destination;
  }
  function applyHashRedirect() {
    const sourcePath = toSourcePath(window.location.hash);
    if (!sourcePath) return;
    const destination = normalizedMap.get(sourcePath);
    if (!destination) return;
    const targetUrl = toTargetUrl(destination);
    if (targetUrl === window.location.href) return;
    window.location.replace(targetUrl);
  }
  applyHashRedirect();
  window.addEventListener('hashchange', applyHashRedirect);
})();
`.trim()
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
  const cookieStore = await cookies()
  const activeBrand = resolveSiteBrand({
    forwardedBrand: headerStore.get('x-brand'),
    activeBrandCookie: cookieStore.get(ACTIVE_BRAND_COOKIE_NAME)?.value ?? null,
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })
  const map = await settingsService.getSettingsMap(['yandexMetrikaBodyCode'], {
    brandId: activeBrand,
  })
  const bodyCode = map.yandexMetrikaBodyCode
  const redirects = await getRedirectMap({ brandId: activeBrand })
  const hashRedirects = redirects.reduce<Record<string, string>>((acc, item) => {
    if (!item.sourcePath.startsWith('/#')) return acc
    acc[item.sourcePath] = item.destination
    return acc
  }, {})
  const hashRedirectsJson = JSON.stringify(hashRedirects).replace(/</g, '\\u003c')
  const hashRedirectScript = createHashRedirectScript(hashRedirectsJson)

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 antialiased">
      <script
        id="hash-redirect-bootstrap"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: hashRedirectScript }}
      />
      <PageViewTracker />
      <CartOwnerSync />
      <CartGiftSync />
      {bodyCode ? (
        <div
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: bodyCode }}
        />
      ) : null}
      <SiteHeader brandId={activeBrand} />
      <main className="flex-1 pt-[calc(4rem+env(safe-area-inset-top))] 2xl:pt-[calc(4.5rem+env(safe-area-inset-top))] 3xl:pt-[calc(5rem+env(safe-area-inset-top))] 4xl:pt-[calc(6rem+env(safe-area-inset-top))] 5xl:pt-[calc(7rem+env(safe-area-inset-top))] 6xl:pt-[calc(8rem+env(safe-area-inset-top))]">
        {children}
      </main>
      <SiteFooter brandId={activeBrand} />
      <BackToTopButton />
      <SiteLayoutJsonLd />
      <CartDrawer />
      <CookieConsent />
    </div>
  )
}
