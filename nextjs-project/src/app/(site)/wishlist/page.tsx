import type { Metadata } from 'next'
import Link from 'next/link'
import { WishlistPageContent } from '@/components/site/wishlist-page-content'

export const revalidate = 0

export const metadata: Metadata = {
  title: 'Избранное',
  robots: { index: false, follow: true },
}

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-[min(70rem,92vw)] px-4 py-6 sm:py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-semibold text-text">Избранное</h1>
        <Link
          href="/account"
          className="rounded-full border border-gray-300 bg-white px-4 py-2 min-h-[40px] inline-flex items-center justify-center text-sm font-medium text-text transition hover:border-action-blue"
        >
          Вернуться в профиль
        </Link>
      </div>
      <WishlistPageContent />
    </div>
  )
}
