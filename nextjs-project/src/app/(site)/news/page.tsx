import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { ResponsiveText, Heading1 } from '@/components/ui/responsive-text'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { BreadcrumbJsonLd } from '@/components/site/breadcrumb-json-ld'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { PostCard } from '@/components/site/post-card'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'

export const revalidate = 900
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { siteTitle } = await getServerBrandContext()
  return {
    title: 'Новости',
    description: `Новости ${siteTitle}: акции, поступления, события и полезные материалы о здоровье и нутриентах.`,
    alternates: { canonical: '/news' },
    openGraph: {
      title: `Новости | ${siteTitle}`,
      description: 'Актуальные новости магазина и полезная информация для клиентов.',
      url: '/news',
    },
  }
}

async function getNewsList(brandId: 'inner' | 'sprint-power') {
  try {
    return await prisma.post.findMany({
      where: {
        published: true,
        type: 'news',
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

const newsBreadcrumbItems = [{ label: 'Главная', href: '/' }, { label: 'Новости' }]

export default async function NewsListPage() {
  const { brandId } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const posts = await getNewsList(brandId)

  return (
    <section className={isSprintTheme ? 'bg-[#060A14]' : ''}>
      <AdaptiveContainer
        maxWidth="default"
        className={`pt-10 pb-16 sm:pb-20 ${isSprintTheme ? 'text-slate-100' : ''}`}
      >
        <BreadcrumbJsonLd items={newsBreadcrumbItems} currentPath="/news" />
        <Breadcrumbs items={newsBreadcrumbItems} />
        {isSprintTheme ? (
          <div className="mt-4 rounded-[28px] border border-[#1B2946] bg-[#0A1128] p-7 md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7AA2FF]">Sprint Power</p>
            <Heading1 className="mt-3 text-slate-100">Новости</Heading1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Запуски продуктов, обновления линейки, события бренда и всё, что влияет на экосистему Sprint Power.
            </p>
          </div>
        ) : (
          <Heading1 className="mb-6 mt-2 text-text">Новости</Heading1>
        )}
        <ScalableSpacing size="lg" />
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
            cols4xl={4}
            className="auto-rows-min gap-4 sm:gap-5 md:gap-6"
          >
            {posts.map((post) => (
              <PostCard
                key={post.id}
                href={`/news/${post.slug}`}
                title={post.title}
                previewImage={post.previewImage}
                typeLabel="Новость"
                isSprintTheme={isSprintTheme}
                actionLabel="Открыть новость"
              />
            ))}
          </FluidGrid>
        ) : (
          <ResponsiveText as="p" variant="base" color={isSprintTheme ? 'primary' : 'secondary'}>
            Пока нет новостей.
          </ResponsiveText>
        )}
      </AdaptiveContainer>
    </section>
  )
}
