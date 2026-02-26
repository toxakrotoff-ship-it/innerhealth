import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/site/product-card'
import { getFirstPhotoBlurDataURL } from '@/lib/product-photos'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { getCategoryPageContent } from '@/content/category-descriptions'
import { getCategoryAncestorChain } from '@/lib/category-tree'

/** Статический рендер, ревалидация раз в час (проверка соответствия товар–категория). */
export const revalidate = 3600

interface PageProps {
  params: Promise<{ categorySlug: string }>
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

  const products = category.products.map((pc) => pc.product)
  const content = getCategoryPageContent(categorySlug)
  const hasHero = Boolean(content?.heroImage)
  const hasDescription =
    content &&
    (Boolean(content.bullets?.length) || Boolean(content.paragraphs?.length))

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

      {/* Хлебные крошки */}
      <section className="bg-highlight-blue border-b border-gray-200/70">
        <div className="max-w-[min(90rem,92vw)] mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={breadcrumbItems}
          />
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-[min(90rem,92vw)] mx-auto px-4 sm:px-6 lg:px-8">
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
          {products.length === 0 ? (
            <p className="text-gray-500">В этой категории пока нет товаров.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
            </div>
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
        </div>
      </section>
    </>
  )
}
