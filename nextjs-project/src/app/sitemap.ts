import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { getPostPath } from '@/lib/post-url'
import { getBrandSiteUrl } from '@/lib/brand/site-branding'
import { SPRINT_POWER_PRODUCT_BRAND } from '@/lib/brand/brand-scope'

/** Регенерация sitemap не чаще раза в час — при добавлении товаров/статей/категорий ссылки появятся в течение часа. */
export const revalidate = 3600

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
  { path: 'faq', changeFrequency: 'weekly', priority: 0.55 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const brands = [
    { id: 'inner' as const, baseUrl: getBrandSiteUrl('inner') },
    { id: 'sprint-power' as const, baseUrl: getBrandSiteUrl('sprint-power') },
  ]
  const now = new Date()

  const entries: MetadataRoute.Sitemap = brands.flatMap(({ baseUrl }) =>
    STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
      url: path ? `${baseUrl}/${path}` : baseUrl,
      lastModified: now,
      changeFrequency,
      priority,
    }))
  )

  try {
    const [categories, products, posts, hubs] = await Promise.all([
      prisma.category.findMany({
        select: { slug: true, updatedAt: true, brand: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.product.findMany({
        where: { slug: { not: null } },
        select: { slug: true, updatedAt: true, brand: true },
      }),
      prisma.post.findMany({
        where: { published: true },
        select: { slug: true, createdAt: true, updatedAt: true, type: true },
      }),
      prisma.seoHub.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
    ])

    const sprintPostPrefix = 'sp-'

    for (const { id, baseUrl } of brands) {
      const isSprint = id === 'sprint-power'

      for (const cat of categories) {
        const categoryBrand = (cat as { brand?: string | null }).brand ?? 'inner'
        if ((isSprint && categoryBrand !== 'sprint-power') || (!isSprint && categoryBrand === 'sprint-power'))
          continue
        entries.push({
          url: `${baseUrl}/catalog/${cat.slug}`,
          lastModified: cat.updatedAt,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        })
      }

      for (const product of products) {
        const productBrand = (product as { brand?: string | null }).brand ?? null
        const inBrandScope = isSprint
          ? productBrand === SPRINT_POWER_PRODUCT_BRAND
          : productBrand !== SPRINT_POWER_PRODUCT_BRAND
        if (!inBrandScope || !product.slug) continue
        entries.push({
          url: `${baseUrl}/product/${product.slug}`,
          lastModified: product.updatedAt,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        })
      }

      for (const post of posts) {
        const postInBrandScope = isSprint
          ? post.slug.startsWith(sprintPostPrefix)
          : !post.slug.startsWith(sprintPostPrefix)
        if (!postInBrandScope) continue
        entries.push({
          url: `${baseUrl}${getPostPath({ type: post.type, slug: post.slug })}`,
          lastModified: post.updatedAt,
          changeFrequency: post.type === 'news' ? ('weekly' as const) : ('monthly' as const),
          priority: post.type === 'news' ? 0.65 : 0.6,
        })
      }

      for (const hub of hubs) {
        entries.push({
          url: `${baseUrl}/guides/${hub.slug}`,
          lastModified: hub.updatedAt,
          changeFrequency: 'monthly' as const,
          priority: 0.62,
        })
      }
    }
  } catch {
    // Без БД отдаём только статический список
  }

  return entries
}
