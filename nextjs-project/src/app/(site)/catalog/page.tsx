import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { prisma } from '@/lib/prisma'
import * as productService from '@/services/product.service'
import { ProductCard } from '@/components/site/product-card'
import { GroupedProductCard } from '@/components/site/grouped-product-card'
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
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { TiltCard } from '@/components/ui/tilt-card'
import { Heading1, Heading2 } from '@/components/ui/responsive-text'
import { getResolvedBlock } from '@/services/content-block.service'
import { BreadcrumbJsonLd } from '@/components/site/breadcrumb-json-ld'
import { CatalogZeroHitReporter } from '@/components/site/catalog-zero-hit-reporter'
import {
  buildCatalogListPath,
  parseCatalogSearchParams,
} from '@/lib/catalog-list-path'
import { getCatalogListingRobots } from '@/lib/catalog-listing-robots'
import { groupProductsForListing } from '@/lib/product-grouping'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'
import { resolveDbBrand } from '@/lib/brand/brand-db'

/** Статический рендер каталога, ревалидация раз в 10 минут. */
export const revalidate = 600
export const dynamic = 'force-dynamic'

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

function getCatalogDescription(siteTitle: string): string {
  if (siteTitle === 'Sprint Power') {
    return 'Каталог Sprint Power: спортивное питание и нутриенты для силы, восстановления и выносливости.'
  }
  return 'Каталог товаров Inner Health: нутриенты, коллаген, БАДы и специализированное питание. Фильтры по цене и бренду, доставка по России.'
}

export async function generateMetadata({
  searchParams,
}: CatalogPageProps): Promise<Metadata> {
  const { siteTitle, brandId } = await getServerBrandContext()
  const raw = await searchParams
  const p = parseCatalogSearchParams(raw)
  const canonicalPath = buildCatalogListPath({
    page: p.page,
    q: p.q,
    minPrice: p.minPrice,
    maxPrice: p.maxPrice,
    brands: p.brands,
    promoOnly: p.promoOnly,
    sort: p.sort,
    view: p.view,
  })
  const matchingTotal = await productService.countCatalogProducts({
    q: p.q,
    brands: p.brands,
    minPrice: p.minPrice,
    maxPrice: p.maxPrice,
    promoOnly: p.promoOnly,
    brandId,
  })
  const robots = getCatalogListingRobots({ parsed: p, matchingTotal })
  const titleBase = 'Каталог'
  const title = p.page > 1 ? `${titleBase} — страница ${p.page}` : titleBase
  return {
    title,
    description: getCatalogDescription(siteTitle),
    alternates: { canonical: canonicalPath },
    robots,
    openGraph: {
      title: `${title} | ${siteTitle}`,
      description:
        'Выберите категорию и оформите заказ онлайн. Акции, подарки и консультации по ассортименту.',
      url: canonicalPath,
    },
  }
}

