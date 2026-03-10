import { CartPageContent } from '@/components/site/cart-page-content'
import { CartReturnMessage } from '@/components/site/cart-return-message'
import { RecentlyViewedProducts } from '@/components/site/recently-viewed-products'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { Heading1 } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'

interface CartPageProps {
  searchParams: Promise<{ payment?: string }>
}

/** Payment return from YooKassa is read from searchParams on the server and passed to CartReturnMessage (RSC). */
export default async function CartPage({ searchParams }: CartPageProps) {
  const { payment } = await searchParams
  return (
    <AdaptiveContainer maxWidth="default" className="py-10">
      <Heading1 className="mb-6">Корзина</Heading1>
      <CartReturnMessage payment={payment} />
      <ScalableSpacing size="lg" />
      <CartPageContent />
      <ScalableSpacing size="lg" />
      <RecentlyViewedProducts title="Вы недавно смотрели" />
    </AdaptiveContainer>
  )
}
