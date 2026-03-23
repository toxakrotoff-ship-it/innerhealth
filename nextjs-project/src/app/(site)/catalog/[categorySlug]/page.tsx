import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/site/product-card'
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

/** Статический рендер категории, ревалидация раз в 10 минут. */
export const revalidate = 600

interface PageProps {
  params: Promise<{ categorySlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categorySlug } = await params
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    select: { title: true },
  })
  if (!category) {
    return {}
  }

  const content = getCategoryPageContent(categorySlug)
  let description = `${category.title} — товары в каталоге Inner Health. Доставка по России.`
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
      title: `${category.title} | Inner Health`,
      description,
      url: path,
    },
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { categorySlug } = await params
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    include: {
      children: {
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
              title: true,
              price: true,
              priceOld: true,
              photo: true,
              photos: true,
              slug: true,
              isDraft: true,
              isPromoEligible: true,
              discountPrice: true,
            },
          },
        },
      },
    },
  })

  if (!category) notFound()

  const allCategories = await prisma.category.findMany({
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
  const content = getCategoryPageContent(categorySlug)
  const hasHero = Boolean(content?.heroImage)
  const hasDescription =
    content &&
    (Boolean(content.bullets?.length) || Boolean(content.paragraphs?.length))

  const giftPromos = categorySlug === 'aktsii' ? await getPublicGiftPromotions(new Date()) : []

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
      <section className="bg-white">
        <AdaptiveContainer maxWidth="default">
          <BreadcrumbJsonLd items={breadcrumbItems} currentPath={`/catalog/${categorySlug}`} />
          <Breadcrumbs
            items={breadcrumbItems}
          />
        </AdaptiveContainer>
      </section>

      <section className="py-12 bg-white">
        <AdaptiveContainer maxWidth="default">
          <h1 className="text-2xl font-bold text-text mb-6">{category.title}</h1>
          {category.children.length > 0 && (
            <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h2 className="text-base font-semibold text-text mb-3">Подкатегории</h2>
              <div className="flex flex-wrap gap-2">
                {category.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/catalog/${child.slug}`}
                    className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-text hover:border-action-blue hover:text-action-blue transition-colors"
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
                        className="block transition-shadow hover:shadow-md rounded-2xl hover:border-action-blue"
                      >
                        <TiltCard>
                          <div className="relative flex min-h-[180px] flex-col justify-center p-6 rounded-2xl overflow-hidden bg-soft-background">
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
            <p className="text-gray-500">В этой категории пока нет товаров.</p>
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
              className="gap-6 md:gap-7 lg:gap-8 xl:gap-10 2xl:gap-12 3xl:gap-14 4xl:gap-16 5xl:gap-20 6xl:gap-24"
            >
              {products.map((p, index) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
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
          )}

          {/* Описание раздела под каталогом */}
          {hasDescription && content && (
            <div className="mt-12 pt-10 border-t border-gray-200">
              {content.descriptionHeading && (
                <h2 className="text-xl font-bold text-text mb-4">
                  {content.descriptionHeading}
                </h2>
              )}
              {content.bullets && content.bullets.length > 0 && (
                <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
                  {content.bullets.map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              )}
              {content.paragraphs && content.paragraphs.length > 0 && (
                <div className="space-y-3 text-gray-700">
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
