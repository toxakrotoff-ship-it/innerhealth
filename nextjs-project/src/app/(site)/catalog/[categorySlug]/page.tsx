import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { ProductCard } from '@/components/site/product-card'
import { GroupedProductCard } from '@/components/site/grouped-product-card'
import { getFirstPhotoBlurDataURL } from '@/lib/product-photos'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { getCategoryPageContentDoc } from '@/content/category-descriptions'
import { getCategoryAncestorChain } from '@/lib/category-tree'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { getPublicGiftPromotions } from '@/services/gift-promotion.service'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { TiltCard } from '@/components/ui/tilt-card'
import { BreadcrumbJsonLd } from '@/components/site/breadcrumb-json-ld'
import { filterVisibleProducts } from '@/lib/catalog-visibility'
import { resolveSiteBrand } from '@/lib/brand/brand-context'
import { getBrandSiteConfig } from '@/lib/brand/site-branding'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'
import { groupProductsForListing } from '@/lib/product-grouping'
import { getResolvedBlock } from '@/services/content-block.service'
import { TipTapDocRenderer } from '@/components/site/tiptap-doc-renderer'
import { cn } from '@/lib/utils'
import { buildMetadataWithSocial, normalizeSeoDescription, parseSeoKeywords, trimToNull } from '@/lib/seo'
import {
  hasNonEmptyTipTapDoc,
  resolveCategoryDescriptionDoc,
  resolveCategoryHeading,
  resolveCategoryImageAlt,
  resolveCategoryMetadataDescription,
  resolveCategoryTeaser,
} from '@/lib/category-page-content'
import {
  getPublicCategoryBySlug,
  getPublicCategoryMetadataBySlug,
  getPublishedCategoryTree,
} from '@/services/category.service'

function htmlToPlainText(html: string): string {
  const stripped = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  return stripped
}

function SprintLineTipTapBlock({ raw }: { raw: unknown }) {
  return (
    <div className="mt-12 border-t border-slate-700 pt-10">
      <TipTapDocRenderer
        raw={raw}
        tone="dark"
        className="prose-invert max-w-none text-slate-300 prose-headings:text-slate-100 prose-strong:text-slate-100 prose-hr:border-slate-600 prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline"
      />
    </div>
  )
}

/** Статический рендер категории, ревалидация раз в 10 минут. */
export const revalidate = 600
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ categorySlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug } = await params
  const headerStore = await headers()
  const activeBrand = resolveSiteBrand({
    forwardedBrand: headerStore.get('x-brand'),
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })
  const category = await getPublicCategoryMetadataBySlug(categorySlug, activeBrand)
  if (!category) {
    return {}
  }
  if (!category.isPublished) {
    return {
      robots: {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
      },
    }
  }

  const brandSite = getBrandSiteConfig(activeBrand)
  const descriptionFallback = `${category.title} — товары в каталоге ${brandSite.title}. Доставка по России.`
  const fallbackContentDoc = category.showLegacyLinePageBlocks
    ? getCategoryPageContentDoc(categorySlug, activeBrand)
    : null
  const description = resolveCategoryMetadataDescription({
    category,
    legacyDoc: fallbackContentDoc,
    fallbackDescription: descriptionFallback,
  })

  const path = `/catalog/${categorySlug}`
  const metadataTitle = trimToNull(category.seoTitle) ?? trimToNull(category.pageTitle) ?? category.title
  const metadataDescription = normalizeSeoDescription(category.seoDescription, 200) ?? description
  const imageAlt = resolveCategoryImageAlt(category)

  return buildMetadataWithSocial({
    title: metadataTitle,
    description: metadataDescription,
    path,
    keywords: parseSeoKeywords(category.seoKeywords),
    image: trimToNull(category.image) ? { url: trimToNull(category.image)!, alt: imageAlt } : null,
  })
}

