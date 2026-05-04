import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/site/product-card'
import { GroupedProductCard } from '@/components/site/grouped-product-card'
import { getFirstPhotoBlurDataURL } from '@/lib/product-photos'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { getCategoryPageContent } from '@/content/category-descriptions'
import { getCategoryAncestorChain } from '@/lib/category-tree'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { getPublicGiftPromotions } from '@/services/gift-promotion.service'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { TiltCard } from '@/components/ui/tilt-card'
import { stripHtmlToPlainText } from '@/lib/plain-text'
import { BreadcrumbJsonLd } from '@/components/site/breadcrumb-json-ld'
import { filterVisibleProducts } from '@/lib/catalog-visibility'
import { resolveSiteBrand } from '@/lib/brand/brand-context'
import { resolveDbBrand } from '@/lib/brand/brand-db'
import { getBrandSiteConfig } from '@/lib/brand/site-branding'
import { isSprintPowerBrand, productBelongsToBrandScope } from '@/lib/brand/brand-scope'
import { groupProductsForListing } from '@/lib/product-grouping'
import { getResolvedBlock } from '@/services/content-block.service'
import { CategoryLineProductHighlight } from '@/components/site/category-line-product-highlight'
import { TipTapDocRenderer } from '@/components/site/tiptap-doc-renderer'
import {
  BoneBrothCompositionAndBenefitsScreen,
  BoneBrothProductDescriptionScreen,
} from '@/components/site/bonebroth-catalog-visual-blocks'
import { CollagenCategoryBenefitsBento } from '@/components/site/collagen-category-benefits-bento'
import { CollagenCategorySpecGrid } from '@/components/site/collagen-category-spec-grid'
import { HydroCategoryBenefitsBento } from '@/components/site/hydro-category-benefits-bento'
import { HydroCategoryProductDescription } from '@/components/site/hydro-category-product-description'
import { COLLAGEN_SPEC_CELLS } from '@/content/collagen-category-line'
import { HYDRO_CATEGORY_PRODUCT_DESCRIPTION } from '@/content/hydro-category-bento'
import { cn } from '@/lib/utils'

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
    <div className="mt-12 max-w-4xl border-t border-slate-700 pt-10">
      <TipTapDocRenderer
        raw={raw}
        tone="dark"
        className="prose-invert text-slate-300 prose-headings:text-slate-100 prose-strong:text-slate-100 prose-hr:border-slate-600 prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline"
      />
    </div>
  )
}

