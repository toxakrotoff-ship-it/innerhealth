import { AddToCartButton } from '@/components/site/add-to-cart-button'
import { ProductTabs } from '@/components/site/product-tabs'
import { CompareToggleButton } from '@/components/site/compare-toggle-button'
import { RecentlyViewedTracker } from '@/components/site/recently-viewed-tracker'
import { RecentlyViewedProducts } from '@/components/site/recently-viewed-products'
import { ProductCard } from '@/components/site/product-card'
import { WishlistToggleButton } from '@/components/site/wishlist-toggle-button'
import { QuickOrderDialog } from '@/components/site/quick-order-dialog'
import { ProductMediaGallery } from '@/components/site/product-media-gallery'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { getFirstPhotoBlurDataURL } from '@/lib/product-photos'
import type { ProductGalleryPhoto } from '@/lib/product-gallery'

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
    slug: string | null
    isPromoEligible?: boolean
    discountPrice?: number | null
  }
  tabs: { title: string; content: string }[]
  photos: ProductGalleryPhoto[]
  relatedProducts: Array<{
    id: string
    title: string
    price: number
    priceOld: number | null
    photo: string | null
    photos?: unknown
    slug: string | null
    isPromoEligible: boolean
    discountPrice: number | null
  }>
}

interface StockBadgeState {
  label: string
  className: string
}

function getStockBadge(quantity: number | null | undefined): StockBadgeState {
  if (quantity == null || quantity <= 0) return { label: 'Предзаказ', className: 'bg-amber-100 text-amber-700' }
  if (quantity >= 10) return { label: 'В наличии', className: 'bg-green-100 text-green-700' }
  return { label: 'Заканчивается', className: 'bg-orange-100 text-orange-700' }
}

export function ProductPageContent({ product, tabs, photos, relatedProducts }: ProductPageContentProps) {
  const stock = getStockBadge(product.quantity)

  return (
    <div className="max-w-[min(90rem,92vw)] mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'Главная', href: '/' },
          { label: 'Каталог', href: '/catalog' },
          { label: product.title },
        ]}
      />
      <RecentlyViewedTracker productId={product.id} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ProductMediaGallery title={product.title} photos={photos} />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">{product.title}</h1>
          {product.brand && (
            <p className="mt-2 text-gray-600">{product.brand}</p>
          )}
          <div className="mt-3">
            <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${stock.className}`}>
              {stock.label}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-2xl font-semibold text-text">
              {product.price.toLocaleString('ru-RU')} ₽
            </span>
            {product.priceOld != null && product.priceOld > product.price && (
              <span className="text-lg text-gray-500 line-through">
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
            />
            <WishlistToggleButton productId={product.id} className="min-h-[44px]" />
            <QuickOrderDialog productId={product.id} productTitle={product.title} />
          </div>
          <div className="mt-3">
            <CompareToggleButton productId={product.id} />
          </div>
          {product.description && (
            <div
              className="mt-6 text-gray-600 prose prose-sm max-w-none [&_img]:max-w-full [&_ul]:list-disc [&_ol]:list-decimal"
              dangerouslySetInnerHTML={
                /<[a-z][\s\S]*>/i.test(product.description.trim())
                  ? { __html: product.description }
                  : undefined
              }
            >
              {!/<[a-z][\s\S]*>/i.test(product.description.trim()) && (
                <p>{product.description}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {product.text && (
        <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div
            className="prose prose-sm max-w-none text-gray-600 dark:text-gray-300 [&_img]:max-w-full [&_ul]:list-disc [&_ol]:list-decimal"
            dangerouslySetInnerHTML={
              /<[a-z][\s\S]*>/i.test(product.text.trim())
                ? { __html: product.text }
                : undefined
            }
          >
            {!/<[a-z][\s\S]*>/i.test(product.text.trim()) && (
              <span className="whitespace-pre-line">{product.text}</span>
            )}
          </div>
        </section>
      )}

      {tabs.length > 0 && <ProductTabs tabs={tabs} />}

      {relatedProducts.length > 0 && (
        <section className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-bold text-text mb-4">С этим товаром покупают</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
                blurDataURL={getFirstPhotoBlurDataURL(item.photos)}
              />
            ))}
          </div>
        </section>
      )}

      <RecentlyViewedProducts excludeProductId={product.id} />
    </div>
  )
}
