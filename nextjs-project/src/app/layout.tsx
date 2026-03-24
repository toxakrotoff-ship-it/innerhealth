import './globals.css'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Unbounded } from 'next/font/google'
import { Preloader } from '@/components/site/preloader'
import { getSiteBaseUrl } from '@/lib/site-url'

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

const siteBaseUrl = getSiteBaseUrl()
const yandexVerification = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION?.trim()

export const metadata: Metadata = {
  metadataBase: new URL(siteBaseUrl),
  title: {
    default: 'Inner Health — нутриенты и здоровое питание',
    template: '%s | Inner Health',
  },
  description:
    'Интернет-магазин Inner Health: нутриенты, коллаген, БАДы и продукты для здоровья. Доставка по России.',
  applicationName: 'Inner Health',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: siteBaseUrl,
    siteName: 'Inner Health',
    title: 'Inner Health — нутриенты и здоровое питание',
    description:
      'Интернет-магазин Inner Health: нутриенты, коллаген, БАДы и продукты для здоровья. Доставка по России.',
    images: [
      {
        url: '/hero-portrait.png',
        alt: 'Inner Health',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inner Health — нутриенты и здоровое питание',
    description:
      'Интернет-магазин Inner Health: нутриенты, коллаген, БАДы и продукты для здоровья. Доставка по России.',
    images: ['/hero-portrait.png'],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="ru"
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
      </head>
      <body className="min-h-screen bg-gray-50 font-sans subpixel-antialiased text-gray-900">
        <Preloader />
        {children}
      </body>
    </html>
  )
}