function hasNonEmptyTipTapDoc(raw: unknown): boolean {
  if (raw == null) return false
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t) return false
    try {
      const parsed = JSON.parse(t) as { type?: string; content?: unknown[] }
      return parsed?.type === 'doc' && Array.isArray(parsed.content) && parsed.content.length > 0
    } catch {
      return t.length > 0
    }
  }
  if (typeof raw === 'object' && raw !== null) {
    const doc = raw as { type?: string; content?: unknown[] }
    return doc.type === 'doc' && Array.isArray(doc.content) && doc.content.length > 0
  }
  return false
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
  const category = await prisma.category.findUnique({
    where: { brand_slug: { brand: resolveDbBrand(activeBrand), slug: categorySlug } },
    select: { title: true },
  })
  if (!category) {
    return {}
  }

  const content = getCategoryPageContent(categorySlug, activeBrand)
  const brandSite = getBrandSiteConfig(activeBrand)
  let description = `${category.title} — товары в каталоге ${brandSite.title}. Доставка по России.`
  if (content?.paragraphs?.length) {
    description = stripHtmlToPlainText(content.paragraphs[0] ?? '', 158)
  } else if (content?.bullets?.length) {
    description = stripHtmlToPlainText(content.bullets.join(' '), 158)
  }

  const path = `/catalog/${categorySlug}`

  return {
    title: category.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${category.title} | ${brandSite.title}`,
      description,
      url: path,
    },
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { categorySlug } = await params
  const headerStore = await headers()
  const activeBrand = resolveSiteBrand({
    forwardedBrand: headerStore.get('x-brand'),
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })
  const dbBrand = resolveDbBrand(activeBrand)
  const isSprintTheme = isSprintPowerBrand(activeBrand)
  const categoriesFontBlock = await getResolvedBlock('catalog', 'categories.fontVariant', activeBrand)
  const categoryTitleFont =
    categoriesFontBlock?.text?.trim()?.toLowerCase() === 'sans'
      ? 'font-sans'
      : categoriesFontBlock?.text?.trim()?.toLowerCase() === 'script'
        ? 'font-script'
        : 'font-display'
  const category = await prisma.category.findUnique({
    where: { brand_slug: { brand: dbBrand, slug: categorySlug } },
    include: {
      children: {
        where: { brand: dbBrand },
        select: {
          id: true,
          title: true,
          slug: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      },
      products: {
        where: {
          product: {
            isDraft: false,
          },
        },
        include: {
          product: {
            select: {
              id: true,
              parentUid: true,
              title: true,
              brand: true,
              sku: true,
              price: true,
              priceOld: true,
              photo: true,
              photos: true,
              slug: true,
              isDraft: true,
              isPromoEligible: true,
              discountPrice: true,
              quantity: true,
              isPreorderEnabled: true,
            },
          },
        },
      },
    },
  })

  if (!category) notFound()

  let featuredProductForLine: {
    id: string
    title: string
    price: number
    priceOld: number | null
    photo: string | null
    photos: unknown
    slug: string | null
    isPromoEligible: boolean
    discountPrice: number | null
    quantity: number | null
    isPreorderEnabled: boolean
  } | null = null

  if (isSprintTheme && category.featuredProductId) {
    const fp = await prisma.product.findUnique({
      where: { id: category.featuredProductId },
      select: {
        id: true,
        title: true,
        price: true,
        priceOld: true,
        photo: true,
        photos: true,
        slug: true,
        isPromoEligible: true,
        discountPrice: true,
        quantity: true,
        isPreorderEnabled: true,
        brand: true,
        isDraft: true,
      },
    })
    if (
      fp &&
      !fp.isDraft &&
      productBelongsToBrandScope(fp.brand, activeBrand) &&
      category.products.some((pc) => pc.product.id === fp.id)
    ) {
      featuredProductForLine = {
        id: fp.id,
        title: fp.title,
        price: fp.price,
        priceOld: fp.priceOld,
        photo: fp.photo,
        photos: fp.photos,
        slug: fp.slug,
        isPromoEligible: fp.isPromoEligible,
        discountPrice: fp.discountPrice,
        quantity: fp.quantity,
        isPreorderEnabled: fp.isPreorderEnabled,
      }
    }
  }

  const allCategories = await prisma.category.findMany({
    where: { brand: dbBrand },
    select: {
      id: true,
      title: true,
      slug: true,
      parentId: true,
      sortOrder: true,
    },
  })

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

  const products = filterVisibleProducts(category.products.map((pc) => pc.product))
  const listingItems = groupProductsForListing(products)
  const sprintSingleProductListing = isSprintTheme && listingItems.length === 1
  const content = getCategoryPageContent(categorySlug, activeBrand)
  const hasHero = Boolean(content?.heroImage)
  const hasDescription =
    content &&
    (Boolean(content.bullets?.length) || Boolean(content.paragraphs?.length))

  const giftPromos = categorySlug === 'aktsii' ? await getPublicGiftPromotions(new Date(), activeBrand) : []

  return (
    <>
      {/* Hero баннер для категорий с контентом */}
      {hasHero && content && (
        <section
          className="relative w-full overflow-hidden bg-[#e8d5d8]"
          aria-hidden
        >
          <div className="relative w-full aspect-3/1 min-h-[160px] sm:min-h-[200px]">
            <Image
              src={content.heroImage}
              alt=""
              fill
              className="object-cover object-center"
              sizes="100vw"
              priority
            />
            {(content.heroTitle || content.heroSubtitle) && (
              <div
                className="absolute inset-0 flex flex-col items-end justify-center pr-6 sm:pr-10 md:pr-16"
                style={{
                  background:
                    'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.6) 100%)',
                }}
              >
                {content.heroTitle && (
                  <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-wide text-white drop-shadow-md">
                    {content.heroTitle}
                  </span>
                )}
                {content.heroSubtitle && (
                  <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-wide text-white drop-shadow-md -mt-1">
                    {content.heroSubtitle}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      )}

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
          <h1
            className={`mb-6 text-lg font-medium tracking-tight drop-shadow-md 2xl:text-xl 3xl:text-2xl ${categoryTitleFont} ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}
          >
            {category.title}
          </h1>
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
          {featuredProductForLine && (
            <CategoryLineProductHighlight
              id={featuredProductForLine.id}
              title={featuredProductForLine.title}
              price={featuredProductForLine.price}
              priceOld={featuredProductForLine.priceOld}
              photo={featuredProductForLine.photo}
              photos={featuredProductForLine.photos}
              slug={featuredProductForLine.slug}
              isPromoEligible={featuredProductForLine.isPromoEligible}
              discountPrice={featuredProductForLine.discountPrice}
              quantity={featuredProductForLine.quantity}
              isPreorderEnabled={featuredProductForLine.isPreorderEnabled}
            />
          )}
          {categorySlug === 'aktsii' && giftPromos.length > 0 && (
            <div className="mb-10">
              <ScrollReveal as="div" variant="fade-up">
                <FluidGrid cols={1} colsTablet={2} colsDesktop={3} gap={4} adaptiveGap>
                  {giftPromos.map((promo) => {
                    const title = promo.siteTitle || promo.title
                    const descriptionPlain = promo.siteDescription
                      ? htmlToPlainText(promo.siteDescription)
                      : ''
                    const cover = (promo as any).coverImage as string | undefined
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
                        <TiltCard>
                          <div
                            className={`relative flex min-h-[180px] flex-col justify-center p-6 rounded-2xl overflow-hidden ${
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
                                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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

          {products.length === 0 ? (
            <p className={isSprintTheme ? 'text-slate-400' : 'text-gray-500'}>
              В этой категории пока нет товаров.
            </p>
          ) : (
            <FluidGrid
              cols={sprintSingleProductListing ? 1 : 2}
              colsTablet={sprintSingleProductListing ? 1 : 3}
              colsDesktop={sprintSingleProductListing ? 1 : 4}
              colsXl={sprintSingleProductListing ? 1 : 5}
              cols2xl={sprintSingleProductListing ? 1 : 5}
              cols3xl={sprintSingleProductListing ? 1 : 6}
              cols4xl={sprintSingleProductListing ? 1 : 6}
              gap="6"
              adaptiveGap={false}
              className={cn(
                sprintSingleProductListing
                  ? 'mx-auto w-full max-w-[min(100%,22rem)] sm:max-w-[min(100%,24rem)] md:max-w-[min(100%,26rem)] lg:max-w-[min(100%,28rem)] xl:max-w-[min(100%,30rem)] 2xl:max-w-[min(100%,32rem)] 3xl:max-w-[min(100%,34rem)] 4xl:max-w-[min(100%,36rem)] 5xl:max-w-[min(100%,38rem)] 6xl:max-w-[min(100%,40rem)] gap-6 md:gap-7 lg:gap-8 xl:gap-10 2xl:gap-12 3xl:gap-14 4xl:gap-16 5xl:gap-20 6xl:gap-24'
                  : 'max-sm:grid-cols-1 gap-6 md:gap-7 lg:gap-8 xl:gap-10 2xl:gap-12 3xl:gap-14 4xl:gap-16 5xl:gap-20 6xl:gap-24'
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
          )}

          {isSprintTheme && categorySlug === 'hydro' && (
            <HydroCategoryProductDescription content={HYDRO_CATEGORY_PRODUCT_DESCRIPTION} />
          )}

          {isSprintTheme && categorySlug === 'hydro' && (
            <HydroCategoryBenefitsBento />
          )}

          {isSprintTheme &&
            hasNonEmptyTipTapDoc(category.linePageBodyRichJson) &&
            categorySlug === 'hydro' && (
              <SprintLineTipTapBlock raw={category.linePageBodyRichJson} />
            )}

          {isSprintTheme && categorySlug === 'collagen' && (
            <CollagenCategorySpecGrid cells={COLLAGEN_SPEC_CELLS} />
          )}

          {isSprintTheme &&
            hasNonEmptyTipTapDoc(category.linePageBodyRichJson) &&
            categorySlug === 'collagen' && (
              <SprintLineTipTapBlock raw={category.linePageBodyRichJson} />
            )}

          {isSprintTheme && categorySlug === 'collagen' && (
            <CollagenCategoryBenefitsBento />
          )}

          {isSprintTheme && (categorySlug === 'bonebroth' || categorySlug === 'sp-bonebroth') && (
            <BoneBrothProductDescriptionScreen />
          )}

          {isSprintTheme &&
            hasNonEmptyTipTapDoc(category.linePageBodyRichJson) &&
            (categorySlug === 'bonebroth' || categorySlug === 'sp-bonebroth') && (
              <SprintLineTipTapBlock raw={category.linePageBodyRichJson} />
            )}

          {isSprintTheme && (categorySlug === 'bonebroth' || categorySlug === 'sp-bonebroth') && (
            <BoneBrothCompositionAndBenefitsScreen />
          )}

          {isSprintTheme &&
            hasNonEmptyTipTapDoc(category.linePageBodyRichJson) &&
            categorySlug !== 'hydro' &&
            categorySlug !== 'collagen' &&
            categorySlug !== 'bonebroth' &&
            categorySlug !== 'sp-bonebroth' && (
              <SprintLineTipTapBlock raw={category.linePageBodyRichJson} />
            )}

          {/* Описание раздела под каталогом */}
          {hasDescription && content && (
            <div className={`mt-12 pt-10 ${isSprintTheme ? 'border-t border-slate-700' : 'border-t border-gray-200'}`}>
              {content.descriptionHeading && (
                <h2 className={`text-xl font-bold mb-4 ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
                  {content.descriptionHeading}
                </h2>
              )}
              {content.bullets && content.bullets.length > 0 && (
                <ul className={`list-disc list-inside space-y-2 mb-6 ${isSprintTheme ? 'text-slate-300' : 'text-gray-700'}`}>
                  {content.bullets.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              )}
              {content.paragraphs && content.paragraphs.length > 0 && (
                <div className={`space-y-3 ${isSprintTheme ? 'text-slate-300' : 'text-gray-700'}`}>
                  {content.paragraphs.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </AdaptiveContainer>
      </section>
    </>
  )
}
