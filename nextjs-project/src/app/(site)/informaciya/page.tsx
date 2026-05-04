import Link from 'next/link'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { BreadcrumbJsonLd } from '@/components/site/breadcrumb-json-ld'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { Heading1 } from '@/components/ui/responsive-text'
import { PostCard } from '@/components/site/post-card'
import { getPostPathByType } from '@/lib/post-url'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'

export const revalidate = 3600
export const dynamic = 'force-dynamic'

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

async function getPublishedHubs(brandId: 'inner' | 'sprint-power') {
  try {
    return await prisma.seoHub.findMany({
      where: { brand: brandId, published: true },
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
  const [posts, hubs] = await Promise.all([getArticlesList(brandId), getPublishedHubs(brandId)])

  return (
    <section className={isSprintTheme ? 'bg-[#060A14]' : ''}>
      <AdaptiveContainer
        maxWidth="default"
        className={`pt-2 md:pt-3 pb-12 sm:pb-16 md:pb-20 lg:pb-24 ${isSprintTheme ? 'text-slate-100' : ''}`}
      >
        <BreadcrumbJsonLd items={breadcrumbItems} currentPath="/informaciya" />
        <Breadcrumbs items={breadcrumbItems} />
        {isSprintTheme ? (
          <div className="mt-4 rounded-[28px] border border-[#C9D8FF] bg-[#EEF4FF] p-7 md:p-10 text-slate-900">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#335CFF]">Sprint Power</p>
            <Heading1 className="mt-3 text-slate-900">Статьи</Heading1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Разборы составов, рекомендации по приёму, материалы о тренировках и восстановлении, связанные с Sprint Power.
            </p>
          </div>
        ) : (
          <Heading1 className="mb-6 mt-2 text-text">Статьи</Heading1>
        )}
        {hubs.length > 0 && (
          <section className={`mb-10 ${isSprintTheme ? 'mt-8' : ''}`}>
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
                        ? 'border-slate-600 bg-[#0F172A] text-slate-100 hover:border-[#7AA2FF] hover:text-[#9AB8FF]'
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
          <FluidGrid
            minItemWidth={260}
            gap="lg"
            cols={1}
            colsTablet={2}
            colsDesktop={2}
            colsXl={3}
            cols2xl={3}
            cols3xl={4}
            className="auto-rows-min gap-4 sm:gap-5 md:gap-6"
          >
            {posts.map((post) => (
              <PostCard
                key={post.id}
                href={getPostPathByType('article', post.slug)}
                title={post.title}
                previewImage={post.previewImage}
                typeLabel="Статья"
                isSprintTheme={isSprintTheme}
                actionLabel={isSprintTheme ? 'Читать материал' : 'Открыть статью'}
              />
            ))}
          </FluidGrid>
        ) : (
          <p className={isSprintTheme ? 'text-slate-400' : 'text-gray-500'}>Пока нет статей.</p>
        )}
      </AdaptiveContainer>
    </section>
  )
}