export default async function CategoryPage({ params }: PageProps) {
  const { categorySlug } = await params
  const headerStore = await headers()
  const activeBrand = resolveSiteBrand({
    forwardedBrand: headerStore.get('x-brand'),
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })
  const isSprintTheme = isSprintPowerBrand(activeBrand)
  const categoriesFontBlock = await getResolvedBlock('catalog', 'categories.fontVariant', activeBrand)
  const categoryTitleFont =
    categoriesFontBlock?.text?.trim()?.toLowerCase() === 'sans'
      ? 'font-sans'
      : categoriesFontBlock?.text?.trim()?.toLowerCase() === 'script'
        ? 'font-script'
        : 'font-display'
  const category = await getPublicCategoryBySlug(categorySlug, activeBrand)

  if (!category) notFound()
  if (!category.isPublished) notFound()

  const allCategories = await getPublishedCategoryTree(activeBrand)

  const breadcrumbChain = getCategoryAncestorChain(allCategories, category.id)
  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Каталог', href: '/catalog' },
    ...breadcrumbChain.map((node, index) => {
      const isLast = index === breadcrumbChain.length - 1
      return isLast
        ? { label: node.title }
        : { label: node.title, href: `/catalog/${node.slug}` }
    }),
  ]

  const productRows = category.products.map((pc) => pc.product) as Array<
    (typeof category.products)[number]['product'] & { isDraft: boolean }
  >
  const visible = filterVisibleProducts(productRows)
  const products = isSprintTheme
    ? visible.map((p) => ({ ...p, primaryCategorySlug: categorySlug }))
    : visible
  const listingItems = groupProductsForListing(products)
  const legacyDescriptionDoc = category.showLegacyLinePageBlocks
    ? getCategoryPageContentDoc(categorySlug, activeBrand)
    : null
  const descriptionDocRaw = !isSprintTheme
    ? resolveCategoryDescriptionDoc({
        linePageBodyRichJson: category.linePageBodyRichJson,
        legacyDoc: legacyDescriptionDoc,
        showLegacyLinePageBlocks: category.showLegacyLinePageBlocks,
      })
    : null
  const categoryHeading = resolveCategoryHeading(category)
  const categoryTeaser = resolveCategoryTeaser(category)
  const categoryImage = trimToNull(category.image)
  const categoryImageAlt = resolveCategoryImageAlt(category)

  const giftPromos = categorySlug === 'aktsii' ? await getPublicGiftPromotions(new Date(), activeBrand) : []

  return (
    <>
      {/* Хлебные крошки — нейтральный фон, без отдельной «полосы» highlight-blue */}
      <section className={isSprintTheme ? 'bg-[#060A14]' : 'bg-white'}>
        <AdaptiveContainer maxWidth="default">
          <BreadcrumbJsonLd items={breadcrumbItems} currentPath={`/catalog/${categorySlug}`} />
          <Breadcrumbs
            items={breadcrumbItems}
            isInverted={isSprintTheme}
          />
        </AdaptiveContainer>
      </section>

      <section className={`py-12 ${isSprintTheme ? 'bg-[#060A14] text-slate-100' : 'bg-white'}`}>
        <AdaptiveContainer maxWidth="default">
          <div
            className={cn(
              'mb-8 overflow-hidden rounded-3xl border',
              isSprintTheme ? 'border-slate-700 bg-[#0F172A]' : 'border-gray-200 bg-gradient-to-br from-white to-gray-50'
            )}
          >
            {categoryImage ? (
              <div className="relative min-h-[260px] sm:min-h-[320px] lg:min-h-[360px]">
                <Image
                  src={categoryImage}
                  alt={categoryImageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 1200px"
                />
                <div
                  className={cn(
                    'absolute inset-0',
                    isSprintTheme
                      ? 'bg-linear-to-r from-[#060A14]/88 via-[#060A14]/58 to-[#060A14]/18'
                      : 'bg-linear-to-r from-white/92 via-white/70 to-white/18'
                  )}
                  aria-hidden
                />
                <div className="relative z-10 flex min-h-[260px] items-center px-6 py-7 sm:min-h-[320px] sm:px-8 sm:py-9 lg:min-h-[360px] lg:px-10 lg:py-10">
                  <div className="max-w-2xl">
                    <h1
                      className={cn(
                        `tracking-tight drop-shadow-sm ${categoryTitleFont}`,
                        isSprintTheme
                          ? 'text-2xl font-medium text-slate-100 sm:text-3xl'
                          : 'text-2xl font-medium text-text sm:text-3xl'
                      )}
                    >
                      {categoryHeading}
                    </h1>
                    {categoryTeaser ? (
                      <p
                        className={cn(
                          'mt-4 max-w-xl text-base leading-7',
                          isSprintTheme ? 'text-slate-300' : 'text-gray-700'
                        )}
                      >
                        {categoryTeaser}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
                <h1
                  className={cn(
                    `tracking-tight ${categoryTitleFont}`,
                    isSprintTheme ? 'text-2xl font-medium text-slate-100 sm:text-3xl' : 'text-2xl font-medium text-text sm:text-3xl'
                  )}
                >
                  {categoryHeading}
                </h1>
                {categoryTeaser ? (
                  <p
                    className={cn(
                      'mt-4 max-w-2xl text-base leading-7',
                      isSprintTheme ? 'text-slate-300' : 'text-gray-600'
                    )}
                  >
                    {categoryTeaser}
                  </p>
                ) : null}
              </div>
            )}
          </div>
          {category.children.length > 0 && (
            <div
              className={`mb-8 rounded-xl p-4 ${
                isSprintTheme ? 'border border-slate-700 bg-[#0F172A]' : 'border border-gray-200 bg-gray-50'
              }`}
            >
              <h2 className={`text-base font-semibold mb-3 ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
                Подкатегории
              </h2>
              <div className="flex flex-wrap gap-2">
                {category.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/catalog/${child.slug}`}
                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      isSprintTheme
                        ? 'border-slate-600 bg-[#0B1222] text-slate-100 hover:border-[#7AA2FF] hover:text-[#9AB8FF]'
                        : 'border-gray-300 bg-white text-text hover:border-action-blue hover:text-action-blue'
                    }`}
                  >
                    {child.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {categorySlug === 'aktsii' && giftPromos.length > 0 && (
            <div className="mb-10">
              <ScrollReveal as="div" variant="fade-up">
                <FluidGrid
                  cols={1}
                  colsTablet={2}
                  colsDesktop={isSprintTheme ? 2 : 3}
                  gap={4}
                  adaptiveGap
                  className={isSprintTheme ? 'mx-auto w-full max-w-[560px] sm:max-w-[640px] lg:max-w-[720px]' : undefined}
                >
                  {giftPromos.map((promo) => {
                    const title = promo.siteTitle || promo.title
                    const descriptionPlain = promo.siteDescription
                      ? htmlToPlainText(promo.siteDescription)
                      : ''
                    const cover =
                      (promo as unknown as { coverImage?: string | null }).coverImage ?? undefined
                    const fallbackPhoto = promo.giftProduct?.photo ?? null
                    const imageSrc =
                      cover ??
                      (fallbackPhoto
                        ? fallbackPhoto.startsWith('/')
                          ? fallbackPhoto
                          : `/${fallbackPhoto.replace(/^\//, '')}`
                        : null)

                    return (
                      <div
                        key={promo.id}
                        className={`block transition-shadow rounded-2xl ${
                          isSprintTheme
                            ? 'hover:border-[#7AA2FF] hover:shadow-[0_0_0_1px_rgba(122,162,255,0.35)]'
                            : 'hover:shadow-md hover:border-action-blue'
                        }`}
                      >
                        <TiltCard variant={isSprintTheme ? 'dark' : 'default'}>
                          <div
                            className={`relative flex ${isSprintTheme ? 'aspect-[16/12] p-5' : 'min-h-[180px] p-6'} flex-col justify-center rounded-2xl overflow-hidden ${
                              isSprintTheme ? 'bg-[#0F172A]' : 'bg-soft-background'
                            }`}
                          >
                            {imageSrc && (
                              <>
                                <Image
                                  src={imageSrc}
                                  alt={title}
                                  fill
                                  className="object-cover object-center"
                                  sizes={
                                    isSprintTheme
                                      ? '(max-width: 768px) 100vw, 50vw'
                                      : '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw'
                                  }
                                />
                                <div
                                  className="absolute inset-0 bg-linear-to-b from-black/25 to-black/60 rounded-2xl"
                                  aria-hidden
                                />
                              </>
                            )}

                            <div className="relative z-10 space-y-2 max-w-xs">
                              <span className="inline-flex items-center gap-2 rounded-full bg-red-600/95 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
                                <span className="inline-flex h-4 w-4 items-center justify-center" aria-hidden>
                                  <svg viewBox="0 0 24 24" className="h-4 w-4">
                                    <path
                                      fill="currentColor"
                                      d="M9 3.255a1.875 1.875 0 1 0 0 3.75h1.875v4.5H3A1.875 1.875 0 0 1 1.125 9.63v-.75c0-1.036.84-1.875 1.875-1.875h3.193a3.375 3.375 0 0 1 5.432-3.997 3.375 3.375 0 0 1 5.432 3.997H21c1.035 0 1.875.84 1.875 1.875v.75c0 1.035-.84 1.875-1.875 1.875h-8.625v-4.5h1.875a1.875 1.875 0 1 0-1.875-1.875v1.875h-1.5V5.13c0-1.036-.84-1.875-1.875-1.875ZM10.875 13.005h-8.25v6.75a2.25 2.25 0 0 0 2.25 2.25h6v-9ZM12.375 13.005v9h6.75a2.25 2.25 0 0 0 2.25-2.25v-6.75h-9Z"
                                    />
                                  </svg>
                                </span>
                                Подарок
                              </span>

                              <span className="block text-base sm:text-lg font-semibold tracking-tight text-white drop-shadow-md line-clamp-3">
                                {title}
                              </span>

                              {descriptionPlain && (
                                <span className="block text-sm text-white/90 drop-shadow line-clamp-3">
                                  {descriptionPlain}
                                </span>
                              )}
                            </div>
                          </div>
                        </TiltCard>
                      </div>
                    )
                  })}
                </FluidGrid>
              </ScrollReveal>
            </div>
          )}

          {products.length === 0 && giftPromos.length === 0 ? (
            <p className={isSprintTheme ? 'text-slate-400' : 'text-gray-500'}>
              В этой категории пока нет доступных товаров.
            </p>
          ) : (
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
              className={cn(
                'max-sm:grid-cols-1 gap-6 md:gap-7 lg:gap-8 xl:gap-10 2xl:gap-12 3xl:gap-14 4xl:gap-16 5xl:gap-20 6xl:gap-24'
              )}
            >
              {listingItems.map((item, index) =>
                item.kind === 'single' ? (
                  <ProductCard
                    key={item.product.id}
                    id={item.product.id}
                    title={item.product.title}
                    brand={item.product.brand}
                    sku={item.product.sku}
                    weight={item.product.weight}
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
                  <GroupedProductCard
                    key={item.parentUid}
                    group={item}
                    priority={index < 2}
                    showSku={false}
                  />
                )
              )}
            </FluidGrid>
          )}

          {isSprintTheme && hasNonEmptyTipTapDoc(category.linePageBodyRichJson) && (
            <SprintLineTipTapBlock raw={category.linePageBodyRichJson} />
          )}

          {descriptionDocRaw && (
            <div className={`mt-12 pt-10 ${isSprintTheme ? 'border-t border-slate-700' : 'border-t border-gray-200'}`}>
              <TipTapDocRenderer
                raw={descriptionDocRaw}
                tone={isSprintTheme ? 'dark' : 'light'}
                className={
                  isSprintTheme
                    ? 'prose-invert max-w-none text-slate-300 prose-headings:text-slate-100 prose-strong:text-slate-100 prose-hr:border-slate-600 prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline'
                    : 'max-w-none text-gray-700 prose-headings:text-text prose-strong:text-text prose-a:text-action-blue prose-a:no-underline hover:prose-a:underline'
                }
              />
            </div>
          )}
        </AdaptiveContainer>
      </section>
    </>
  )
}
