import type { Metadata } from 'next'
import { CartPageContent } from '@/components/site/cart-page-content'
import { CheckoutTrustStrip } from '@/components/site/checkout-trust-strip'
import { CartReturnMessage } from '@/components/site/cart-return-message'
import { RecentlyViewedProducts } from '@/components/site/recently-viewed-products'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { Heading1 } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'
import { getResolvedBlocksForPage } from '@/services/content-block.service'

interface CartPageProps {
  searchParams: Promise<{ payment?: string }>
}

export const metadata: Metadata = {
  title: 'Корзина',
  robots: { index: false, follow: true },
}

/** Payment return from YooKassa is read from searchParams on the server and passed to CartReturnMessage (RSC). */
export default async function CartPage({ searchParams }: CartPageProps) {
  const { brandId, siteTitle } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const { payment } = await searchParams
  const contactBlocks = await getResolvedBlocksForPage('contacts', brandId)
  const contactsAddress = contactBlocks.find((block) => block.key === 'contacts.address')?.text?.trim()
  const pickupAddress = contactsAddress || `г. Москва, набережная Новикова-Прибоя, 6 к4, 2-й этаж, офис ${siteTitle}`
  return (
    <section className={isSprintTheme ? 'bg-[#060A14] py-10' : ''}>
      <AdaptiveContainer maxWidth="default" className={isSprintTheme ? 'py-0 text-slate-100' : 'py-10'}>
      <Heading1 className={isSprintTheme ? 'mb-6 text-slate-100' : 'mb-6'}>Корзина</Heading1>
      <CheckoutTrustStrip isSprintTheme={isSprintTheme} />
      <CartReturnMessage payment={payment} />
      <ScalableSpacing size="lg" />
      <CartPageContent isSprintTheme={isSprintTheme} brandId={brandId} pickupAddress={pickupAddress} />
      <ScalableSpacing size="lg" />
      <RecentlyViewedProducts title="Вы недавно смотрели" />
    </AdaptiveContainer>
    </section>
  )
}
