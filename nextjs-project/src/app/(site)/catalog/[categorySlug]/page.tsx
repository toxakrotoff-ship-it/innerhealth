import Image from 'next/image'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/site/product-card'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { getCategoryPageContent } from '@/content/category-descriptions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ categorySlug: string }>
}

export default async function CategoryPage({ params }: PageProps) {
  const { categorySlug } = await params
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    include: {
      products: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              priceOld: true,
              photo: true,
              slug: true,
            },
          },
        },
      },
    },
  })

  if (!category) notFound()

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
          <div className="relative w-full aspect-[3/1] min-h-[160px] sm:min-h-[200px]">
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: 'Главная', href: '/' },
              { label: 'Каталог', href: '/catalog' },
              { label: category.title },
            ]}
          />
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-text mb-6">{category.title}</h1>
          {products.length === 0 ? (
            <p className="text-gray-500">В этой категории пока нет товаров.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  price={p.price}
                  priceOld={p.priceOld}
                  photo={p.photo}
                  slug={p.slug}
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
