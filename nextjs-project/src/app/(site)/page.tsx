import nextDynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { headers } from 'next/headers'
import type { Metadata, ResolvingMetadata } from 'next'
import { prisma } from '@/lib/prisma'
import * as productService from '@/services/product.service'
import * as reviewService from '@/services/review.service'
import * as faqService from '@/services/faq.service'
import { ProductCard } from '@/components/site/product-card'
import { getFirstPhotoBlurDataURL } from '@/lib/product-photos'
import { HeroBlock } from '@/components/site/hero-block'
import { SprintPowerBanner } from '@/components/site/sprint-power-banner'
import { HowToOrderSteps } from '@/components/site/how-to-order-steps'
import { PostCard } from '@/components/site/post-card'
import {
  filterCatalogBlockCategories,
  getCategoryImageObjectPosition,
  resolveCategoryImage,
} from '@/lib/catalog-categories'
import { TiltCard } from '@/components/ui/tilt-card'
import { CheckCircle, NavArrowRight } from 'iconoir-react'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import {
  getResolvedBlocksForPage,
  type ContentBlockResolved,
  getDefaultBlockForPageBrand,
} from '@/services/content-block.service'
import { getActiveSitePopup } from '@/services/site-popup.service'
import { HomePopupClient } from '@/components/site/home-popup-client'
import { Heading2 } from '@/components/ui/responsive-text'
import { SpacingVertical } from '@/components/ui/scalable-spacing'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { FaqAccordion } from '@/components/site/faq-accordion'
import { resolveSiteBrand } from '@/lib/brand/brand-context'
import { resolveDbBrand } from '@/lib/brand/brand-db'
import { SPRINT_POWER_PRODUCT_BRAND } from '@/lib/brand/brand-scope'
import { getBrandSiteConfig, getBrandSiteUrl } from '@/lib/brand/site-branding'
import {
  formatAktsiiCatalogBlockSubtitleRu,
  formatProductsCountRu,
} from '@/lib/ru-product-count'
import { countPublicGiftPromotions } from '@/services/gift-promotion.service'

const SprintPowerBlock = nextDynamic(
  () => import('@/components/site/sprint-power-block').then((m) => ({ default: m.SprintPowerBlock })),
  { ssr: true }
)

const PartnersBlock = nextDynamic(
  () => import('@/components/site/partners-block').then((m) => ({ default: m.PartnersBlock })),
  { ssr: true }
)

const InnerHealthCrossBrandBlock = nextDynamic(
  () =>
    import('@/components/site/inner-health-cross-brand-block').then((m) => ({
      default: m.InnerHealthCrossBrandBlock,
    })),
  { ssr: true }
)

/** Fallback when CMS + seed defaults are empty; keep in sync with `crossBrand.text` for sprint-power in content-blocks-defaults. */
const INNER_HEALTH_SPRINT_CROSS_BRAND_BODY_FALLBACK =
  'Inner Health поддерживает здоровье, красоту и молодость, активное долголетие. В ассортименте — инновационные формы пептидного коллагена и суперфуды из грибов: ежовик гребенчатый, рейши, кордицепс, лисичка, траметес и другие виды — с дозировками и схемами приёма, опирающимися на исследования и практику превентивной медицины.'

const ReviewsCarousel = nextDynamic(
  () =>
    import('@/components/site/reviews-carousel').then((m) => ({ default: m.ReviewsCarousel })),
  { ssr: true }
)

const ReviewCtaBlock = nextDynamic(
  () => import('@/components/site/review-cta-block').then((m) => ({ default: m.ReviewCtaBlock })),
  { ssr: true }
)

function withTimeout<TValue>(promise: Promise<TValue>, timeoutMs: number, fallback: TValue): Promise<TValue> {
  return Promise.race([
    promise,
    new Promise<TValue>((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs)
    }),
  ])
}

export async function generateMetadata(
  _props: unknown,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const headerStore = await headers()
  const activeBrand = resolveSiteBrand({
    forwardedBrand: headerStore.get('x-brand'),
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })
  const siteConfig = getBrandSiteConfig(activeBrand)
  const siteUrl = getBrandSiteUrl(activeBrand)

  if (activeBrand === 'sprint-power') {
    return {
      title: 'Главная',
      description:
        'Sprint Power: спортивное питание и нутриенты для силы, восстановления и результата.',
      alternates: { canonical: `${siteUrl}/` },
      openGraph: {
        title: 'Sprint Power — спортивное питание',
        description:
          'Линейка спортивного питания Sprint Power: протеин, восстановление, продукты для активной формы.',
        url: `${siteUrl}/`,
      },
    }
  }

  return {
    title: 'Главная',
    description:
      'Inner Health: нутриенты, коллаген, грибные комплексы и здоровое питание. Акции, доставка по России, сертифицированная продукция.',
    alternates: { canonical: `${siteUrl}/` },
    openGraph: {
      title: `${siteConfig.title} — нутриенты и здоровое питание`,
      description:
        'Интернет-магазин нутриентов и продуктов для здоровья: каталог, новости и выгодные предложения.',
      url: `${siteUrl}/`,
    },
  }
}

export const revalidate = 300
export const dynamic = 'force-dynamic'

const HOME_CATEGORY_CATALOG_INCLUDE = {
  _count: {
    select: {
      products: {
        where: { product: { isDraft: false } },
      },
    },
  },
} as const

/** Type-only probe — не вызывать; нужен для вывода типа категории с `include` без импорта `Prisma`. */
async function __typeProbeHomeCategoryWithCounts() {
  return prisma.category.findMany({
    include: HOME_CATEGORY_CATALOG_INCLUDE,
    take: 0,
  })
}

type HomeCategoryWithProductCount = Awaited<
  ReturnType<typeof __typeProbeHomeCategoryWithCounts>
>[number]

/** Type-only probe для карточки Sprint на главной. */
async function __typeProbeSprintHomeProductRow() {
  return prisma.product.findMany({
    select: {
      id: true,
      title: true,
      price: true,
      photo: true,
      slug: true,
      brand: true,
    },
    take: 0,
  })
}

type SprintHomeProductRow = Awaited<ReturnType<typeof __typeProbeSprintHomeProductRow>>[number]

type CategoryWhereInput = NonNullable<Parameters<typeof prisma.category.findMany>[0]>['where']

type PostWhereInput = NonNullable<Parameters<typeof prisma.post.findMany>[0]>['where']

type HomePostTeaser = {
  id: string
  title: string
  slug: string
  previewImage: string | null
}

type HomeProductCardRow = Awaited<ReturnType<typeof productService.getProductsForHomeInBrandScope>>[number]

