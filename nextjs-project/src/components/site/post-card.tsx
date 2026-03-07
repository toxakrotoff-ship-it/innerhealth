import Link from 'next/link'
import Image from 'next/image'

interface PostCardProps {
  id: string
  title: string
  slug: string
  previewImage: string | null
  typeLabel: string
}

export function PostCard({ title, slug, previewImage, typeLabel }: PostCardProps) {
  return (
    <li>
      <Link
        href={`/news/${slug}`}
        className="flex flex-col sm:flex-row overflow-hidden bg-white rounded-xl border border-gray-200 hover:border-action-blue hover:shadow-sm transition-all"
      >
        <div className="relative w-full sm:w-40 sm:min-w-40 lg:w-48 lg:min-w-48 2xl:w-56 2xl:min-w-56 3xl:w-64 3xl:min-w-64 aspect-video sm:aspect-square lg:aspect-[4/3] 2xl:aspect-[3/2] 3xl:aspect-video bg-gray-100 shrink-0">
          {previewImage ? (
            <Image
              src={previewImage.startsWith('/') ? previewImage : `/${previewImage}`}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (min-width: 1024px) 12rem, (min-width: 1536px) 14rem, (min-width: 1920px) 16rem, 10rem"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              {typeLabel}
            </span>
          )}
        </div>
        <span className="flex flex-1 items-center p-4 lg:p-5 2xl:p-6 3xl:p-7 font-medium text-text hover:text-action-blue transition-colors">
          {title}
        </span>
      </Link>
    </li>
  )
}
