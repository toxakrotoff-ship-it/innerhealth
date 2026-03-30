import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { getSettingsMap } from '@/services/settings.service'
import { buildNewsArticleGeoStructuredData } from '@/lib/schema-org'
import { toAbsoluteSiteUrl } from '@/lib/site-url'
import { extractPlainTextFromPostContent } from '@/lib/tiptap-plain-text'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { BreadcrumbJsonLd } from '@/components/site/breadcrumb-json-ld'
import { TipTapDocRenderer } from '@/components/site/tiptap-doc-renderer'
import { ArticleSourceFooter } from '@/components/site/article-source-footer'
import { getPostPath, getPostPathByType } from '@/lib/post-url'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand, postBelongsToBrandScope } from '@/lib/brand/brand-scope'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { siteTitle, siteUrl, brandId } = await getServerBrandContext()
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
  if (!postBelongsToBrandScope(slug, brandId)) return {}

  const description =
    post.excerpt?.trim() ||
    (post.type === 'news' ? `Новости ${siteTitle}.` : `Статья ${siteTitle} о здоровье и питании.`)

  const path = getPostPath({ type: post.type, slug })
  const ogImage = post.previewImage || undefined

  const siteOrigin = siteUrl

  return {
    title: post.title,
    description: description.length > 160 ? `${description.slice(0, 157)}…` : description,
    alternates: { canonical: path },
    authors: [{ name: siteTitle, url: siteOrigin }],
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: path,
      publishedTime: post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [siteTitle],
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
  const { siteUrl, brandId } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const { slug } = await params
  const post = await prisma.post.findUnique({
    where: { slug, published: true },
  })

  if (!post) notFound()
  if (!postBelongsToBrandScope(slug, brandId)) notFound()
  if (post.type === 'article') redirect(getPostPathByType('article', post.slug))

  const settings = await getSettingsMap(undefined, { brandId })
  const schemaUrl = settings.schema_org_url?.trim()
  const postPath = getPostPath({ type: post.type, slug: post.slug })
  const canonicalUrl = schemaUrl
    ? `${schemaUrl.replace(/\/+$/, '')}${postPath}`
    : toAbsoluteSiteUrl(postPath)
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
    siteOrigin: siteUrl,
    articleBodyPlain,
  })

  const sectionLabel = post.type === 'news' ? 'Новости' : 'Статьи'
  const sectionHref = post.type === 'news' ? '/news' : '/informaciya'
  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: sectionLabel, href: sectionHref },
    { label: post.title },
  ]
  const currentPath = postPath

  return (
    <AdaptiveContainer
      maxWidth="default"
      className={`py-10 ${isSprintTheme ? 'text-slate-100' : ''}`}
    >
      <div className="mx-auto max-w-3xl">
        <BreadcrumbJsonLd items={breadcrumbItems} currentPath={currentPath} />
        <Breadcrumbs items={breadcrumbItems} />
        <article
          id="geo-article-root"
          className={`rounded-2xl p-8 mt-4 ${
            isSprintTheme ? 'bg-[#0F172A] border border-slate-700' : 'bg-white border border-gray-200'
          }`}
        >
          <h1
            id="geo-article-title"
            className={`text-2xl font-bold mb-4 ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}
          >
            {post.title}
          </h1>
          <p className={`text-xs mb-4 ${isSprintTheme ? 'text-slate-400' : 'text-gray-500'}`}>
            Опубликовано: {post.createdAt.toLocaleDateString('ru-RU')}
            {post.updatedAt.getTime() !== post.createdAt.getTime() && (
              <> · Обновлено: {post.updatedAt.toLocaleDateString('ru-RU')}</>
            )}
          </p>
          {post.excerpt && (
            <p className={`mb-4 ${isSprintTheme ? 'text-slate-300' : 'text-gray-600'}`}>{post.excerpt}</p>
          )}
          {post.previewImage && (
            <div
              className={`aspect-video rounded-lg mb-6 overflow-hidden relative ${
                isSprintTheme ? 'bg-slate-900' : 'bg-gray-100'
              }`}
            >
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
        <Link
          href="/"
          className={`text-sm mt-6 inline-block hover:underline ${
            isSprintTheme ? 'text-[#7AA2FF]' : 'text-action-blue'
          }`}
        >
          ← На главную
        </Link>
      </div>
    </AdaptiveContainer>
  )
}