const PRODUCTS_PER_PAGE = 24

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { brandId } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const dbBrand = resolveDbBrand(brandId)
  const sp = await searchParams
  const {
    page,
    q,
    minPrice,
    maxPrice,
    brands: selectedBrands,
    promoOnly,
    sort,
    view,
  } = parseCatalogSearchParams(sp)

  const [categories, brandOptions, catalogResult] = await Promise.all([
    prisma.category.findMany({
      where: { showInCategoriesBlock: true, brand: dbBrand },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            products: {
              where: { product: { isDraft: false } },
            },
          },
        },
      },
    }),
    productService.getCatalogBrandOptions().then((options) =>
      isSprintPowerBrand(brandId)
        ? options.filter((b) => b === 'sprint-power')
        : options.filter((b) => b !== 'sprint-power')
    ),
    productService.getCatalogProducts({
      page,
      pageSize: PRODUCTS_PER_PAGE,
      q,
      brands: selectedBrands,
      minPrice,
      maxPrice,
      promoOnly,
      sort,
      brandId,
    }),
  ])

  const catalogBlockCategories = filterCatalogBlockCategories(categories)
  const hasNextPage = catalogResult.hasNextPage
  const products = catalogResult.items
  const listingItems = groupProductsForListing(products)

  const categoriesFontBlock = await getResolvedBlock('catalog', 'categories.fontVariant', brandId)
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
  const catalogCurrentPath = buildCatalogListPath({
    page,
    q,
    minPrice,
    maxPrice,
    brands: selectedBrands,
    promoOnly,
    sort,
    view,
  })

  return (
    <section className={isSprintTheme ? 'bg-[#060A14]' : ''}>
      <AdaptiveContainer
        maxWidth="default"
        className={`pt-2 md:pt-3 pb-12 sm:pb-16 md:pb-20 lg:pb-24 ${isSprintTheme ? 'text-slate-100' : ''}`}
      >
        <BreadcrumbJsonLd items={breadcrumbItems} currentPath={catalogCurrentPath} />
        <Suspense fallback={null}>
          <CatalogZeroHitReporter query={q} hasProducts={products.length > 0} />
        </Suspense>
        <Breadcrumbs items={breadcrumbItems} isInverted={isSprintTheme} />
        <Heading1 className={`mb-6 mt-0 ${isSprintTheme ? 'text-slate-100' : ''}`}>
          {page > 1 ? `Каталог — страница ${page}` : 'Каталог'}
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
                  className={`block transition-shadow rounded-2xl ${
                    isSprintTheme ? 'hover:border-[#3B82F6] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.35)]' : 'hover:shadow-md hover:border-action-blue'
                  }`}
                >
                  <TiltCard>
                    <div
                      className={`relative flex min-h-[180px] flex-col justify-center items-center p-6 text-center rounded-2xl overflow-hidden ${
                        !bgImage ? (isSprintTheme ? 'bg-[#0F172A]' : 'bg-soft-background') : ''
                      }`}
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
                        className={`relative z-10 font-medium drop-shadow-md block ${categoryTitleFont} text-lg ${
                          bgImage ? 'text-white' : isSprintTheme ? 'text-slate-100' : 'text-text'
                        }`}
                      >
                        {cat.title}
                      </span>
                      <span
                        className={`relative z-10 text-sm drop-shadow mt-1 ${
                          bgImage ? 'text-white/90' : isSprintTheme ? 'text-slate-400' : 'text-gray-500'
                        }`}
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
          <Heading2 className={`mb-6 ${isSprintTheme ? 'text-slate-100' : ''}`}>
            Все товары
          </Heading2>
        </ScalableSpacing>
        {products.length === 0 ? (
          <p className={isSprintTheme ? 'text-slate-400' : 'text-gray-500'}>
            Товары появятся после добавления в админке.
          </p>
        ) : (
          <>
            {view === 'grid' ? (
              <FluidGrid
                cols={2}
                colsTablet={3}
                colsDesktop={4}
                colsXl={5}
                cols2xl={5}
                cols3xl={6}
                cols4xl={6}
                gap="6"
                adaptiveGap={false}
                className="max-[389px]:grid-cols-1 gap-6 md:gap-7 lg:gap-8 xl:gap-10 2xl:gap-12 3xl:gap-14 4xl:gap-16 5xl:gap-20 6xl:gap-24"
              >
                {listingItems.map((item, index) =>
                  item.kind === 'single' ? (
                    <ProductCard
                      key={item.product.id}
                      id={item.product.id}
                      title={item.product.title}
                      brand={item.product.brand}
                      sku={item.product.sku}
                      showSku={false}
                      price={item.product.price}
                      priceOld={item.product.priceOld}
                      photo={item.product.photo}
                      photos={'photos' in item.product ? item.product.photos : undefined}
                      slug={item.product.slug}
                      isPromoEligible={item.product.isPromoEligible}
                      discountPrice={item.product.discountPrice}
                      quantity={item.product.quantity}
                      isPreorderEnabled={item.product.isPreorderEnabled}
                      priority={index < 2}
                      blurDataURL={'photos' in item.product ? getFirstPhotoBlurDataURL(item.product.photos) : undefined}
                    />
                  ) : (
                    <GroupedProductCard key={item.parentUid} group={item} priority={index < 2} showSku={false} />
                  )
                )}
              </FluidGrid>
            ) : (
              <div className={`space-y-3 ${isSprintTheme ? '**:border-slate-700' : ''}`}>
                {products.map((p) => (
                  <ProductListRow
                    key={p.id}
                    id={p.id}
                    title={p.title}
                    sku={p.sku}
                    showSku={false}
                    price={p.price}
                    priceOld={p.priceOld}
                    photo={p.photo}
                    slug={p.slug}
                    isPromoEligible={p.isPromoEligible}
                    discountPrice={p.discountPrice}
                    quantity={p.quantity}
                    isPreorderEnabled={p.isPreorderEnabled}
                  />
                ))}
              </div>
            )}
            {(page > 1 || hasNextPage) && (
              <nav
                className="mt-10 md:mt-12 flex flex-wrap items-center justify-center gap-2"
                aria-label="Пагинация каталога"
              >
                {page > 1 && (
                  <Link
                    href={buildPageHref(page - 1)}
                    className={`px-4 py-2 rounded-full border font-medium transition-colors min-h-[44px] inline-flex items-center justify-center ${
                      isSprintTheme
                        ? 'border-slate-600 bg-[#0F172A] text-slate-100 hover:border-[#3B82F6] hover:text-[#7AA2FF]'
                        : 'border-gray-300 bg-white text-text hover:bg-gray-50 hover:border-action-blue'
                    }`}
                  >
                    ← Назад
                  </Link>
                )}
                <span className={`px-4 py-2 text-sm ${isSprintTheme ? 'text-slate-400' : 'text-gray-600'}`}>
                  Страница {page}
                </span>
                {hasNextPage && (
                  <Link
                    href={buildPageHref(page + 1)}
                    className={`px-4 py-2 rounded-full border font-medium transition-colors min-h-[44px] inline-flex items-center justify-center ${
                      isSprintTheme
                        ? 'border-slate-600 bg-[#0F172A] text-slate-100 hover:border-[#3B82F6] hover:text-[#7AA2FF]'
                        : 'border-gray-300 bg-white text-text hover:bg-gray-50 hover:border-action-blue'
                    }`}
                  >
                    Вперёд →
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </AdaptiveContainer>
    </section>
  )
}
