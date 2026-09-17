import { prisma } from '@/lib/prisma'
import { getSiteBaseUrl } from '@/lib/site-url'
import { escapeXml } from '@/lib/xml-escape'
import { stripHtmlToPlainText } from '@/lib/plain-text'
import { getPostPath } from '@/lib/post-url'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'

/** RSS для Яндекс.Новостей / лент / агрегаторов; обновление не чаще 10 мин. */
export const revalidate = 600
export const dynamic = 'force-dynamic'

/** Как и в sitemap.ts: посты Sprint Power помечены префиксом slug'а. */
const SPRINT_POST_SLUG_PREFIX = 'sp-'

export async function GET(): Promise<Response> {
  const [base, { brandId, siteTitle }] = await Promise.all([getSiteBaseUrl(), getServerBrandContext()])
  const isSprint = isSprintPowerBrand(brandId)

  type RssPost = {
    title: string
    slug: string
    excerpt: string | null
    createdAt: Date
    updatedAt: Date
    type: string
  }
  let posts: RssPost[] = []
  try {
    posts = await prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        createdAt: true,
        updatedAt: true,
        type: true,
      },
    })
  } catch {
    posts = []
  }

  // Лента каждого бренда должна содержать только его собственные публикации —
  // иначе RSS на sprintpower.ru перечислял бы новости Inner Health со
  // ссылками, ведущими на чужой домен.
  const brandPosts = posts
    .filter((post) => (isSprint ? post.slug.startsWith(SPRINT_POST_SLUG_PREFIX) : !post.slug.startsWith(SPRINT_POST_SLUG_PREFIX)))
    .slice(0, 80)

  const channelTitle = `${siteTitle} — новости и статьи`
  const channelDesc = isSprint
    ? `Лента публикаций интернет-магазина ${siteTitle}: новости, статьи о спортивном питании и восстановлении.`
    : `Лента публикаций интернет-магазина ${siteTitle}: новости, статьи о здоровье и нутриентах.`
  const channelLink = base
  const selfLink = `${base}/rss.xml`

  const itemsXml = brandPosts
    .map((post) => {
      const link = `${base}${getPostPath({ type: post.type, slug: post.slug })}`
      const pubDate = post.updatedAt.toUTCString()
      const category = post.type === 'news' ? 'Новости' : 'Статьи'
      const rawDesc = post.excerpt?.trim() || `${category}: ${post.title}`
      const description = stripHtmlToPlainText(rawDesc, 2000)
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <category>${escapeXml(category)}</category>
      <description>${escapeXml(description)}</description>
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDesc)}</description>
    <language>ru-ru</language>
    <lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>
    <atom:link href="${escapeXml(selfLink)}" rel="self" type="application/rss+xml" />
    <image>
      <url>${escapeXml(`${base}/hero-portrait.png`)}</url>
      <title>${escapeXml(channelTitle)}</title>
      <link>${escapeXml(channelLink)}</link>
    </image>
    ${itemsXml}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  })
}
