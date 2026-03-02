import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import * as productService from '@/services/product.service'
import { ProductCard } from '@/components/site/product-card'
import { ProductListRow } from '@/components/site/product-list-row'
import { CatalogControls } from '@/components/site/catalog-controls'
import { getFirstPhotoBlurDataURL } from '@/lib/product-photos'
import {
  filterCatalogBlockCategories,
  getCategoryBackgroundImage,
} from '@/lib/catalog-categories'
import { TiltCard } from '@/components/ui/tilt-card'

/** Статический рендер, ревалидация раз в час (проверка соответствия товар–категория). */
export const revalidate = 3600

const PRODUCTS_PER_PAGE = 24

interface CatalogPageProps {
  searchParams: Promise<{
    page?: string
    q?: string
    minPrice?: string
    maxPrice?: string
    brand?: string
    promo?: string
    sort?: string
    view?: string
  }>
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const {
    page: pageParam,
    q: qParam,
    minPrice: minPriceParam,
    maxPrice: maxPriceParam,
    brand: brandParam,
    promo: promoParam,
    sort: sortParam,
    view: viewParam,
  } = await searchParams

  const q = qParam?.trim() ?? ''
  const minPrice = minPriceParam ? Number(minPriceParam) : undefined
  const maxPrice = maxPriceParam ? Number(maxPriceParam) : undefined
  const promoOnly = promoParam === '1'
  const selectedBrands = (brandParam ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const sort =
    sortParam === 'price_asc' || sortParam === 'price_desc' || sortParam === 'name_asc'
      ? sortParam
      : 'newest'
  const view = viewParam === 'list' ? 'list' : 'grid'
  const page = Math.max(1, parseInt(String(pageParam), 10) || 1)

  const [categories, brandOptions, catalogResult] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
    productService.getCatalogBrandOptions(),
    productService.getCatalogProducts({
      page,
      pageSize: PRODUCTS_PER_PAGE,
      q,
      brands: selectedBrands,
      minPrice,
      maxPrice,
      promoOnly,
      sort,
    }),
  ])

  const catalogBlockCategories = filterCatalogBlockCategories(categories)
  const hasNextPage = catalogResult.hasNextPage
  const products = catalogResult.items

  const buildPageHref = (nextPage: number) => {
    const params = new URLSearchParams()
    if (nextPage > 1) params.set('page', String(nextPage))
    if (q) params.set('q', q)
    if (minPrice != null && !Number.isNaN(minPrice)) params.set('minPrice', String(minPrice))
    if (maxPrice != null && !Number.isNaN(maxPrice)) params.set('maxPrice', String(maxPrice))
    if (selectedBrands.length > 0) params.set('brand', selectedBrands.join(','))
    if (promoOnly) params.set('promo', '1')
    if (sort !== 'newest') params.set('sort', sort)
    if (view !== 'grid') params.set('view', view)
    const query = params.toString()
    return query ? `/catalog?${query}` : '/catalog'
  }

  return (
    <div className="max-w-[min(90rem,92vw)] mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-text mb-6">Каталог</h1>
      <CatalogControls
        initialQuery={q}
        brandOptions={brandOptions}
        selectedBrands={selectedBrands}
        minPrice={minPrice}
        maxPrice={maxPrice}
        promoOnly={promoOnly}
        sort={sort}
        view={view}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {catalogBlockCategories.map((cat) => {
          const bgImage = getCategoryBackgroundImage(cat.slug)
          return (
            <Link
              key={cat.id}
              href={`/catalog/${cat.slug}`}
              className="block transition-shadow hover:shadow-md rounded-2xl hover:border-action-blue"
            >
              <TiltCard>
                <div
                  className={`relative flex min-h-[180px] flex-col justify-center items-center p-6 text-center rounded-2xl overflow-hidden ${!bgImage ? 'bg-soft-background' : ''}`}
                >
                  {bgImage && (
                    <>
                      <Image
                        src={bgImage}
                        alt=""
                        fill
                        className="object-cover object-center"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                      <div
                        className="absolute inset-0 bg-linear-to-b from-black/25 to-black/50 rounded-2xl"
                        aria-hidden
                      />
                    </>
                  )}
                  <span
                    className={`relative z-10 font-medium drop-shadow-md block font-script text-lg ${bgImage ? 'text-white' : 'text-text'}`}
                  >
                    {cat.title}
                  </span>
                  <span
                    className={`relative z-10 text-sm drop-shadow mt-1 ${bgImage ? 'text-white/90' : 'text-gray-500'}`}
                  >
                    {cat._count.products} товаров
                  </span>
                </div>
              </TiltCard>
            </Link>
          )
        })}
      </div>

      <h2 className="text-xl font-bold text-text mt-12 mb-6">Все товары</h2>
      {products.length === 0 ? (
        <p className="text-gray-500">Товары появятся после добавления в админке.</p>
      ) : (
        <>
          {view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p, index) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  brand={p.brand}
                  sku={p.sku}
                  price={p.price}
                  priceOld={p.priceOld}
                  photo={p.photo}
                  slug={p.slug}
                  isPromoEligible={p.isPromoEligible}
                  discountPrice={p.discountPrice}
                  priority={index < 2}
                  blurDataURL={'photos' in p ? getFirstPhotoBlurDataURL(p.photos) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <ProductListRow
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  brand={p.brand}
                  sku={p.sku}
                  price={p.price}
                  priceOld={p.priceOld}
                  photo={p.photo}
                  slug={p.slug}
                  isPromoEligible={p.isPromoEligible}
                  discountPrice={p.discountPrice}
                />
              ))}
            </div>
          )}
          {(page > 1 || hasNextPage) && (
            <nav
              className="mt-8 flex flex-wrap items-center justify-center gap-2"
              aria-label="Пагинация каталога"
            >
              {page > 1 && (
                <Link
                  href={buildPageHref(page - 1)}
                  className="px-4 py-2 rounded-full border border-gray-300 bg-white text-text font-medium hover:bg-gray-50 hover:border-action-blue transition-colors min-h-[44px] inline-flex items-center justify-center"
                >
                  ← Назад
                </Link>
              )}
              <span className="px-4 py-2 text-gray-600 text-sm">
                Страница {page}
              </span>
              {hasNextPage && (
                <Link
                  href={buildPageHref(page + 1)}
                  className="px-4 py-2 rounded-full border border-gray-300 bg-white text-text font-medium hover:bg-gray-50 hover:border-action-blue transition-colors min-h-[44px] inline-flex items-center justify-center"
                >
                  Вперёд →
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  )
}
