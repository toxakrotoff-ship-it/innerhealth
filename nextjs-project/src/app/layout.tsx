import './globals.css'
import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'

const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
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
    <html lang="ru" className={montserrat.variable}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased text-gray-900">
        {children}
      </body>
    </html>
  )
}