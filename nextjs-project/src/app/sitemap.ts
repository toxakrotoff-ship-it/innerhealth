import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

/** Регенерация sitemap не чаще раза в час — при добавлении товаров/статей/категорий ссылки появятся в течение часа. */
export const revalidate = 3600

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://innerhaealth.inetrnet.pp.ru')
  )
}

/** Статические страницы сайта (без учёта пагинации каталога). */
const STATIC_PATHS: { path: string; changeFrequency: 'yearly' | 'monthly' | 'weekly' | 'daily'; priority: number }[] = [
  { path: '', changeFrequency: 'weekly', priority: 1 },
  { path: 'catalog', changeFrequency: 'weekly', priority: 0.9 },
  { path: 'news', changeFrequency: 'weekly', priority: 0.8 },
  { path: 'o-nas', changeFrequency: 'monthly', priority: 0.7 },
  { path: 'informaciya', changeFrequency: 'weekly', priority: 0.7 },
  { path: 'contacts', changeFrequency: 'monthly', priority: 0.7 },
  { path: 'sotrudnichestvo', changeFrequency: 'monthly', priority: 0.6 },
  { path: 'privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: 'oferta', changeFrequency: 'yearly', priority: 0.3 },
  { path: 'sertifikaty-sootvetstviya', changeFrequency: 'monthly', priority: 0.5 },
  { path: 'otzyvy', changeFrequency: 'weekly', priority: 0.6 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  const now = new Date()

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: path ? `${baseUrl}/${path}` : baseUrl,
    lastModified: now,
    changeFrequency,
    priority,
  }))

  try {
    const [categories, products, posts] = await Promise.all([
      prisma.category.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.product.findMany({
        where: { slug: { not: null } },
        select: { slug: true, updatedAt: true },
      }),
      prisma.post.findMany({
        where: { published: true },
        select: { slug: true, createdAt: true },
      }),
    ])

    for (const cat of categories) {
      entries.push({
        url: `${baseUrl}/catalog/${cat.slug}`,
        lastModified: cat.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })
    }

    for (const product of products) {
      if (product.slug) {
        entries.push({
          url: `${baseUrl}/product/${product.slug}`,
          lastModified: product.updatedAt,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        })
      }
    }

    for (const post of posts) {
      entries.push({
        url: `${baseUrl}/news/${post.slug}`,
        lastModified: post.createdAt,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })
    }
  } catch {
    // Без БД отдаём только статический список
  }

  return entries
}
