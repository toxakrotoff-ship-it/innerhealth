import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import * as productService from '@/services/product.service'
import { ProductCard } from '@/components/site/product-card'
import { ProductListRow } from '@/components/site/product-list-row'
import { CatalogControls } from '@/components/site/catalog-controls'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { getFirstPhotoBlurDataURL } from '@/lib/product-photos'
import {
  filterCatalogBlockCategories,
  getCategoryBackgroundImage,
  getCategoryImageObjectPosition,
} from '@/lib/catalog-categories'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { Heading1 } from '@/components/ui/responsive-text'
import { getResolvedBlock } from '@/services/content-block.service'

/** Статический рендер каталога, ревалидация раз в 10 минут. */
export const revalidate = 600

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

  const categoriesFontBlock = await getResolvedBlock('catalog', 'categories.fontVariant')
  const categoryTitleFont =
    categoriesFontBlock?.text?.trim()?.toLowerCase() === 'sans'
      ? 'font-sans'
      : categoriesFontBlock?.text?.trim()?.toLowerCase() === 'script'
        ? 'font-script'
        : 'font-display'

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

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Каталог' },
  ]

  return (
    <AdaptiveContainer maxWidth="default" className="pt-2 md:pt-3">
      <Breadcrumbs items={breadcrumbItems} />
      <Heading1 className="mb-6 mt-0">
        Каталог
      </Heading1>
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
      <ScalableSpacing size="lg">
        <FluidGrid cols={2} colsTablet={3} colsDesktop={3} gap={4} adaptiveGap>
          {catalogBlockCategories.map((cat) => {
            const bgImage = getCategoryBackgroundImage(cat.slug)
            const imagePosition = getCategoryImageObjectPosition(cat.slug)
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
                          className={imagePosition}
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                        <div
                          className="absolute inset-0 bg-linear-to-b from-black/25 to-black/50 rounded-2xl"
                          aria-hidden
                        />
                      </>
                    )}
                    <span
                      className={`relative z-10 font-medium drop-shadow-md block ${categoryTitleFont} text-lg ${bgImage ? 'text-white' : 'text-text'}`}
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
        </FluidGrid>
      </ScalableSpacing>

      <ScalableSpacing size="lg">
        <Heading2 className="mb-6">
          Все товары
        </Heading2>
      </ScalableSpacing>
      {products.length === 0 ? (
        <p className="text-gray-500">Товары появятся после добавления в админке.</p>
      ) : (
        <>
          {view === 'grid' ? (
            <FluidGrid cols={2} colsTablet={3} colsDesktop={4} colsXl={4} cols2xl={4} cols3xl={4} cols4xl={4} gap={4} adaptiveGap>
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
            </FluidGrid>
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
    </AdaptiveContainer>
  )
}
