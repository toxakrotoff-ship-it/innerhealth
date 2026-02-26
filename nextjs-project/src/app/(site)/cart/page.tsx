import { CartPageContent } from '@/components/site/cart-page-content'
import { CartReturnMessage } from '@/components/site/cart-return-message'
import { RecentlyViewedProducts } from '@/components/site/recently-viewed-products'

interface CartPageProps {
  searchParams: Promise<{ payment?: string }>
}

/** Payment return from YooKassa is read from searchParams on the server and passed to CartReturnMessage (RSC). */
export default async function CartPage({ searchParams }: CartPageProps) {
  const { payment } = await searchParams
  return (
    <div className="max-w-[min(90rem,92vw)] mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-text mb-6">Корзина</h1>
      <CartReturnMessage payment={payment} />
      <CartPageContent />
      <RecentlyViewedProducts title="Вы недавно смотрели" />
    </div>
  )
}
