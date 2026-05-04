import './globals.css'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Unbounded } from 'next/font/google'
import { IconoirProvider } from 'iconoir-react'
import { Preloader } from '@/components/site/preloader'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { headers } from 'next/headers'
import { unstable_noStore as noStore } from 'next/cache'
import { resolveBrandByHost } from '@/lib/brand/brand'

export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const montserrat = localFont({
  src: [
    { path: './fonts/montserrat-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/montserrat-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/montserrat-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: './fonts/montserrat-cyrillic-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/montserrat-cyrillic-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/montserrat-cyrillic-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-montserrat',
  display: 'swap',
})

const marckScript = localFont({
  src: [{ path: './fonts/MarckScript-Regular.ttf', weight: '400', style: 'normal' }],
  variable: '--font-marck-script',
  display: 'swap',
})

const unbounded = Unbounded({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-unbounded',
  display: 'swap',
})

const yandexVerification = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION?.trim()

function getBrandMetaCopy(brandId: 'inner' | 'sprint-power'): {
  defaultTitle: string
  description: string
} {
  if (brandId === 'sprint-power') {
    return {
      defaultTitle: 'Sprint Power — спортивное питание и нутриенты',
      description:
        'Интернет-магазин Sprint Power: спортивное питание, протеин, формулы для восстановления и активной формы. Доставка по России.',
    }
  }
  return {
    defaultTitle: 'Inner Health — нутриенты и здоровое питание',
    description:
      'Интернет-магазин Inner Health: нутриенты, коллаген, БАДы и продукты для здоровья. Доставка по России.',
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { brandId, siteTitle, siteUrl } = await getServerBrandContext()
  const metaCopy = getBrandMetaCopy(brandId)

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: metaCopy.defaultTitle,
      template: `%s | ${siteTitle}`,
    },
    description: metaCopy.description,
    applicationName: siteTitle,
    referrer: 'origin-when-cross-origin',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: 'website',
      locale: 'ru_RU',
      url: siteUrl,
      siteName: siteTitle,
      title: metaCopy.defaultTitle,
      description: metaCopy.description,
      images: [
        {
          url: brandId === 'sprint-power' ? '/sprint-power-mockup.png' : '/hero-portrait.png',
          alt: siteTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: metaCopy.defaultTitle,
      description: metaCopy.description,
      images: [brandId === 'sprint-power' ? '/sprint-power-mockup.png' : '/hero-portrait.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    category: 'health',
    ...(yandexVerification
      ? { verification: { yandex: yandexVerification } }
      : {}),
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  noStore()
  const { brandId } = await getServerBrandContext()
  const shouldShowPreloader = brandId !== 'sprint-power'
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host')
  const hostBrandId = resolveBrandByHost(host)
  const shouldRenderMetrika = hostBrandId === 'inner'

  const metrikaHeadScriptInner = `
(function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
})(window, document,'script','https://mc.yandex.ru/metrika/tag.js', 'ym');

ym(92621260, 'init', {webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
`.trim()

  const metrikaHeadNoscriptInner = `<div><img src="https://mc.yandex.ru/watch/92621260" style="position:absolute; left:-9999px;" alt="" /></div>`

  const metrikaBodyScriptInner = `
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

ym(92621260, "init", {
     clickmap:true,
     trackLinks:true,
     accurateTrackBounce:true,
     webvisor:true
});
`.trim()

  const metrikaBodyNoscriptInner = `<div><img src="https://mc.yandex.ru/watch/92621260" style="position:absolute; left:-9999px;" alt="" /></div>`

  const bodySurfaceClass =
    brandId === 'sprint-power'
      ? 'min-h-screen bg-slate-50 font-sans subpixel-antialiased text-slate-900'
      : 'min-h-screen bg-gray-50 font-sans subpixel-antialiased text-gray-900'

  return (
    <html
      lang="ru"
      data-brand={brandId}
      className={`${montserrat.variable} ${marckScript.variable} ${unbounded.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html:
              'html.preloader-skip .preloader-overlay,html[data-preloader-skip="1"] .preloader-overlay{display:none!important}',
          }}
        />
        {shouldRenderMetrika ? (
          <script
            type="text/javascript"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: metrikaHeadScriptInner }}
          />
        ) : null}
        {shouldRenderMetrika ? (
          <noscript
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: metrikaHeadNoscriptInner }}
          />
        ) : null}
      </head>
      <body className={bodySurfaceClass}>
        {shouldRenderMetrika ? (
          <>
            <script
              type="text/javascript"
              suppressHydrationWarning
              dangerouslySetInnerHTML={{ __html: metrikaBodyScriptInner }}
            />
            <noscript
              suppressHydrationWarning
              dangerouslySetInnerHTML={{ __html: metrikaBodyNoscriptInner }}
            />
          </>
        ) : null}
        <IconoirProvider
          iconProps={{
            color: 'currentColor',
            strokeWidth: 1.7,
            width: '1.25em',
            height: '1.25em',
          }}
        >
          {shouldShowPreloader ? <Preloader /> : null}
          {children}
        </IconoirProvider>
      </body>
    </html>
  )
}
