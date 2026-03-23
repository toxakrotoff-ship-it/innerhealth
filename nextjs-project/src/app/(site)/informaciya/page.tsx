import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { BreadcrumbJsonLd } from '@/components/site/breadcrumb-json-ld'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { Heading1 } from '@/components/ui/responsive-text'
import { getPostPathByType } from '@/lib/post-url'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Статьи',
  description:
    'Статьи Inner Health о нутриентах, питании и здоровье. Экспертные материалы и обзоры продуктов.',
  alternates: { canonical: '/informaciya' },
  openGraph: {
    title: 'Статьи | Inner Health',
    description: 'Полезные статьи о здоровье, БАДах и сбалансированном питании.',
    url: '/informaciya',
  },
}

async function getArticlesList() {
  try {
    return await prisma.post.findMany({
      where: { published: true, type: 'article' } as Prisma.PostWhereInput,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, slug: true, previewImage: true },
    })
  } catch {
    return []
  }
}

async function getPublishedHubs() {
  try {
    return await prisma.seoHub.findMany({
      where: { published: true },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, slug: true },
    })
  } catch {
    return []
  }
}

const breadcrumbItems = [
  { label: 'Главная', href: '/' },
  { label: 'Статьи' },
]

export default async function InformaciyaPage() {
  const [posts, hubs] = await Promise.all([getArticlesList(), getPublishedHubs()])

  return (
    <AdaptiveContainer
      maxWidth="default"
      className="pt-2 md:pt-3 pb-12 sm:pb-16 md:pb-20 lg:pb-24"
    >
      <BreadcrumbJsonLd items={breadcrumbItems} currentPath="/informaciya" />
      <Breadcrumbs items={breadcrumbItems} />
      <Heading1 className="text-text mb-6 mt-2">Статьи</Heading1>
      {hubs.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-text mb-3">Подборки и гайды</h2>
          <ul className="flex flex-wrap gap-2">
            {hubs.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/guides/${h.slug}`}
                  className="inline-flex rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-text hover:border-action-blue hover:text-action-blue transition-colors"
                >
                  {h.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {posts.length > 0 ? (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={getPostPathByType('article', post.slug)}
                className="flex flex-col sm:flex-row overflow-hidden bg-white rounded-xl border border-gray-200 hover:border-action-blue hover:shadow-sm transition-all"
              >
                <div className="relative w-full sm:w-40 sm:min-w-40 aspect-video sm:aspect-square bg-gray-100 shrink-0">
                  {post.previewImage ? (
                    <Image
                      src={
                        post.previewImage.startsWith('/')
                          ? post.previewImage
                          : `/${post.previewImage}`
                      }
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
    </AdaptiveContainer>
  )
}