type ApprovedReviewRow = Awaited<ReturnType<typeof reviewService.getApprovedReviews>>[number]

type HomeReview = {
  id: string
  authorName: string
  socialLink: string | null
  text: string
  imageUrl: string | null
  createdAt: string
}

type HomeDataPayload = {
  categories: HomeCategoryWithProductCount[]
  newProducts: HomeProductCardRow[]
  newsPosts: HomePostTeaser[]
  articlePosts: HomePostTeaser[]
  reviews: HomeReview[]
  publicGiftPromotionCount: number
}

function getBlockByKey(blocks: ContentBlockResolved[], key: string): ContentBlockResolved | null {
  return blocks.find((block) => block.key === key) ?? null
}

function parseAffirmativeContentBlockFlag(raw: string | null | undefined): boolean {
  if (raw == null) return false
  const v = raw.trim().toLowerCase()
  if (v.length === 0) return false
  return v === '1' || v === 'true' || v === 'yes' || v === 'y' || v === 'on' || v === 'да'
}

function getBlockText(blocks: ContentBlockResolved[], key: string, fallback: string): string {
  const text = getBlockByKey(blocks, key)?.text?.trim()
  return text && text.length > 0 ? text : fallback
}

function getBlockTextForBrand(
  blocks: ContentBlockResolved[],
  page: string,
  key: string,
  brandId: 'inner' | 'sprint-power',
  fallback: string
): string {
  const brandDefault = getDefaultBlockForPageBrand(page, key, brandId)?.text?.trim()
  return getBlockText(blocks, key, brandDefault && brandDefault.length > 0 ? brandDefault : fallback)
}

function getHowToOrderContent(blocks: ContentBlockResolved[]) {
  const title = getBlockText(blocks, 'howToOrder.title', 'Как заказать')
  const steps = [
    {
      title: getBlockText(blocks, 'howToOrder.step1.title', 'Выберите товары'),
      text: getBlockText(
        blocks,
        'howToOrder.step1.text',
        'Добавьте позиции в корзину из каталога или оформите «в 1 клик» на карточке товара.'
      ),
      href: getBlockText(blocks, 'howToOrder.step1.href', '/catalog'),
      linkLabel: getBlockText(blocks, 'howToOrder.step1.linkLabel', 'В каталог'),
    },
    {
      title: getBlockText(blocks, 'howToOrder.step2.title', 'Оформите заказ'),
      text: getBlockText(
        blocks,
        'howToOrder.step2.text',
        'Укажите контакты, способ доставки СДЭК (ПВЗ или курьер) и оплату через ЮKassa.'
      ),
      href: getBlockText(blocks, 'howToOrder.step2.href', '/faq'),
      linkLabel: getBlockText(blocks, 'howToOrder.step2.linkLabel', 'Вопросы о доставке'),
    },
    {
      title: getBlockText(blocks, 'howToOrder.step3.title', 'Получите и пользуйтесь'),
      text: getBlockText(
        blocks,
        'howToOrder.step3.text',
        'Отслеживайте отправление, при необходимости свяжитесь с нами через раздел контактов.'
      ),
      href: getBlockText(blocks, 'howToOrder.step3.href', '/contacts'),
      linkLabel: getBlockText(blocks, 'howToOrder.step3.linkLabel', 'Контакты'),
    },
  ]

  return { title, steps }
}

async function getHomeData(activeBrand: 'inner' | 'sprint-power'): Promise<HomeDataPayload> {
  const dbTimeoutMs = 2500
  const dbBrand = resolveDbBrand(activeBrand)
  const categoryScopeWhere: CategoryWhereInput = {
    brand: dbBrand,
    ...(activeBrand === 'sprint-power'
      ? { slug: { startsWith: 'sp-' } }
      : { slug: { not: { startsWith: 'sp-' } } }),
  }
  const postScopeWhere: PostWhereInput =
    activeBrand === 'sprint-power'
      ? { slug: { startsWith: 'sp-' } }
      : { slug: { not: { startsWith: 'sp-' } } }
  const emptyCategories = [] as HomeCategoryWithProductCount[]
  const emptyHomeProducts = [] as HomeProductCardRow[]
  const emptyHomePosts = [] as HomePostTeaser[]
  const emptyApprovedReviews = [] as ApprovedReviewRow[]
  const [categories, publicGiftPromotionCount] = await Promise.all([
    (async (): Promise<HomeCategoryWithProductCount[]> => {
      try {
        const categoriesForBlock = await withTimeout(
          prisma.category.findMany({
            where: { showInCategoriesBlock: true, ...categoryScopeWhere },
            orderBy: { sortOrder: 'asc' },
            include: HOME_CATEGORY_CATALOG_INCLUDE,
          }),
          dbTimeoutMs,
          emptyCategories
        )

        if (categoriesForBlock.length > 0) return categoriesForBlock

        // Fallback: показываем хотя бы часть категорий, чтобы главный блок не пропадал
        return withTimeout(
          prisma.category.findMany({
            where: categoryScopeWhere,
            orderBy: { sortOrder: 'asc' },
            include: HOME_CATEGORY_CATALOG_INCLUDE,
          }),
          dbTimeoutMs,
          emptyCategories
        )
      } catch {
        return emptyCategories
      }
    })(),
    withTimeout(countPublicGiftPromotions(new Date(), activeBrand), dbTimeoutMs, 0),
  ])

  const [newProductsResult, newsPostsResult, articlePostsResult, approvedReviewsResult] =
    await Promise.allSettled([
      withTimeout(productService.getProductsForHomeInBrandScope(8, activeBrand), dbTimeoutMs, emptyHomeProducts),
      withTimeout(
        prisma.post.findMany({
          where: { published: true, type: 'news', ...postScopeWhere } as PostWhereInput,
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, title: true, slug: true, previewImage: true },
        }),
        dbTimeoutMs,
        emptyHomePosts
      ),
      withTimeout(
        prisma.post.findMany({
          where: { published: true, type: 'article', ...postScopeWhere } as PostWhereInput,
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, title: true, slug: true, previewImage: true },
        }),
        dbTimeoutMs,
        emptyHomePosts
      ),
      withTimeout(
        reviewService.getApprovedReviews(activeBrand).then((items) => items.slice(0, 6)),
        dbTimeoutMs,
        emptyApprovedReviews
      ),
    ])

  const newProducts =
    newProductsResult.status === 'fulfilled' ? newProductsResult.value : []
  const newsPosts =
    newsPostsResult.status === 'fulfilled' ? newsPostsResult.value : []
  const articlePosts =
    articlePostsResult.status === 'fulfilled' ? articlePostsResult.value : []
  const approvedReviews =
    approvedReviewsResult.status === 'fulfilled' ? approvedReviewsResult.value : []

  const reviews: HomeReview[] = approvedReviews.map((r) => ({
    id: r.id,
    authorName: r.authorName,
    socialLink: r.socialLink,
    text: r.text,
    imageUrl: r.imageUrl,
    createdAt: r.createdAt.toISOString(),
  }))

  return { categories, newProducts, newsPosts, articlePosts, reviews, publicGiftPromotionCount }
}

