import { AddToCartButton } from '@/components/site/add-to-cart-button'
import { ProductTabs } from '@/components/site/product-tabs'
import { CompareToggleButton } from '@/components/site/compare-toggle-button'
import { RecentlyViewedTracker } from '@/components/site/recently-viewed-tracker'
import { RecentlyViewedProducts } from '@/components/site/recently-viewed-products'
import { ProductCard } from '@/components/site/product-card'
import { WishlistToggleButton } from '@/components/site/wishlist-toggle-button'
import { QuickOrderDialog } from '@/components/site/quick-order-dialog'
import { PurchaseTrustStrip } from '@/components/site/purchase-trust-strip'
import { ProductRelatedCategoryLinks } from '@/components/site/product-related-category-links'
import { ProductMediaGallery } from '@/components/site/product-media-gallery'
import { Breadcrumbs, type BreadcrumbItemType } from '@/components/site/breadcrumbs'
import { getFirstPhotoBlurDataURL } from '@/lib/product-photos'
import type { ProductGalleryPhoto } from '@/lib/product-gallery'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { Heading1, Heading2 } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { cn } from '@/lib/utils'

interface ProductPageContentProps {
  product: {
    id: string
    title: string
    brand: string | null
    description: string | null
    text: string | null
    price: number
    priceOld: number | null
    photo: string | null
    photos?: unknown
    quantity?: number | null
    isPreorderEnabled?: boolean
    slug: string | null
    isPromoEligible?: boolean
    discountPrice?: number | null
  }
  tabs: { title: string; content: string }[]
  photos: ProductGalleryPhoto[]
  /** When omitted, uses Главная → Каталог → title */
  breadcrumbItems?: BreadcrumbItemType[]
  /** Primary category title for contextual internal links */
  relatedProductsCategoryTitle?: string | null
  relatedProducts: Array<{
    id: string
    title: string
    brand: string | null
    price: number
    priceOld: number | null
    photo: string | null
    photos?: unknown
    slug: string | null
    isPromoEligible: boolean
    discountPrice: number | null
    quantity?: number | null
    isPreorderEnabled?: boolean
  }>
  isSprintTheme?: boolean
}

interface StockBadgeState {
  label: string
  className: string
}

function getStockBadge(quantity: number | null | undefined): StockBadgeState {
  if (quantity == null) return { label: 'В наличии', className: 'bg-green-100 text-green-700' }
  if (quantity <= 0) return { label: 'Товар временно закончился', className: 'bg-gray-100 text-gray-700' }
  if (quantity >= 10) return { label: 'В наличии', className: 'bg-green-100 text-green-700' }
  return { label: 'Заканчивается', className: 'bg-orange-100 text-orange-700' }
}

/** HTML snippet vs plain text — must not mix `dangerouslySetInnerHTML` with children on one node. */
function looksLikeHtmlMarkup(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text.trim())
}

function ProductDescriptionBlock({ description }: { description: string }) {
  const className =
    'mt-6 text-gray-600 prose prose-sm max-w-none [&_img]:max-w-full [&_ul]:list-disc [&_ol]:list-decimal'
  if (looksLikeHtmlMarkup(description)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: description }} />
  }
  return (
    <div className={className}>
      <p>{description}</p>
    </div>
  )
}

function ProductLongTextBlock({ text }: { text: string }) {
  const className =
    'prose prose-sm max-w-none text-gray-600 dark:text-gray-300 [&_img]:max-w-full [&_ul]:list-disc [&_ol]:list-decimal'
  if (looksLikeHtmlMarkup(text)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: text }} />
  }
  return (
    <div className={className}>
      <span className="whitespace-pre-line">{text}</span>
    </div>
  )
}

