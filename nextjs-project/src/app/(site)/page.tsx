import Link from 'next/link'
import Image from 'next/image'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ProductCard } from '@/components/site/product-card'
import { HeroBlock } from '@/components/site/hero-block'
import { SprintPowerBanner } from '@/components/site/sprint-power-banner'
import { SprintPowerBlock } from '@/components/site/sprint-power-block'
import { PartnersBlock } from '@/components/site/partners-block'
import {
  filterCatalogBlockCategories,
  getCategoryBackgroundImage,
} from '@/lib/catalog-categories'
import { TiltCard } from '@/components/ui/tilt-card'

export const revalidate = 60

async function getHomeData() {
  try {
    const [categories, newProducts, newsPosts, articlePosts] = await Promise.all([
      prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { products: true } } },
      }),
      prisma.product.findMany({
        where: { slug: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          title: true,
          price: true,
          priceOld: true,
          photo: true,
          slug: true,
        },
      }),
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
    ])
    return { categories, newProducts, newsPosts, articlePosts }
  } catch {
    return {
      categories: [],
      newProducts: [],
      newsPosts: [],
      articlePosts: [],
    }
  }
}

export default async function HomePage() {
  const { categories, newProducts, newsPosts, articlePosts } = await getHomeData()

  return (
    <div>
      <HeroBlock />

      {/* Баннер — бегущая строка Sprint Power */}
      <SprintPowerBanner />

      {/* Новинки */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text">Новинки</h2>
            <Link href="/catalog" className="text-action-blue font-medium hover:underline">
              Весь каталог
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {newProducts.map((p) => (
              <div
                key={p.id}
                className="w-[calc((100%-1rem)/2)] max-w-[20rem] sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]"
              >
                <ProductCard
                  id={p.id}
                  title={p.title}
                  price={p.price}
                  priceOld={p.priceOld}
                  photo={p.photo}
                  slug={p.slug}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Новости */}
      <section className="py-12 bg-soft-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text">Новости</h2>
            <Link href="/news" className="text-action-blue font-medium hover:underline">
              Все новости
            </Link>
          </div>
          {newsPosts.length > 0 ? (
            <ul className="space-y-4">
              {newsPosts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/news/${post.slug}`}
                    className="flex flex-col sm:flex-row overflow-hidden bg-white rounded-xl border border-gray-200 hover:border-action-blue hover:shadow-sm transition-all"
                  >
                    <div className="relative w-full sm:w-40 sm:min-w-40 aspect-video sm:aspect-square bg-gray-100 shrink-0">
                      {post.previewImage ? (
                        <Image
                          src={post.previewImage.startsWith('/') ? post.previewImage : `/${post.previewImage}`}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 10rem"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                          Новость
                        </span>
                      )}
                    </div>
                    <span className="flex flex-1 items-center p-4 font-medium text-text hover:text-action-blue transition-colors">
                      {post.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Пока нет новостей.</p>
          )}
        </div>
      </section>

      {/* Разделы каталога */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text mb-6">Разделы каталога</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filterCatalogBlockCategories(categories).map((cat) => {
                const bgImage = getCategoryBackgroundImage(cat.slug)
                return (
                  <Link
                    key={cat.id}
                    href={`/catalog/${cat.slug}`}
                    className="block transition-shadow hover:shadow-md rounded-2xl hover:border-action-blue"
                  >
                    <TiltCard>
                      <div
                        className="relative flex min-h-[120px] flex-col justify-end p-6 text-center bg-cover bg-center rounded-2xl"
                        style={{
                          backgroundImage: bgImage
                            ? `linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.5) 100%), url(${bgImage})`
                            : undefined,
                          backgroundColor: bgImage
                            ? undefined
                            : 'var(--soft-background)',
                        }}
                      >
                        <span
                          className={`relative font-medium drop-shadow-md block ${bgImage ? 'text-white' : 'text-text'}`}
                        >
                          {cat.title}
                        </span>
                        <span
                          className={`relative text-sm drop-shadow mt-1 ${bgImage ? 'text-white/90' : 'text-gray-500'}`}
                        >
                          {cat._count.products} товаров
                        </span>
                      </div>
                    </TiltCard>
                  </Link>
                )
              })}
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center rounded-full bg-action-blue text-gray-800 font-medium px-6 py-2.5 min-h-[44px] hover:bg-action-blue/90 transition-colors"
            >
              Смотреть весь каталог
            </Link>
          </div>
        </div>
      </section>

      {/* Статьи */}
      <section className="py-12 bg-soft-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text">Статьи</h2>
            <Link href="/informaciya" className="text-action-blue font-medium hover:underline">
              Все статьи
            </Link>
          </div>
          {articlePosts.length > 0 ? (
            <ul className="space-y-4">
              {articlePosts.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/news/${post.slug}`}
                    className="flex flex-col sm:flex-row overflow-hidden bg-white rounded-xl border border-gray-200 hover:border-action-blue hover:shadow-sm transition-all"
                  >
                    <div className="relative w-full sm:w-40 sm:min-w-40 aspect-video sm:aspect-square bg-gray-100 shrink-0">
                      {post.previewImage ? (
                        <Image
                          src={post.previewImage.startsWith('/') ? post.previewImage : `/${post.previewImage}`}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 10rem"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                          Статья
                        </span>
                      )}
                    </div>
                    <span className="flex flex-1 items-center p-4 font-medium text-text hover:text-action-blue transition-colors">
                      {post.title}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">Пока нет статей.</p>
          )}
        </div>
      </section>

      {/* Отзывы */}
      <section className="py-12 bg-soft-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-text">Отзывы</h2>
            <Link href="/otzyvy" className="text-action-blue font-medium hover:underline">
              Все отзывы
            </Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Раздел отзывов в разработке.</p>
            <Link
              href="/otzyvy"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-action-blue text-gray-800 font-medium px-6 py-2.5 min-h-[44px] hover:bg-action-blue/90 transition-colors"
            >
              Перейти в отзывы
            </Link>
          </div>
        </div>
      </section>

      {/* Блок Sprint Power (текст + мокап iPhone) */}
      <SprintPowerBlock />

      {/* Наши Партнёры */}
      <PartnersBlock />
    </div>
  )
}