type SprintHomeData = {
  products: Array<{
    id: string
    title: string
    price: number
    photo: string | null
    slug: string | null
    brand: string | null
  }>
  featuredProduct: {
    id: string
    title: string
    price: number
    photo: string | null
    slug: string | null
    brand: string | null
  } | null
  categories: Array<{
    id: string
    title: string
    slug: string
    image: string | null
    catalogTeaser: string | null
    _count: { products: number }
  }>
  reviews: Array<{
    id: string
    authorName: string
    socialLink: string | null
    text: string
  }>
  newsPosts: Array<{
    id: string
    title: string
    slug: string
    previewImage: string | null
  }>
  articlePosts: Array<{
    id: string
    title: string
    slug: string
    previewImage: string | null
  }>
  publicGiftPromotionCount: number
}

async function getSprintHomeData(): Promise<SprintHomeData> {
  const dbTimeoutMs = 2500
  const dbBrand = resolveDbBrand('sprint-power')
  const emptySprintProducts = [] as SprintHomeProductRow[]
  const emptySprintCategoryRows = [] as HomeCategoryWithProductCount[]
  const emptySprintReviews = [] as SprintHomeData['reviews']
  const emptySprintPosts = [] as SprintHomeData['newsPosts']

  const [products, categories, reviews, newsPosts, articlePosts, publicGiftPromotionCount] =
    await Promise.all([
      withTimeout(
        prisma.product.findMany({
          where: {
            isDraft: false,
            brand: SPRINT_POWER_PRODUCT_BRAND,
            isFeaturedInNewArrivals: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 2,
          select: {
            id: true,
            title: true,
            price: true,
            photo: true,
            slug: true,
            brand: true,
          },
        }),
        dbTimeoutMs,
        emptySprintProducts
      ),
      (async (): Promise<SprintHomeData['categories']> => {
        try {
          let rows: HomeCategoryWithProductCount[] = await withTimeout(
            prisma.category.findMany({
              where: { showInCategoriesBlock: true, brand: dbBrand },
              orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
              include: HOME_CATEGORY_CATALOG_INCLUDE,
            }),
            dbTimeoutMs,
            emptySprintCategoryRows
          )
          if (rows.length === 0) {
            rows = await withTimeout(
              prisma.category.findMany({
                where: { brand: dbBrand },
                orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
                include: HOME_CATEGORY_CATALOG_INCLUDE,
              }),
              dbTimeoutMs,
              emptySprintCategoryRows
            )
          }
          if (rows.length === 0) {
            rows = await withTimeout(
              prisma.category.findMany({
                where: {
                  showInCategoriesBlock: true,
                  brand: 'inner',
                  slug: { startsWith: 'sp-' },
                },
                orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
                include: HOME_CATEGORY_CATALOG_INCLUDE,
              }),
              dbTimeoutMs,
              emptySprintCategoryRows
            )
          }
          if (rows.length === 0) {
            rows = await withTimeout(
              prisma.category.findMany({
                where: { brand: 'inner', slug: { startsWith: 'sp-' } },
                orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
                include: HOME_CATEGORY_CATALOG_INCLUDE,
              }),
              dbTimeoutMs,
              emptySprintCategoryRows
            )
          }
          const filtered = filterCatalogBlockCategories(rows, { brandId: 'sprint-power' })
          return filtered.map((c) => ({
            id: c.id,
            title: c.title,
            slug: c.slug,
            image: c.image ?? null,
            catalogTeaser: c.catalogTeaser ?? null,
            _count: { products: c._count.products },
          }))
        } catch {
          return []
        }
      })(),
      withTimeout(
        reviewService.getApprovedReviews('sprint-power').then((items) =>
          items.slice(0, 2).map((item) => ({
            id: item.id,
            authorName: item.authorName,
            socialLink: item.socialLink,
            text: item.text,
          }))
        ),
        dbTimeoutMs,
        emptySprintReviews
      ),
      withTimeout(
        prisma.post.findMany({
          where: {
            published: true,
            type: 'news',
            slug: { startsWith: 'sp-' },
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, title: true, slug: true, previewImage: true },
        }),
        dbTimeoutMs,
        emptySprintPosts
      ),
      withTimeout(
        prisma.post.findMany({
          where: {
            published: true,
            type: 'article',
            slug: { startsWith: 'sp-' },
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, title: true, slug: true, previewImage: true },
        }),
        dbTimeoutMs,
        emptySprintPosts
      ),
      withTimeout(countPublicGiftPromotions(new Date(), 'sprint-power'), dbTimeoutMs, 0),
    ])

  const featuredProduct =
    products[0] ??
    ((await withTimeout(
      prisma.product.findFirst({
        where: {
          isDraft: false,
          brand: SPRINT_POWER_PRODUCT_BRAND,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          price: true,
          photo: true,
          slug: true,
          brand: true,
        },
      }),
      dbTimeoutMs,
      null
    )) as SprintHomeData['featuredProduct'])

  return {
    products,
    featuredProduct,
    categories,
    reviews,
    newsPosts,
    articlePosts,
    publicGiftPromotionCount,
  }
}

function SprintPowerHome({
  data,
  blocks,
  faqItems,
  categoryTitleFont,
}: {
  data: SprintHomeData
  blocks: ContentBlockResolved[]
  faqItems: ReadonlyArray<{ id: string; question: string; answer: string }>
  categoryTitleFont: string
}) {
  const heroProduct = data.featuredProduct
  const heroImage = heroProduct?.photo ?? null
  const heroFeaturedHref = heroProduct?.slug ? `/product/${heroProduct.slug}` : '/catalog'
  const innerSiteUrl = getBrandSiteUrl('inner')
  const markers = [
    getBlockTextForBrand(blocks, 'home', 'markers.item1', 'sprint-power', 'GMP и HACCP стандарты'),
    getBlockTextForBrand(blocks, 'home', 'markers.item2', 'sprint-power', 'Прозрачный состав'),
    getBlockTextForBrand(blocks, 'home', 'markers.item3', 'sprint-power', 'Регулярные обзоры'),
  ]
  const reviewsCtaHref = getBlockTextForBrand(blocks, 'home', 'reviewsCta.href', 'sprint-power', '/otzyvy')
  const showSprintHomeNewsBlock =
    data.newsPosts.length > 0 ||
    parseAffirmativeContentBlockFlag(getBlockByKey(blocks, 'home.news.showWhenEmpty')?.text)
  const showSprintHomeArticlesBlock =
    data.articlePosts.length > 0 ||
    parseAffirmativeContentBlockFlag(getBlockByKey(blocks, 'home.articles.showWhenEmpty')?.text)

  return (
    <>
      <section className="bg-[#060A14] py-10 md:py-12">
        <AdaptiveContainer maxWidth="full">
          <div className="space-y-6 rounded-2xl bg-[#060A14]">
          <div className="grid gap-6 rounded-3xl bg-[#0A1128] p-6 md:grid-cols-[1.2fr_0.8fr] md:p-10">
            <div className="space-y-4">
              <p className="text-xs font-bold tracking-[0.16em] text-[#7AA2FF]">
                {getBlockTextForBrand(blocks, 'home', 'hero.badge', 'sprint-power', 'SPRINT POWER')}
              </p>
              <h1 className="max-w-xl text-3xl font-extrabold leading-tight text-white md:text-5xl">
                {getBlockTextForBrand(
                  blocks,
                  'home',
                  'hero.title',
                  'sprint-power',
                  'Почувствуй разницу с первой тренировки'
                )}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                {getBlockTextForBrand(
                  blocks,
                  'home',
                  'hero.subtitle',
                  'sprint-power',
                  'Научные формулы для силы, восстановления и защиты суставов. Без лактозы. Без компромиссов.'
                )}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/catalog"
                  className="rounded-full bg-[#3B82F6] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
                >
                  {getBlockTextForBrand(blocks, 'home', 'hero.cta.primary', 'sprint-power', 'Выбрать продукт')}
                </Link>
                <Link
                  href="/otzyvy"
                  className="rounded-full border border-slate-600 px-5 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-slate-400 hover:bg-slate-800"
                >
                  {getBlockTextForBrand(blocks, 'home', 'hero.cta.secondary', 'sprint-power', 'Читать отзывы')}
                </Link>
              </div>
            </div>
            <Link
              href={heroFeaturedHref}
              className="group flex min-h-[240px] rounded-2xl border border-slate-700 bg-cover bg-center p-5 transition-colors hover:border-slate-500"
              style={
                heroImage
                  ? { backgroundImage: `url('${heroImage}')` }
                  : { backgroundImage: 'linear-gradient(135deg, #0b132b 0%, #1c2541 100%)' }
              }
            >
              <div className="mt-auto rounded-xl bg-black/40 p-3 text-xs text-slate-100 transition-colors group-hover:bg-black/50">
                {getBlockTextForBrand(
                  blocks,
                  'home',
                  'hero.featured',
                  'sprint-power',
                  'Hydro Protein - флагман линейки'
                )}
              </div>
            </Link>
          </div>

          {data.products.length > 0 && (
            <div className="rounded-3xl bg-[#0F172A] p-6 md:p-8">
              <h2 className="mb-4 text-2xl font-bold text-slate-100">
                {getBlockTextForBrand(blocks, 'home', 'hits.title', 'sprint-power', 'Хиты продаж')}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {data.products.map((product) => (
                  <div key={product.id} className="rounded-2xl bg-[#1E293B] p-3">
                    {product.photo ? (
                      <div className="relative mb-3 h-24 overflow-hidden rounded-lg">
                        <Image src={product.photo} alt={product.title} fill className="object-cover" />
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-100">{product.title}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#7AA2FF]">{product.price} ₽</span>
                        <Link
                          href={product.slug ? `/product/${product.slug}` : '/catalog'}
                          className="rounded-full bg-[#3B82F6] px-4 py-1.5 text-xs font-semibold text-white"
                        >
                          Купить
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 rounded-3xl bg-white p-6 md:grid-cols-[1fr_360px] md:p-8">
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900">
                {getBlockTextForBrand(blocks, 'home', 'reviews.title', 'sprint-power', 'Отзывы спортсменов')}
              </h3>
              {data.reviews.map((review) => (
                <div key={review.id} className="rounded-xl bg-slate-50 px-4 py-4">
                  <p className="whitespace-pre-wrap text-[15px] font-normal leading-[1.5] text-slate-800">
                    {review.text}
                  </p>
                  {review.socialLink ? (
                    <a
                      href={review.socialLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex text-[13px] font-semibold text-slate-500 transition-colors hover:text-slate-700 hover:underline"
                    >
                      {review.authorName}
                    </a>
                  ) : (
                    <p className="mt-2 text-[13px] font-semibold text-slate-500">{review.authorName}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-slate-900">
                {getBlockTextForBrand(
                  blocks,
                  'home',
                  'markers.title',
                  'sprint-power',
                  'Доверительные маркеры'
                )}
              </h3>
              {markers.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700"
                >
                  <CheckCircle className="h-5 w-5 shrink-0 text-[#3B82F6]" aria-hidden />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-[#22304F] bg-[#0C1730] p-6 md:p-8">
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[#3B82F6]/10 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7AA2FF]">
                  Отзывы и форма
                </p>
                <h3 className="text-2xl font-bold text-white md:text-3xl">
                  {getBlockTextForBrand(
                    blocks,
                    'home',
                    'reviewsCta.title',
                    'sprint-power',
                    'Реальные отзывы о Sprint Power'
                  )}
                </h3>
                <p className="text-sm leading-6 text-slate-300 md:text-base">
                  {getBlockTextForBrand(
                    blocks,
                    'home',
                    'reviewsCta.text',
                    'sprint-power',
                    'На странице отзывов можно посмотреть все отзывы и сразу оставить свой после покупки.'
                  )}
                </p>
              </div>
              <Link
                href={reviewsCtaHref}
                className="inline-flex items-center justify-center rounded-full bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] md:shrink-0"
              >
                {getBlockTextForBrand(
                  blocks,
                  'home',
                  'reviewsCta.buttonLabel',
                  'sprint-power',
                  'Перейти к отзывам'
                )}
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-700/40 bg-[#060A14] p-6 md:p-8">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <h3 className="text-2xl font-bold text-slate-100">
                {getBlockTextForBrand(blocks, 'home', 'lineup.title', 'sprint-power', 'Вся линейка')}
              </h3>
              <Link
                href="/catalog"
                className="inline-flex w-fit shrink-0 items-center justify-center rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-[#7AA2FF] hover:text-white"
              >
                Весь каталог
              </Link>
            </div>
            {data.categories.length > 0 ? (
              <FluidGrid cols={1} colsTablet={2} colsDesktop={2} gap={4} adaptiveGap>
                {data.categories.map((category) => {
                  const bgImage = resolveCategoryImage(category.slug, category.image, {
                    sprintFallback: true,
                  })
                  const imagePosition = getCategoryImageObjectPosition(category.slug)
                  return (
                    <Link
                      key={category.id}
                      href={`/catalog/${category.slug}`}
                      className="block rounded-2xl transition-shadow hover:border-[#7AA2FF] hover:shadow-[0_0_0_1px_rgba(122,162,255,0.35)]"
                    >
                      <TiltCard variant="dark">
                        <div
                          className={`relative flex aspect-[16/12] flex-col items-center justify-center overflow-hidden rounded-2xl p-5 text-center ${
                            !bgImage ? 'bg-[#0F172A]' : ''
                          }`}
                        >
                          {bgImage ? (
                            <>
                              <Image
                                src={bgImage}
                                alt=""
                                fill
                                className={imagePosition}
                                sizes="(max-width: 768px) 100vw, 50vw"
                              />
                              <div
                                className="absolute inset-0 rounded-2xl bg-linear-to-b from-black/25 to-black/50"
                                aria-hidden
                              />
                            </>
                          ) : null}
                          <span
                            className={`relative z-10 block text-balance font-semibold uppercase leading-snug tracking-wide drop-shadow-md ${categoryTitleFont} text-base sm:text-lg ${
                              bgImage ? 'text-white' : 'text-slate-100'
                            }`}
                          >
                            {category.title}
                          </span>
                          <span
                            className={`relative z-10 mt-2 text-sm font-medium normal-case tracking-normal drop-shadow ${categoryTitleFont} ${
                              bgImage ? 'text-white/90' : 'text-slate-400'
                            }`}
                          >
                            {category.slug === 'aktsii'
                              ? formatAktsiiCatalogBlockSubtitleRu(
                                  category._count.products,
                                  data.publicGiftPromotionCount
                                )
                              : formatProductsCountRu(category._count.products)}
                          </span>
                        </div>
                      </TiltCard>
                    </Link>
                  )
                })}
              </FluidGrid>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-600/70 bg-[#1E293B]/50 px-4 py-6 text-center">
                <p className="text-sm leading-6 text-slate-400">
                  Разделы каталога настраиваются в админке. Пока можно перейти в полный каталог и выбрать
                  продукт там.
                </p>
              </div>
            )}
          </div>

          {showSprintHomeNewsBlock ? (
            <div className="rounded-3xl border border-[#1B2946] bg-[#0A1128] p-6 md:p-8">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7AA2FF]">
                    {getBlockTextForBrand(blocks, 'home', 'newsBlock.eyebrow', 'sprint-power', 'Контент Sprint')}
                  </p>
                  <h3 className="text-2xl font-bold text-white">
                    {getBlockTextForBrand(blocks, 'home', 'newsBlock.title', 'sprint-power', 'Новости')}
                  </h3>
                  <p className="max-w-2xl text-sm leading-6 text-slate-300">
                    {getBlockTextForBrand(
                      blocks,
                      'home',
                      'home.news.subtitle',
                      'sprint-power',
                      'Запуски продуктов, обновления линейки и события бренда Sprint Power.'
                    )}
                  </p>
                </div>
                <Link
                  href="/news"
                  className="hidden shrink-0 rounded-full border border-[#355188] px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-[#3B82F6] hover:text-white md:inline-flex"
                >
                  Все новости
                </Link>
              </div>
              {data.newsPosts.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {data.newsPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/news/${post.slug}`}
                      className="group overflow-hidden rounded-2xl border border-[#1B2946] bg-[#0F172A] transition-all hover:border-[#3B82F6] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
                    >
                      <div className="relative aspect-[16/10] bg-slate-900">
                        {post.previewImage ? (
                          <Image
                            src={post.previewImage.startsWith('/') ? post.previewImage : `/${post.previewImage}`}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-linear-to-br from-[#12203D] to-[#0B1327]" />
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-[#060A14] via-[#060A14]/40 to-transparent" />
                        <span className="absolute left-4 top-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100 backdrop-blur">
                          Новость
                        </span>
                      </div>
                      <div className="space-y-3 p-5">
                        <p className="line-clamp-3 text-base font-semibold leading-6 text-white transition-colors group-hover:text-[#9CC0FF]">
                          {post.title}
                        </p>
                        <p className="text-sm font-medium text-[#7AA2FF]">Открыть новость</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Пока нет новостей.</p>
              )}
            </div>
          ) : null}

          {showSprintHomeArticlesBlock ? (
            <div className="rounded-3xl border border-[#D8E4FF] bg-[#EEF4FF] p-6 md:p-8">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#335CFF]">
                    {getBlockTextForBrand(blocks, 'home', 'articlesBlock.eyebrow', 'sprint-power', 'Материалы и гайды')}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {getBlockTextForBrand(blocks, 'home', 'articlesBlock.title', 'sprint-power', 'Статьи')}
                  </h3>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600">
                    {getBlockTextForBrand(
                      blocks,
                      'home',
                      'home.articles.subtitle',
                      'sprint-power',
                      'Разборы составов, рекомендации по приёму и материалы про тренировки и восстановление.'
                    )}
                  </p>
                </div>
                <Link
                  href="/informaciya"
                  className="hidden shrink-0 rounded-full border border-[#B5C9FF] px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-[#335CFF] hover:text-[#1D4ED8] md:inline-flex"
                >
                  Все статьи
                </Link>
              </div>
              {data.articlePosts.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-3">
                  {data.articlePosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/informaciya/${post.slug}`}
                      className="group overflow-hidden rounded-2xl border border-[#D5E2FF] bg-white transition-all hover:border-[#7AA2FF] hover:shadow-[0_8px_30px_rgba(51,92,255,0.08)]"
                    >
                      <div className="relative aspect-[16/10] bg-slate-100">
                        {post.previewImage ? (
                          <Image
                            src={post.previewImage.startsWith('/') ? post.previewImage : `/${post.previewImage}`}
                            alt={post.title}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-linear-to-br from-[#E8EEFF] to-[#D6E4FF]" />
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-[#0F172A]/20 via-transparent to-transparent" />
                        <span className="absolute left-4 top-4 inline-flex rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-900 backdrop-blur">
                          Статья
                        </span>
                      </div>
                      <div className="space-y-3 p-5">
                        <p className="line-clamp-3 text-base font-semibold leading-6 text-slate-900 transition-colors group-hover:text-[#1D4ED8]">
                          {post.title}
                        </p>
                        <p className="text-sm font-medium text-slate-500">Читать материал</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Пока нет статей.</p>
              )}
            </div>
          ) : null}
        </div>
      </AdaptiveContainer>
    </section>

    <InnerHealthCrossBrandBlock
      title={getBlockTextForBrand(blocks, 'home', 'crossBrand.title', 'sprint-power', 'Inner Health')}
      body={getBlockTextForBrand(
        blocks,
        'home',
        'crossBrand.text',
        'sprint-power',
        INNER_HEALTH_SPRINT_CROSS_BRAND_BODY_FALLBACK
      )}
      ctaLabel={getBlockTextForBrand(
        blocks,
        'home',
        'crossBrand.cta',
        'sprint-power',
        'Перейти на сайт'
      )}
      innerSiteUrl={innerSiteUrl}
    />

    <section className="bg-[#060A14] py-10 md:py-12">
      <AdaptiveContainer maxWidth="full">
        <div className="space-y-6 rounded-2xl bg-[#060A14]">
          <PartnersBlock brand="sprint-power" />

          <div className="rounded-3xl bg-white p-6 md:p-8">
            <h3 className="mb-4 text-2xl font-bold text-slate-900">
              {getBlockTextForBrand(blocks, 'home', 'faq.title', 'sprint-power', 'Частые вопросы')}
            </h3>
            <FaqAccordion items={faqItems.slice(0, 3)} variant="compact" />
            <Link
              href="/faq"
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
            >
              {getBlockTextForBrand(
                blocks,
                'home',
                'faq.cta',
                'sprint-power',
                'Посмотреть ответы на все частозадаваемые вопросы'
              )}
            </Link>
          </div>
        </div>
      </AdaptiveContainer>
    </section>
    </>
  )
}

export default async function HomePage() {
  const headerStore = await headers()
  const dbTimeoutMs = 2500
  const activeBrand = resolveSiteBrand({
    forwardedBrand: headerStore.get('x-brand'),
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })

  if (activeBrand === 'sprint-power') {
    const emptySprintHomeData: SprintHomeData = {
      products: [],
      featuredProduct: null,
      categories: [],
      reviews: [],
      newsPosts: [],
      articlePosts: [],
      publicGiftPromotionCount: 0,
    }
    const emptySprintContentBlocks = [] as ContentBlockResolved[]
    const emptySprintFaqList = [] as Awaited<ReturnType<typeof faqService.getPublishedFaqItems>>
    const [sprintHomeData, sprintHomeBlocks, sprintFaqItems, sprintCatalogBlocks] = await Promise.all([
      withTimeout(getSprintHomeData(), dbTimeoutMs, emptySprintHomeData),
      withTimeout(getResolvedBlocksForPage('home', activeBrand), dbTimeoutMs, emptySprintContentBlocks),
      withTimeout(faqService.getPublishedFaqItems(activeBrand), dbTimeoutMs, emptySprintFaqList),
      withTimeout(getResolvedBlocksForPage('catalog', activeBrand), dbTimeoutMs, emptySprintContentBlocks),
    ])
    const categoriesFontBlock = getBlockByKey(sprintCatalogBlocks, 'categories.fontVariant')
    const categoryTitleFont =
      categoriesFontBlock?.text?.trim()?.toLowerCase() === 'sans'
        ? 'font-sans'
        : categoriesFontBlock?.text?.trim()?.toLowerCase() === 'script'
          ? 'font-script'
          : 'font-display'
    return (
      <SprintPowerHome
        data={sprintHomeData}
        blocks={sprintHomeBlocks}
        faqItems={sprintFaqItems}
        categoryTitleFont={categoryTitleFont}
      />
    )
  }

  const { categories, newProducts, newsPosts, articlePosts, reviews, publicGiftPromotionCount } =
    await getHomeData(activeBrand)
  const emptyInnerContentBlocks = [] as ContentBlockResolved[]
  const [homeBlocks, catalogBlocks, popup] = await Promise.all([
    withTimeout(getResolvedBlocksForPage('home', activeBrand), dbTimeoutMs, emptyInnerContentBlocks),
    withTimeout(getResolvedBlocksForPage('catalog', activeBrand), dbTimeoutMs, emptyInnerContentBlocks),
    withTimeout(getActiveSitePopup({ brandId: activeBrand }), dbTimeoutMs, null),
  ])

  const newSubtitle = getBlockByKey(homeBlocks, 'home.new.subtitle')
  const newsSubtitle = getBlockByKey(homeBlocks, 'home.news.subtitle')
  const catalogSubtitle = getBlockByKey(homeBlocks, 'home.catalog.subtitle')
  const articlesSubtitle = getBlockByKey(homeBlocks, 'home.articles.subtitle')
  const reviewsSubtitle = getBlockByKey(homeBlocks, 'home.reviews.subtitle')
  const categoriesFontBlock = getBlockByKey(catalogBlocks, 'categories.fontVariant')

  const heroBadge = getBlockByKey(homeBlocks, 'hero.badge')
  const heroTitle = getBlockByKey(homeBlocks, 'hero.title')
  const heroSubtitle = getBlockByKey(homeBlocks, 'hero.subtitle')
  const heroHighlight = getBlockByKey(homeBlocks, 'hero.title.highlight')
  const categoryTitleFont =
    categoriesFontBlock?.text?.trim()?.toLowerCase() === 'sans'
      ? 'font-sans'
      : categoriesFontBlock?.text?.trim()?.toLowerCase() === 'script'
        ? 'font-script'
        : 'font-display'

  const howToOrder = getHowToOrderContent(homeBlocks)
  const showHomeNewsSection =
    newsPosts.length > 0 ||
    parseAffirmativeContentBlockFlag(getBlockByKey(homeBlocks, 'home.news.showWhenEmpty')?.text)
  const showHomeArticlesSection =
    articlePosts.length > 0 ||
    parseAffirmativeContentBlockFlag(getBlockByKey(homeBlocks, 'home.articles.showWhenEmpty')?.text)

  return (
    <div>
      <HomePopupClient
        popup={
          popup
            ? {
                id: popup.id,
                title: popup.title,
                isEnabled: popup.isEnabled,
                richJson: popup.richJson as any,
                imageUrl: popup.imageUrl,
                ctaLabel: popup.ctaLabel,
                ctaUrl: popup.ctaUrl,
                delaySeconds: popup.delaySeconds,
                hideForDays: popup.hideForDays,
                autoCloseSeconds: popup.autoCloseSeconds,
              }
            : null
        }
      />
      <HeroBlock
        badge={heroBadge}
        title={heroTitle}
        subtitle={heroSubtitle}
        highlight={heroHighlight}
      />

      {/* Баннер — бегущая строка Sprint Power */}
      <SprintPowerBanner />

      {newProducts.length > 0 && (
        <>
          {/* Новинки — фоны сохраняем */}
          <section className="py-16 sm:py-24 lg:py-28 xl:py-32 2xl:py-36 3xl:py-40 4xl:py-44 bg-white">
            <AdaptiveContainer maxWidth="default">
              <div className="flex justify-between items-end mb-10 sm:mb-12">
                <div className="space-y-1">
                  <Heading2 className="font-semibold tracking-tighter text-slate-900">
                    Новинки ассортимента
                  </Heading2>
                  <p className="max-w-md text-sm font-semibold text-slate-500 2xl:text-base 3xl:text-lg">
                    {newSubtitle?.text ??
                      'Самые актуальные разработки для вашего здоровья и энергии'}
                  </p>
                </div>
                <Link
                  href="/catalog"
                  className="flex shrink-0 items-center gap-2 text-xs font-semibold tracking-widest text-action-blue uppercase transition-all hover:gap-3 2xl:text-sm"
                >
                  СМОТРЕТЬ ВСЁ <NavArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              </div>
              {newProducts.length <= 1 ? (
                <div className="flex justify-center">
                  {newProducts[0] && (
                    <div className="w-full max-w-[14.4rem] md:max-w-[16.8rem]">
                      <ProductCard
                        key={newProducts[0].id}
                        id={newProducts[0].id}
                        title={newProducts[0].title}
                        brand={newProducts[0].brand}
                        sku={newProducts[0].sku}
                        price={newProducts[0].price}
                        priceOld={newProducts[0].priceOld}
                        photo={newProducts[0].photo}
                        photos={'photos' in newProducts[0] ? newProducts[0].photos : undefined}
                        slug={newProducts[0].slug}
                        quantity={newProducts[0].quantity}
                        isPreorderEnabled={newProducts[0].isPreorderEnabled}
                        priority
                        blurDataURL={
                          'photos' in newProducts[0]
                            ? getFirstPhotoBlurDataURL(newProducts[0].photos)
                            : undefined
                        }
                      />
                    </div>
                  )}
                </div>
              ) : (
                <FluidGrid
                  cols={Math.min(2, newProducts.length || 1)}
                  colsTablet={Math.min(3, newProducts.length || 1)}
                  colsDesktop={Math.min(4, newProducts.length || 1)}
                  colsXl={5}
                  cols2xl={5}
                  cols3xl={6}
                  cols4xl={6}
                  gap="6"
                  adaptiveGap={false}
                  className="gap-6 md:gap-7 lg:gap-8 xl:gap-10 2xl:gap-12 3xl:gap-14 4xl:gap-16 5xl:gap-20 6xl:gap-24"
                  justify={newProducts.length < 4 ? 'center' : 'start'}
                >
                  {newProducts.map((p, index) => (
                    <ProductCard
                      key={p.id}
                      id={p.id}
                      title={p.title}
                      brand={p.brand}
                      sku={p.sku}
                      price={p.price}
                      priceOld={p.priceOld}
                      photo={p.photo}
                      photos={'photos' in p ? p.photos : undefined}
                      slug={p.slug}
                      quantity={p.quantity}
                      isPreorderEnabled={p.isPreorderEnabled}
                      priority={index < 2}
                      blurDataURL={'photos' in p ? getFirstPhotoBlurDataURL(p.photos) : undefined}
                    />
                  ))}
                </FluidGrid>
              )}
            </AdaptiveContainer>
          </section>
        </>
      )}
      {newProducts.length > 0 && <SpacingVertical size="lg" />}

      {/* Разделы каталога — фоны карточек сохраняем */}
      <section className="py-16 sm:py-24 lg:py-28 xl:py-32 2xl:py-36 3xl:py-40 4xl:py-44 bg-white">
        <AdaptiveContainer maxWidth="default">
          <ScrollReveal
            as="div"
            variant="fade-up"
            className="flex justify-between items-end mb-10 sm:mb-12"
          >
            <div className="space-y-1">
              <Heading2 className="font-semibold tracking-tighter text-slate-900">
                Разделы каталога
              </Heading2>
              <p className="text-sm font-light text-slate-500 2xl:text-base 3xl:text-lg">
                {catalogSubtitle?.text ??
                  'Выберите категорию для быстрого поиска нужного продукта'}
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal
            as="div"
            variant="fade-up"
          >
            <FluidGrid
              cols={2}
              colsTablet={3}
              colsDesktop={3}
              colsXl={3}
              cols2xl={3}
              cols3xl={3}
              cols4xl={3}
              gap={4}
              adaptiveGap
            >
            {filterCatalogBlockCategories(categories, { brandId: activeBrand }).map((cat) => {
                const bgImage = resolveCategoryImage(cat.slug, cat.image)
                const imagePosition = getCategoryImageObjectPosition(cat.slug)
                return (
                  <Link
                    key={cat.id}
                    href={`/catalog/${cat.slug}`}
                    className="block transition-shadow hover:shadow-md rounded-2xl hover:border-action-blue"
                  >
                    <TiltCard>
                      <div
                        className={`desktop-card-scale relative flex flex-col items-center justify-center overflow-hidden rounded-2xl text-center ${!bgImage ? 'bg-soft-background' : ''}`}
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
                          className={`relative z-10 block text-lg font-medium drop-shadow-md 2xl:text-xl 3xl:text-2xl ${categoryTitleFont} ${bgImage ? 'text-white' : 'text-text'}`}
                        >
                          {cat.title}
                        </span>
                        <span
                          className={`relative z-10 mt-1 text-sm font-medium drop-shadow 2xl:text-base ${categoryTitleFont} ${bgImage ? 'text-white/90' : 'text-gray-500'}`}
                        >
                          {cat.slug === 'aktsii'
                            ? formatAktsiiCatalogBlockSubtitleRu(
                                cat._count.products,
                                publicGiftPromotionCount
                              )
                            : formatProductsCountRu(cat._count.products)}
                        </span>
                      </div>
                    </TiltCard>
                  </Link>
                )
              })}
            </FluidGrid>
          </ScrollReveal>
          <div className="mt-8 text-center">
            <Link
              href="/catalog"
              className="desktop-button-scale inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-action-blue 2xl:text-base 3xl:px-10 3xl:py-5"
            >
              СМОТРЕТЬ ВЕСЬ КАТАЛОГ <NavArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </AdaptiveContainer>
      </section>
      <SpacingVertical size="lg" />

      <HowToOrderSteps
        showBorders={newProducts.length > 0}
        title={howToOrder.title}
        steps={howToOrder.steps}
      />
      {(showHomeNewsSection || showHomeArticlesSection) && <SpacingVertical size="lg" />}

      {showHomeNewsSection ? (
        <section
          id="news"
          className="bg-white py-16 sm:py-24 lg:py-28 xl:py-32 2xl:py-36 3xl:py-40 4xl:py-44 scroll-mt-24"
        >
          <AdaptiveContainer maxWidth="default">
            <div className="flex justify-between items-end mb-10 sm:mb-12">
              <div className="space-y-1">
                <Heading2 className="font-semibold tracking-tighter text-slate-900">Новости</Heading2>
                <p className="text-sm font-light text-slate-500 2xl:text-base 3xl:text-lg">
                  {newsSubtitle?.text ?? 'Актуальные события и обновления'}
                </p>
              </div>
              <Link href="/news" className="flex shrink-0 items-center gap-2 text-xs font-semibold tracking-widest text-action-blue uppercase transition-all hover:gap-3 2xl:text-sm">
                ВСЕ НОВОСТИ
                <NavArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
            {newsPosts.length > 0 ? (
              <ScrollReveal as="div" variant="fade-up">
                <FluidGrid
                  cols={1}
                  colsTablet={2}
                  colsDesktop={3}
                  colsXl={3}
                  cols2xl={3}
                  cols3xl={3}
                  cols4xl={3}
                  gap={4}
                  adaptiveGap
                >
                  {newsPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/news/${post.slug}`}
                      className="block transition-shadow hover:shadow-md rounded-2xl hover:border-action-blue"
                    >
                      <TiltCard>
                        <div className="desktop-card-scale relative flex flex-col justify-center overflow-hidden rounded-2xl bg-soft-background">
                          {post.previewImage && (
                            <>
                              <Image
                                src={post.previewImage}
                                alt={post.title}
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
                            <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold tracking-wide text-slate-900 2xl:text-sm">
                              Новость
                            </span>
                            <span className="block text-base sm:text-lg font-semibold tracking-tight text-white drop-shadow-md">
                              {post.title}
                            </span>
                          </div>
                        </div>
                      </TiltCard>
                    </Link>
                  ))}
                </FluidGrid>
              </ScrollReveal>
            ) : (
              <p className="text-gray-500">Пока нет новостей.</p>
            )}
          </AdaptiveContainer>
        </section>
      ) : null}
      {showHomeNewsSection && showHomeArticlesSection ? <SpacingVertical size="lg" /> : null}

      {showHomeArticlesSection ? (
        <section className="py-16 sm:py-24 lg:py-28 xl:py-32 2xl:py-36 3xl:py-40 4xl:py-44 bg-slate-50">
          <AdaptiveContainer maxWidth="default">
            <div className="flex justify-between items-end mb-10 sm:mb-12">
              <div className="space-y-1">
                <Heading2 className="font-semibold tracking-tighter text-slate-900">Статьи</Heading2>
                <p className="text-sm font-light text-slate-500 2xl:text-base 3xl:text-lg">
                  {articlesSubtitle?.text ?? 'Полезные материалы о здоровье и нутриентах'}
                </p>
              </div>
              <Link href="/informaciya" className="flex shrink-0 items-center gap-2 text-xs font-semibold tracking-widest text-action-blue uppercase transition-all hover:gap-3 2xl:text-sm">
                ВСЕ СТАТЬИ
                <NavArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
            {articlePosts.length > 0 ? (
              <ScrollReveal as="div" variant="fade-up">
                <FluidGrid
                  cols={1}
                  colsTablet={2}
                  colsDesktop={3}
                  colsXl={3}
                  cols2xl={3}
                  cols3xl={3}
                  cols4xl={3}
                  gap={4}
                  adaptiveGap
                >
                  {articlePosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/informaciya/${post.slug}`}
                      className="block transition-shadow hover:shadow-md rounded-2xl hover:border-action-blue"
                    >
                      <TiltCard>
                        <div className="desktop-card-scale relative flex flex-col justify-center overflow-hidden rounded-2xl bg-soft-background">
                          {post.previewImage && (
                            <>
                              <Image
                                src={post.previewImage}
                                alt={post.title}
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
                            <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold tracking-wide text-slate-900 2xl:text-sm">
                              Статья
                            </span>
                            <span className="block text-base sm:text-lg font-semibold tracking-tight text-white drop-shadow-md">
                              {post.title}
                            </span>
                          </div>
                        </div>
                      </TiltCard>
                    </Link>
                  ))}
                </FluidGrid>
              </ScrollReveal>
            ) : (
              <p className="text-gray-500">Пока нет статей.</p>
            )}
          </AdaptiveContainer>
        </section>
      ) : null}
      {/* No SpacingVertical here: margin would show main’s bg-white between two bg-slate-50 sections */}

      {/* Отзывы */}
      <section className="py-16 sm:py-24 lg:py-28 xl:py-32 2xl:py-36 3xl:py-40 4xl:py-44 bg-slate-50">
        <AdaptiveContainer maxWidth="default">
          <div className="flex justify-between items-end mb-10 sm:mb-12">
            <div className="space-y-1">
              <Heading2 className="font-semibold tracking-tighter text-slate-900">Отзывы</Heading2>
              <p className="text-sm font-light text-slate-500 2xl:text-base 3xl:text-lg">
                {reviewsSubtitle?.text ?? 'Мнения наших клиентов'}
              </p>
            </div>
            <Link href="/otzyvy" className="flex shrink-0 items-center gap-2 text-xs font-semibold tracking-widest text-action-blue uppercase transition-all hover:gap-3 2xl:text-sm">
              ВСЕ ОТЗЫВЫ <NavArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
          {reviews.length > 0 ? (
            <div className="space-y-10">
              <ReviewsCarousel reviews={reviews} />
              <ReviewCtaBlock />
            </div>
          ) : (
            <ReviewCtaBlock />
          )}
        </AdaptiveContainer>
      </section>

      {/* Блок Sprint Power */}
      <SprintPowerBlock />

      {/* Наши Партнёры */}
      <PartnersBlock brand={activeBrand} />
    </div>
  )
}
