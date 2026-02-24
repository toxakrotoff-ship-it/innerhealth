import Image from 'next/image'
import { AddToCartButton } from '@/components/site/add-to-cart-button'
import { ProductTabs } from '@/components/site/product-tabs'

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
    slug: string | null
    isPromoEligible?: boolean
    discountPrice?: number | null
  }
  tabs: { title: string; content: string }[]
}

export function ProductPageContent({ product, tabs }: ProductPageContentProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="relative aspect-square max-w-md mx-auto lg:mx-0 rounded-2xl bg-highlight-blue flex items-center justify-center overflow-hidden">
          {product.photo ? (
            <Image
              src={product.photo.startsWith('/') ? product.photo : `/${product.photo.replace(/^\//, '')}`}
              alt={product.title}
              fill
              className="object-contain p-8"
              priority
            />
          ) : (
            <span className="text-action-blue/40 text-6xl">?</span>
          )}
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">{product.title}</h1>
          {product.brand && (
            <p className="mt-2 text-gray-600">{product.brand}</p>
          )}
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
          <div className="mt-6">
            <AddToCartButton
              productId={product.id}
              title={product.title}
              price={product.price}
              photo={product.photo}
              slug={product.slug}
              hasPromoPrice={
                product.priceOld != null && product.priceOld > product.price
              }
              isPromoEligible={product.isPromoEligible}
              discountPrice={product.discountPrice}
            />
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
    </div>
  )
}
