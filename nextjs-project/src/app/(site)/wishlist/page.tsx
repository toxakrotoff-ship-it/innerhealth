import type { Metadata } from 'next'
import { WishlistPageContent } from '@/components/site/wishlist-page-content'

export const revalidate = 0

export const metadata: Metadata = {
  title: 'Избранное',
  robots: { index: false, follow: true },
}

export default function WishlistPage() {
  return <WishlistPageContent />
}
