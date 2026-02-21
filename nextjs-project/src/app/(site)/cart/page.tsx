import { CartPageContent } from '@/components/site/cart-page-content'
import { CartReturnMessage } from '@/components/site/cart-return-message'

export default function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-text mb-6">Корзина</h1>
      <CartReturnMessage searchParams={searchParams} />
      <CartPageContent />
    </div>
  )
}
