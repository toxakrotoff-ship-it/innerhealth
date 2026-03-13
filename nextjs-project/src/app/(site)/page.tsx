import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import * as productService from '@/services/product.service'
import { ProductCard } from '@/components/site/product-card'
import { getFirstPhotoBlurDataURL } from '@/lib/product-photos'
import { HeroBlock } from '@/components/site/hero-block'
import { SprintPowerBanner } from '@/components/site/sprint-power-banner'
import { PostCard } from '@/components/site/post-card'
import {
  filterCatalogBlockCategories,
  getCategoryBackgroundImage,
  getCategoryImageObjectPosition,
} from '@/lib/catalog-categories'
import { TiltCard } from '@/components/ui/tilt-card'
import { ChevronRight } from 'lucide-react'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import {
  getResolvedBlocksForPage,
  type ContentBlockResolved,
} from '@/services/content-block.service'
import { Heading2 } from '@/components/ui/responsive-text'
import { SpacingVertical } from '@/components/ui/scalable-spacing'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

const SprintPowerBlock = dynamic(
  () => import('@/components/site/sprint-power-block').then((m) => ({ default: m.SprintPowerBlock })),
  { ssr: true }
)

const PartnersBlock = dynamic(
  () => import('@/components/site/partners-block').then((m) => ({ default: m.PartnersBlock })),
  { ssr: true }
)

const ReviewsCarousel = dynamic(
  () =>
    import('@/components/site/reviews-carousel').then((m) => ({ default: m.ReviewsCarousel })),
  { ssr: true }
)

const ReviewCtaBlock = dynamic(
  () => import('@/components/site/review-cta-block').then((m) => ({ default: m.ReviewCtaBlock })),
  { ssr: true }
)

export const revalidate = 300

type HomeReview = {
  id: string
  authorName: string
  socialLink: string | null
  text: string
  imageUrl: string | null
  createdAt: string
}

function getBlockByKey(blocks: ContentBlockResolved[], key: string): ContentBlockResolved | null {
  return blocks.find((block) => block.key === key) ?? null
}

async function getHomeData() {
  try {
    const [categories, newProducts, newsPosts, articlePosts, approvedReviews] =
      await Promise.all([
        prisma.category.findMany({
          where: { showInCategoriesBlock: true },
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: { products: true } } },
        }),
        productService.getProductsForHome(8),
        prisma.post.findMany({
          where: { published: true, type: 'news' } as Prisma.PostWhereInput,
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, title: true, slug: true, previewImage: true },
        }),
        prisma.post.findMany({
          where: { published: true, type: 'article' } as Prisma.PostWhereInput,
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, title: true, slug: true, previewImage: true },
        }),
        prisma.review.findMany({
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take: 6,
        }),
      ])
    const reviews: HomeReview[] = approvedReviews.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      socialLink: r.socialLink,
      text: r.text,
      imageUrl: r.imageUrl,
      createdAt: r.createdAt.toISOString(),
    }))
    return { categories, newProducts, newsPosts, articlePosts, reviews }
  } catch {
    return {
      categories: [],
      newProducts: [],
      newsPosts: [],
      articlePosts: [],
      reviews: [] as HomeReview[],
    }
  }
}

