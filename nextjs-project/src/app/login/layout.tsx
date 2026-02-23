import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Вход — Inner Health',
  description: 'Вход в аккаунт Inner Health',
  robots: { index: false, follow: false },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
