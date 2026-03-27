import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { ResponsiveText, Heading1 } from '@/components/ui/responsive-text'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { BreadcrumbJsonLd } from '@/components/site/breadcrumb-json-ld'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
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
        <Heading1 className={`mb-6 mt-2 ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>Новости</Heading1>
        <ScalableSpacing size="lg" />
        {posts.length > 0 ? (
          <FluidGrid
            minItemWidth={260}
            gap="lg"
            cols={1}
            colsTablet={1}
            colsDesktop={2}
            colsXl={2}
            cols2xl={3}
            cols3xl={3}
            cols4xl={4}
            className="auto-rows-min gap-4 sm:gap-5 md:gap-6"
          >
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/news/${post.slug}`}
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
                      Новость
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