export default async function HomePage() {
  const { categories, newProducts, newsPosts, articlePosts, reviews } = await getHomeData()
  const [homeBlocks, catalogBlocks] = await Promise.all([
    getResolvedBlocksForPage('home'),
    getResolvedBlocksForPage('catalog'),
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

  return (
    <div>
      <HeroBlock
        badge={heroBadge}
        title={heroTitle}
        subtitle={heroSubtitle}
        highlight={heroHighlight}
      />

      {/* Баннер — бегущая строка Sprint Power */}
      <SprintPowerBanner />
      <SpacingVertical size="lg" />

      {/* Новинки — фоны сохраняем */}
      <section className="py-16 sm:py-24 lg:py-28 xl:py-32 2xl:py-36 3xl:py-40 4xl:py-44 bg-white">
        <AdaptiveContainer maxWidth="default">
          <div className="flex justify-between items-end mb-10 sm:mb-12">
            <div className="space-y-1">
              <Heading2 className="font-semibold tracking-tighter text-slate-900">
                Новинки ассортимента
              </Heading2>
              <p className="text-slate-500 text-sm font-semibold max-w-md">
                {newSubtitle?.text ??
                  'Самые актуальные разработки для вашего здоровья и энергии'}
              </p>
            </div>
            <Link href="/catalog" className="text-xs font-semibold tracking-widest uppercase text-action-blue flex items-center gap-2 hover:gap-3 transition-all shrink-0">
              СМОТРЕТЬ ВСЁ <ChevronRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
          {newProducts.length <= 1 ? (
            <div className="flex justify-center">
              {newProducts[0] && (
                <div className="w-full max-w-sm md:max-w-md">
                  <ProductCard
                    key={newProducts[0].id}
                    id={newProducts[0].id}
                    title={newProducts[0].title}
                    price={newProducts[0].price}
                    priceOld={newProducts[0].priceOld}
                    photo={newProducts[0].photo}
                    slug={newProducts[0].slug}
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
              colsXl={4}
              cols2xl={4}
              cols3xl={4}
              cols4xl={4}
              gap={4}
              adaptiveGap
              justify={newProducts.length < 4 ? 'center' : 'start'}
            >
              {newProducts.map((p, index) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  price={p.price}
                  priceOld={p.priceOld}
                  photo={p.photo}
                  slug={p.slug}
                  priority={index < 2}
                  blurDataURL={'photos' in p ? getFirstPhotoBlurDataURL(p.photos) : undefined}
                />
              ))}
            </FluidGrid>
          )}
        </AdaptiveContainer>
      </section>
      <SpacingVertical size="lg" />

      {/* Новости — делаем карточки в стиле категорий */}
      <section className="py-16 sm:py-24 lg:py-28 xl:py-32 2xl:py-36 3xl:py-40 4xl:py-44 bg-slate-50">
        <AdaptiveContainer maxWidth="default">
          <div className="flex justify-between items-end mb-10 sm:mb-12">
            <div className="space-y-1">
              <Heading2 className="font-semibold tracking-tighter text-slate-900">Новости</Heading2>
              <p className="text-slate-500 text-sm font-light">
                {newsSubtitle?.text ?? 'Актуальные события и обновления'}
              </p>
            </div>
            <Link href="/news" className="text-xs font-semibold tracking-widest uppercase text-action-blue flex items-center gap-2 hover:gap-3 transition-all shrink-0">
              ВСЕ НОВОСТИ
              <ChevronRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
          {newsPosts.length > 0 ? (
            <ScrollReveal as="div" variant="fade-up">
              <FluidGrid
                cols={1}
                colsTablet={2}
                colsDesktop={3}
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
                      <div className="relative flex min-h-[180px] flex-col justify-center p-6 rounded-2xl overflow-hidden bg-soft-background">
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
                          <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold tracking-wide text-slate-900">
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
      <SpacingVertical size="lg" />

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
              <p className="text-slate-500 text-sm font-light">
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
              gap={4}
              adaptiveGap
            >
            {filterCatalogBlockCategories(categories).map((cat) => {
                const bgImage = cat.image ?? getCategoryBackgroundImage(cat.slug)
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
          </ScrollReveal>
          <div className="mt-8 text-center">
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 text-white font-semibold text-sm px-8 py-4 hover:bg-action-blue transition-colors"
            >
              СМОТРЕТЬ ВЕСЬ КАТАЛОГ <ChevronRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </AdaptiveContainer>
      </section>
      <SpacingVertical size="lg" />

      {/* Статьи */}
      <section className="py-16 sm:py-24 lg:py-28 xl:py-32 2xl:py-36 3xl:py-40 4xl:py-44 bg-slate-50">
        <AdaptiveContainer maxWidth="default">
          <div className="flex justify-between items-end mb-10 sm:mb-12">
            <div className="space-y-1">
              <Heading2 className="font-semibold tracking-tighter text-slate-900">Статьи</Heading2>
              <p className="text-slate-500 text-sm font-light">
                {articlesSubtitle?.text ?? 'Полезные материалы о здоровье и нутриентах'}
              </p>
            </div>
            <Link href="/informaciya" className="text-xs font-semibold tracking-widest uppercase text-action-blue flex items-center gap-2 hover:gap-3 transition-all shrink-0">
              ВСЕ СТАТЬИ
              <ChevronRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
          {articlePosts.length > 0 ? (
            <ScrollReveal as="div" variant="fade-up">
              <FluidGrid
                cols={1}
                colsTablet={2}
                colsDesktop={3}
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
                      <div className="relative flex min-h-[180px] flex-col justify-center p-6 rounded-2xl overflow-hidden bg-soft-background">
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
                          <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold tracking-wide text-slate-900">
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
      <SpacingVertical size="lg" />

      {/* Отзывы */}
      <section className="py-16 sm:py-24 lg:py-28 xl:py-32 2xl:py-36 3xl:py-40 4xl:py-44 bg-slate-50">
        <AdaptiveContainer maxWidth="default">
          <div className="flex justify-between items-end mb-10 sm:mb-12">
            <div className="space-y-1">
              <Heading2 className="font-semibold tracking-tighter text-slate-900">Отзывы</Heading2>
              <p className="text-slate-500 text-sm font-light">
                {reviewsSubtitle?.text ?? 'Мнения наших клиентов'}
              </p>
            </div>
            <Link href="/otzyvy" className="text-xs font-semibold tracking-widest uppercase text-action-blue flex items-center gap-2 hover:gap-3 transition-all shrink-0">
              ВСЕ ОТЗЫВЫ <ChevronRight className="w-4 h-4" aria-hidden />
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
      <PartnersBlock />
    </div>
  )
}
