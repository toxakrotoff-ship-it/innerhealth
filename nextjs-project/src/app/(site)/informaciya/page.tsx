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
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const { siteTitle } = await getServerBrandContext()
  return {
    title: 'Статьи',
    description: `Статьи ${siteTitle} о нутриентах, питании и здоровье. Экспертные материалы и обзоры продуктов.`,
    alternates: { canonical: '/informaciya' },
    openGraph: {
      title: `Статьи | ${siteTitle}`,
      description: 'Полезные статьи о здоровье, БАДах и сбалансированном питании.',
      url: '/informaciya',
    },
  }
}

async function getArticlesList(brandId: 'inner' | 'sprint-power') {
  try {
    return await prisma.post.findMany({
      where: {
        published: true,
        type: 'article',
        ...(isSprintPowerBrand(brandId)
          ? { slug: { startsWith: 'sp-' } }
          : { slug: { not: { startsWith: 'sp-' } } }),
      } as Prisma.PostWhereInput,
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
  const { brandId } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const [posts, hubs] = await Promise.all([getArticlesList(brandId), getPublishedHubs()])

  return (
    <section className={isSprintTheme ? 'bg-[#060A14]' : ''}>
      <AdaptiveContainer
        maxWidth="default"
        className={`pt-2 md:pt-3 pb-12 sm:pb-16 md:pb-20 lg:pb-24 ${isSprintTheme ? 'text-slate-100' : ''}`}
      >
        <BreadcrumbJsonLd items={breadcrumbItems} currentPath="/informaciya" />
        <Breadcrumbs items={breadcrumbItems} />
        <Heading1 className={`mb-6 mt-2 ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>Статьи</Heading1>
        {hubs.length > 0 && (
          <section className="mb-10">
            <h2 className={`text-lg font-semibold mb-3 ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
              Подборки и гайды
            </h2>
            <ul className="flex flex-wrap gap-2">
              {hubs.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/guides/${h.slug}`}
                    className={`inline-flex rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      isSprintTheme
                        ? 'border-slate-600 bg-[#0F172A] text-slate-100 hover:border-[#3B82F6] hover:text-[#7AA2FF]'
                        : 'border-gray-300 bg-white text-text hover:border-action-blue hover:text-action-blue'
                    }`}
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
                  className={`flex flex-col sm:flex-row overflow-hidden rounded-xl border transition-all ${
                    isSprintTheme
                      ? 'bg-[#0F172A] border-slate-700 hover:border-[#3B82F6] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.35)]'
                      : 'bg-white border-gray-200 hover:border-action-blue hover:shadow-sm'
                  }`}
                >
                  <div
                    className={`relative w-full sm:w-40 sm:min-w-40 aspect-video sm:aspect-square shrink-0 ${
                      isSprintTheme ? 'bg-slate-900' : 'bg-gray-100'
                    }`}
                  >
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
                      <span
                        className={`absolute inset-0 flex items-center justify-center text-sm ${
                          isSprintTheme ? 'text-slate-500' : 'text-gray-400'
                        }`}
                      >
                        Статья
                      </span>
                    )}
                  </div>
                  <span
                    className={`flex flex-1 items-center p-4 font-medium transition-colors ${
                      isSprintTheme ? 'text-slate-100 hover:text-[#7AA2FF]' : 'text-text hover:text-action-blue'
                    }`}
                  >
                    {post.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={isSprintTheme ? 'text-slate-400' : 'text-gray-500'}>Пока нет статей.</p>
        )}
      </AdaptiveContainer>
    </section>
  )
}
