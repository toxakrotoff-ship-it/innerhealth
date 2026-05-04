import { AddToCartButton } from '@/components/site/add-to-cart-button'
import { ProductTabs } from '@/components/site/product-tabs'
import { CompareToggleButton } from '@/components/site/compare-toggle-button'
import { RecentlyViewedTracker } from '@/components/site/recently-viewed-tracker'
import { RecentlyViewedProducts } from '@/components/site/recently-viewed-products'
import { ProductCard } from '@/components/site/product-card'
import { GroupedProductCard } from '@/components/site/grouped-product-card'
import { WishlistToggleButton } from '@/components/site/wishlist-toggle-button'
import { QuickOrderDialog } from '@/components/site/quick-order-dialog'
import { PurchaseTrustStrip } from '@/components/site/purchase-trust-strip'
import { ProductRelatedCategoryLinks } from '@/components/site/product-related-category-links'
import { ProductMediaGallery } from '@/components/site/product-media-gallery'
import { ProductFlavorSelector } from '@/components/site/product-flavor-selector'
import { Breadcrumbs, type BreadcrumbItemType } from '@/components/site/breadcrumbs'
import { getFirstPhotoBlurDataURL } from '@/lib/product-photos'
import type { ProductGalleryPhoto } from '@/lib/product-gallery'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { Heading1, Heading2 } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { cn } from '@/lib/utils'
import { groupProductsForListing } from '@/lib/product-grouping'

interface ProductPageContentProps {
  product: {
    id: string
    title: string
    brand: string | null
    sku: string | null
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
  flavorVariants?: Array<{
    id: string
    parentUid: string | null
    title: string
    brand: string | null
    sku: string | null
    price: number
    priceOld: number | null
    quantity?: number | null
    photo: string | null
    slug: string | null
    isPromoEligible: boolean
    discountPrice: number | null
    isPreorderEnabled?: boolean
  }>
  tabs: { title: string; content: string }[]
  photos: ProductGalleryPhoto[]
  /** When omitted, uses Главная → Каталог → title */
  breadcrumbItems?: BreadcrumbItemType[]
  /** Primary category title for contextual internal links */
  relatedProductsCategoryTitle?: string | null
  relatedProducts: Array<{
    id: string
    parentUid: string | null
    title: string
    brand: string | null
    sku: string | null
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

function getStockBadge(quantity: number | null | undefined, isSprintTheme: boolean): StockBadgeState {
  if (isSprintTheme) {
    if (quantity == null)
      return {
        label: 'В наличии',
        className: 'border border-emerald-800/70 bg-emerald-950/55 text-emerald-200',
      }
    if (quantity <= 0)
      return {
        label: 'Товар временно закончился',
        className: 'border border-slate-600 bg-slate-800/80 text-slate-300',
      }
    if (quantity >= 10)
      return {
        label: 'В наличии',
        className: 'border border-emerald-800/70 bg-emerald-950/55 text-emerald-200',
      }
    return {
      label: 'Заканчивается',
      className: 'border border-amber-800/60 bg-amber-950/45 text-amber-100',
    }
  }
  if (quantity == null) return { label: 'В наличии', className: 'bg-green-100 text-green-700' }
  if (quantity <= 0) return { label: 'Товар временно закончился', className: 'bg-gray-100 text-gray-700' }
  if (quantity >= 10) return { label: 'В наличии', className: 'bg-green-100 text-green-700' }
  return { label: 'Заканчивается', className: 'bg-orange-100 text-orange-700' }
}

/** HTML snippet vs plain text — must not mix `dangerouslySetInnerHTML` with children on one node. */
function looksLikeHtmlMarkup(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text.trim())
}

function ProductDescriptionBlock({
  description,
  isSprintTheme,
}: {
  description: string
  isSprintTheme: boolean
}) {
  const className = cn(
    'mt-6 prose prose-sm max-w-none [&_img]:max-w-full [&_ul]:list-disc [&_ol]:list-decimal',
    isSprintTheme
      ? 'prose-invert text-slate-300 prose-headings:text-slate-100 [&_p]:text-slate-300 [&_li]:text-slate-300 [&_strong]:text-slate-100'
      : 'text-text [&_p]:text-text [&_li]:text-text [&_strong]:text-gray-900'
  )
  if (looksLikeHtmlMarkup(description)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: description }} />
  }
  return (
    <div className={className}>
      <p>{description}</p>
    </div>
  )
}

