import './globals.css'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Unbounded } from 'next/font/google'
import { Preloader } from '@/components/site/preloader'

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

export const metadata: Metadata = {
  title: 'Inner Health — Нутриенты и здоровое питание',
  description: 'Магазин нутриентов и продуктов для здоровья Inner Health',
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
            __html: 'html.preloader-skip .preloader-overlay{display:none!important}',
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var k='innerhealth-preloader-seen',v=sessionStorage.getItem(k),t=v?parseInt(v,10):0;if(t&&Date.now()-t<864e5){document.documentElement.dataset.preloaderSkip='1';document.documentElement.classList.add('preloader-skip');}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900">
        <Preloader />
        {children}
      </body>
    </html>
  )
}