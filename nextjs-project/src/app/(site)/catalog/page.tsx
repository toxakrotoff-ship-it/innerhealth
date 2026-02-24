import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/site/product-card'
import {
  filterCatalogBlockCategories,
  getCategoryBackgroundImage,
} from '@/lib/catalog-categories'
import { TiltCard } from '@/components/ui/tilt-card'

/** Статический рендер, ревалидация раз в час (проверка соответствия товар–категория). */
export const revalidate = 3600

const PRODUCTS_PER_PAGE = 24

interface CatalogPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(String(pageParam), 10) || 1)
  const skip = (page - 1) * PRODUCTS_PER_PAGE

  const [categories, productsResult] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: PRODUCTS_PER_PAGE + 1,
      skip,
      select: {
        id: true,
        title: true,
        price: true,
        priceOld: true,
        photo: true,
        slug: true,
      },
    }),
  ])

  const catalogBlockCategories = filterCatalogBlockCategories(categories)
  const hasNextPage = productsResult.length > PRODUCTS_PER_PAGE
  const products = productsResult.slice(0, PRODUCTS_PER_PAGE)

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-text mb-6">Каталог</h1>
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
                  className={`relative flex min-h-[120px] flex-col justify-end p-6 text-center rounded-2xl overflow-hidden ${!bgImage ? 'bg-soft-background' : ''}`}
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
                    className={`relative z-10 font-medium drop-shadow-md block ${bgImage ? 'text-white' : 'text-text'}`}
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
                priority={index < 8}
              />
            ))}
          </div>
          {(page > 1 || hasNextPage) && (
            <nav
              className="mt-8 flex flex-wrap items-center justify-center gap-2"
              aria-label="Пагинация каталога"
            >
              {page > 1 && (
                <Link
                  href={page === 2 ? '/catalog' : `/catalog?page=${page - 1}`}
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
                  href={`/catalog?page=${page + 1}`}
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