function ProductLongTextBlock({ text, isSprintTheme }: { text: string; isSprintTheme: boolean }) {
  const className = cn(
    'prose prose-sm max-w-none [&_img]:max-w-full [&_ul]:list-disc [&_ol]:list-decimal',
    isSprintTheme
      ? 'prose-invert text-slate-300 prose-headings:text-slate-100 [&_p]:text-slate-300 [&_li]:text-slate-300 [&_strong]:text-slate-100'
      : 'text-text [&_p]:text-text [&_li]:text-text [&_strong]:text-gray-900'
  )
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
  flavorVariants = [],
  relatedProducts,
  breadcrumbItems,
  relatedProductsCategoryTitle,
  isSprintTheme = false,
}: ProductPageContentProps) {
  const isOutOfStock = product.quantity != null && product.quantity <= 0
  const isPreorderEnabled = product.isPreorderEnabled === true
  const isUnavailable = isOutOfStock && !isPreorderEnabled
  const stock = isOutOfStock && isPreorderEnabled
    ? {
        label: 'Предзаказ',
        className: isSprintTheme
          ? 'border border-amber-800/60 bg-amber-950/45 text-amber-100'
          : 'bg-amber-100 text-amber-700',
      }
    : getStockBadge(product.quantity, isSprintTheme)
  const crumbs: BreadcrumbItemType[] =
    breadcrumbItems ??
    [
      { label: 'Главная', href: '/' },
      { label: 'Каталог', href: '/catalog' },
      { label: product.title },
    ]
  const relatedListingItems = groupProductsForListing(relatedProducts)

  return (
    <AdaptiveContainer
      maxWidth="default"
      className={`py-6 sm:py-10 ${isSprintTheme ? 'text-slate-100' : ''}`}
    >
      <Breadcrumbs items={crumbs} isInverted={isSprintTheme} />
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
        <div
          className={cn(
            isSprintTheme &&
              'rounded-2xl border border-slate-700/70 bg-slate-900/20 p-3 sm:p-4 lg:self-start'
          )}
        >
          <ProductMediaGallery title={product.title} photos={photos} isSprintTheme={isSprintTheme} />
        </div>
        <div
          className={cn(
            isSprintTheme &&
              'rounded-2xl border border-slate-700/70 bg-slate-900/35 p-5 sm:p-6 lg:self-start'
          )}
        >
          <Heading1 className={isSprintTheme ? 'text-slate-100' : undefined}>{product.title}</Heading1>
          {product.sku?.trim() && (
            <p className={`mt-2 text-sm ${isSprintTheme ? 'text-slate-400' : 'text-gray-600'}`}>SKU: {product.sku.trim()}</p>
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
          <ProductFlavorSelector
            activeProductId={product.id}
            variants={flavorVariants}
            isSprintTheme={isSprintTheme}
          />
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
          {product.description && (
            <ProductDescriptionBlock description={product.description} isSprintTheme={isSprintTheme} />
          )}
        </div>
      </FluidGrid>

      {product.text && (
        <ScalableSpacing size="lg">
          <section
            className={`pt-8 ${isSprintTheme ? 'border-t border-slate-700' : 'border-t border-gray-200 dark:border-gray-700'}`}
          >
            <ProductLongTextBlock text={product.text} isSprintTheme={isSprintTheme} />
          </section>
        </ScalableSpacing>
      )}

      {tabs.length > 0 && (
        <ScalableSpacing size="lg">
          <ProductTabs tabs={tabs} isSprintTheme={isSprintTheme} />
        </ScalableSpacing>
      )}

      {relatedProducts.length > 0 && (
        <ScalableSpacing size="lg">
          <section
            className={
              tabs.length > 0
                ? 'pt-6 sm:pt-8'
                : isSprintTheme
                  ? 'border-t border-slate-700 pt-6 sm:pt-8'
                  : 'border-t border-gray-200 pt-6 sm:pt-8'
            }
          >
            <Heading2 className={cn('mb-1', isSprintTheme && 'text-slate-100')}>Из той же категории</Heading2>
            <p className={`mb-4 max-w-2xl text-sm ${isSprintTheme ? 'text-slate-300' : 'text-gray-600'}`}>
              Подборка похожих позиций из каталога — удобно сравнить состав и цену.
            </p>
            <FluidGrid
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
              {relatedListingItems.map((item) =>
                item.kind === 'single' ? (
                  <ProductCard
                    key={item.product.id}
                    id={item.product.id}
                    title={item.product.title}
                    brand={item.product.brand}
                    sku={item.product.sku}
                    price={item.product.price}
                    priceOld={item.product.priceOld}
                    photo={item.product.photo}
                    photos={item.product.photos}
                    slug={item.product.slug}
                    isPromoEligible={item.product.isPromoEligible}
                    discountPrice={item.product.discountPrice}
                    quantity={item.product.quantity}
                    isPreorderEnabled={item.product.isPreorderEnabled}
                    blurDataURL={getFirstPhotoBlurDataURL(item.product.photos)}
                  />
                ) : (
                  <GroupedProductCard key={item.parentUid} group={item} />
                )
              )}
            </FluidGrid>
            {relatedProductsCategoryTitle ? (
              <ProductRelatedCategoryLinks
                categoryTitle={relatedProductsCategoryTitle}
                items={relatedProducts}
                isSprintTheme={isSprintTheme}
              />
            ) : null}
          </section>
        </ScalableSpacing>
      )}

      <RecentlyViewedProducts excludeProductId={product.id} />
    </AdaptiveContainer>
  )
}
