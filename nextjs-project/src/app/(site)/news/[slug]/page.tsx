import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { getSettingsMap } from '@/services/settings.service'
import { buildNewsArticleGeoStructuredData } from '@/lib/schema-org'
import { getSiteBaseUrl, toAbsoluteSiteUrl } from '@/lib/site-url'
import { extractPlainTextFromPostContent } from '@/lib/tiptap-plain-text'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { BreadcrumbJsonLd } from '@/components/site/breadcrumb-json-ld'
import { TipTapDocRenderer } from '@/components/site/tiptap-doc-renderer'
import { ArticleSourceFooter } from '@/components/site/article-source-footer'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.post.findUnique({
    where: { slug, published: true },
    select: {
      title: true,
      excerpt: true,
      previewImage: true,
      createdAt: true,
      updatedAt: true,
      type: true,
    },
  })
  if (!post) {
    return {}
  }

  const description =
    post.excerpt?.trim() ||
    (post.type === 'news' ? 'Новости Inner Health.' : 'Статья Inner Health о здоровье и питании.')

  const path = `/news/${slug}`
  const ogImage = post.previewImage || undefined

  const siteOrigin = getSiteBaseUrl()

  return {
    title: post.title,
    description: description.length > 160 ? `${description.slice(0, 157)}…` : description,
    alternates: { canonical: path },
    authors: [{ name: 'Inner Health', url: siteOrigin }],
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: path,
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: ['Inner Health'],
      section: post.type === 'news' ? 'Новости' : 'Статьи',
      locale: 'ru_RU',
      ...(ogImage ? { images: [{ url: ogImage, alt: post.title }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: post.title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

export default async function NewsPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await prisma.post.findUnique({
    where: { slug, published: true },
  })

  if (!post) notFound()

  const settings = await getSettingsMap()
  const schemaUrl = settings.schema_org_url?.trim()
  const canonicalUrl = schemaUrl
    ? `${schemaUrl.replace(/\/+$/, '')}/news/${post.slug}`
    : toAbsoluteSiteUrl(`/news/${post.slug}`)
  const articleBodyPlain = extractPlainTextFromPostContent(post.content)
  const geoStructuredData = buildNewsArticleGeoStructuredData({
    settings,
    post: {
      title: post.title,
      type: post.type,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      excerpt: post.excerpt ?? null,
      previewImage: post.previewImage ?? null,
    },
    canonicalUrl,
    siteOrigin: getSiteBaseUrl(),
    articleBodyPlain,
  })

  const sectionLabel = post.type === 'news' ? 'Новости' : 'Статьи'
  const sectionHref = post.type === 'news' ? '/news' : '/informaciya'
  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: sectionLabel, href: sectionHref },
    { label: post.title },
  ]
  const currentPath = `/news/${post.slug}`

  return (
    <AdaptiveContainer maxWidth="default" className="py-10">
      <div className="mx-auto max-w-3xl">
        <BreadcrumbJsonLd items={breadcrumbItems} currentPath={currentPath} />
        <Breadcrumbs items={breadcrumbItems} />
        <article id="geo-article-root" className="bg-white rounded-2xl border border-gray-200 p-8 mt-4">
          <h1 id="geo-article-title" className="text-2xl font-bold text-text mb-4">
            {post.title}
          </h1>
          <p className="text-xs text-gray-500 mb-4">
            Опубликовано: {post.createdAt.toLocaleDateString('ru-RU')}
            {post.updatedAt.getTime() !== post.createdAt.getTime() && (
              <> · Обновлено: {post.updatedAt.toLocaleDateString('ru-RU')}</>
            )}
          </p>
          {post.excerpt && <p className="text-gray-600 mb-4">{post.excerpt}</p>}
          {post.previewImage && (
            <div className="aspect-video rounded-lg bg-gray-100 mb-6 overflow-hidden relative">
              <Image
                src={post.previewImage}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 672px"
                unoptimized={post.previewImage.startsWith('/')}
              />
            </div>
          )}
          <TipTapDocRenderer raw={post.content} />
          <ArticleSourceFooter canonicalUrl={canonicalUrl} />
          <script
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: JSON.stringify(geoStructuredData) }}
          />
        </article>
        <Link href="/" className="text-action-blue hover:underline text-sm mt-6 inline-block">
          ← На главную
        </Link>
      </div>
    </AdaptiveContainer>
  )
}
