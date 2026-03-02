import './globals.css'
import type { Metadata } from 'next'
import localFont from 'next/font/local'

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
    <html lang="ru" className={`${montserrat.variable} ${marckScript.variable}`}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900">
        {children}
      </body>
    </html>
  )
}