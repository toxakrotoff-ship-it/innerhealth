import { Suspense } from 'react'
import { CartPageContent } from '@/components/site/cart-page-content'
import { CartReturnMessage } from '@/components/site/cart-return-message'

/** Cart page does not use searchParams in props to avoid dev tools enumerating the Promise (sync-dynamic-apis warning). Payment return is read client-side in CartReturnMessage via useSearchParams(). */
export default async function CartPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-text mb-6">Корзина</h1>
      <Suspense fallback={null}>
        <CartReturnMessage />
      </Suspense>
      <CartPageContent />
    </div>
  )
}