export function ProductPageContent({
  product,
  tabs,
  photos,
  relatedProducts,
  breadcrumbItems,
  relatedProductsCategoryTitle,
  isSprintTheme = false,
}: ProductPageContentProps) {
  const isOutOfStock = product.quantity != null && product.quantity <= 0
  const isPreorderEnabled = product.isPreorderEnabled === true
  const isUnavailable = isOutOfStock && !isPreorderEnabled
  const stock = isOutOfStock && isPreorderEnabled
    ? { label: 'Предзаказ', className: 'bg-amber-100 text-amber-700' }
    : getStockBadge(product.quantity)
  const crumbs: BreadcrumbItemType[] =
    breadcrumbItems ??
    [
      { label: 'Главная', href: '/' },
      { label: 'Каталог', href: '/catalog' },
      { label: product.title },
    ]

  return (
    <AdaptiveContainer
      maxWidth="default"
      className={`py-6 sm:py-10 ${isSprintTheme ? 'text-slate-100' : ''}`}
    >
      <Breadcrumbs items={crumbs} />
      <RecentlyViewedTracker productId={product.id} />
      <FluidGrid
        cols={1}
        colsTablet={1}
        colsDesktop={2}
        colsXl={2}
        cols2xl={2}
        cols3xl={2}
        cols4xl={2}
        cols5xl={2}
        cols6xl={2}
        gap={10}
        adaptiveGap={false}
        className="gap-10"
      >
        <ProductMediaGallery title={product.title} photos={photos} />
        <div>
          <Heading1 className={isSprintTheme ? 'text-slate-100' : undefined}>{product.title}</Heading1>
          {product.brand && (
            <p className={`mt-2 ${isSprintTheme ? 'text-slate-300' : 'text-gray-600'}`}>{product.brand}</p>
          )}
          <div className="mt-3">
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${stock.className}`}>
              {stock.label}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className={`text-2xl font-semibold ${isSprintTheme ? 'text-white' : 'text-text'}`}>
              {product.price.toLocaleString('ru-RU')} ₽
            </span>
            {product.priceOld != null && product.priceOld > product.price && (
              <span className={`text-lg line-through ${isSprintTheme ? 'text-slate-400' : 'text-gray-500'}`}>
                {product.priceOld.toLocaleString('ru-RU')} ₽
              </span>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <AddToCartButton
              productId={product.id}
              title={product.title}
              price={product.price}
              photo={product.photo}
              slug={product.slug}
              hasPromoPrice={product.priceOld != null && product.priceOld > product.price}
              isPromoEligible={product.isPromoEligible}
              discountPrice={product.discountPrice}
              disabled={isUnavailable}
              disabledLabel="Товар закончился"
              className={isSprintTheme ? 'bg-[#7AA2FF] text-slate-950 hover:bg-[#9AB8FF]' : undefined}
            />
            <WishlistToggleButton
              productId={product.id}
              className={cn(
                'min-h-[44px]',
                isSprintTheme &&
                  'border-slate-600 bg-slate-800 text-slate-100 hover:border-[#7AA2FF] hover:bg-slate-700 hover:text-[#9AB8FF]'
              )}
            />
            <QuickOrderDialog
              productId={product.id}
              productTitle={product.title}
              disabled={isUnavailable}
              isSprintTheme={isSprintTheme}
            />
          </div>
          <div className="mt-3">
            <CompareToggleButton productId={product.id} isSprintTheme={isSprintTheme} />
          </div>
          <PurchaseTrustStrip isSprintTheme={isSprintTheme} />
          {product.description && <ProductDescriptionBlock description={product.description} />}
        </div>
      </FluidGrid>

      {product.text && (
        <ScalableSpacing size="lg">
          <section
            className={`pt-8 ${isSprintTheme ? 'border-t border-slate-700' : 'border-t border-gray-200 dark:border-gray-700'}`}
          >
            <ProductLongTextBlock text={product.text} />
          </section>
        </ScalableSpacing>
      )}

      {tabs.length > 0 && (
        <ScalableSpacing size="lg">
          <ProductTabs tabs={tabs} />
        </ScalableSpacing>
      )}

      {relatedProducts.length > 0 && (
        <ScalableSpacing size="lg">
          <section className={tabs.length > 0 ? 'pt-6 sm:pt-8' : 'border-t border-gray-200 pt-6 sm:pt-8'}>
            <Heading2 className="mb-1">Из той же категории</Heading2>
            <p className={`mb-4 max-w-2xl text-sm ${isSprintTheme ? 'text-slate-300' : 'text-gray-600'}`}>
              Подборка похожих позиций из каталога — удобно сравнить состав и цену.
            </p>
            {relatedProductsCategoryTitle ? (
              <ProductRelatedCategoryLinks
                categoryTitle={relatedProductsCategoryTitle}
                items={relatedProducts}
              />
            ) : null}
            <FluidGrid
              className="mt-6"
              cols={2}
              colsTablet={3}
              colsDesktop={4}
              colsXl={4}
              cols2xl={4}
              cols3xl={4}
              cols4xl={4}
              cols5xl={4}
              cols6xl={4}
              gap={4}
              adaptiveGap
            >
              {relatedProducts.map((item) => (
                <ProductCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  price={item.price}
                  priceOld={item.priceOld}
                  photo={item.photo}
                  slug={item.slug}
                  isPromoEligible={item.isPromoEligible}
                  discountPrice={item.discountPrice}
                  quantity={item.quantity}
                  isPreorderEnabled={item.isPreorderEnabled}
                  blurDataURL={getFirstPhotoBlurDataURL(item.photos)}
                />
              ))}
            </FluidGrid>
          </section>
        </ScalableSpacing>
      )}

      <RecentlyViewedProducts excludeProductId={product.id} />
    </AdaptiveContainer>
  )
}
