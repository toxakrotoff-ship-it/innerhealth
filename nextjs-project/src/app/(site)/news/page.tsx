import Link from 'next/link'
import Image from 'next/image'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { ResponsiveText, Heading1 } from '@/components/ui/responsive-text'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'

export const revalidate = 900

async function getNewsList() {
  try {
    return await prisma.post.findMany({
      where: { published: true, type: 'news' } as Prisma.PostWhereInput,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, slug: true, previewImage: true },
    })
  } catch {
    return []
  }
}

export default async function NewsListPage() {
  const posts = await getNewsList()

  return (
    <AdaptiveContainer maxWidth="default" className="py-10">
      <Heading1 className="text-text mb-6">Новости</Heading1>
      <ScalableSpacing size="lg" />
      {posts.length > 0 ? (
        <FluidGrid
          minItemWidth={300}
          gap="lg"
          cols={1}
          colsTablet={1}
          colsDesktop={2}
          colsXl={2}
          cols2xl={3}
          cols3xl={3}
          cols4xl={4}
          className="auto-rows-min"
        >
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/news/${post.slug}`}
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
                    Новость
                  </span>
                )}
              </div>
              <span className="flex flex-1 items-center p-4 font-medium text-text hover:text-action-blue transition-colors">
                {post.title}
              </span>
            </Link>
          ))}
        </FluidGrid>
      ) : (
        <ResponsiveText as="p" variant="base" color="secondary">
          Пока нет новостей.
        </ResponsiveText>
      )}
    </AdaptiveContainer>
  )
}
