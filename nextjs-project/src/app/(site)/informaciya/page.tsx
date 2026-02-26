import Link from 'next/link'
import Image from 'next/image'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const revalidate = 60

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

export default async function InformaciyaPage() {
  const posts = await getArticlesList()

  return (
    <div className="max-w-[min(90rem,92vw)] mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-text mb-6">Статьи</h1>
      {posts.length > 0 ? (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
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
    </div>
  )
}
