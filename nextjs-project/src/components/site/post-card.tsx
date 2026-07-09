import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { getPostPreviewImageAlt } from '@/lib/image-alt-text'

interface PostCardProps {
  href: string
  title: string
  previewImage: string | null
  typeLabel: string
  isSprintTheme?: boolean
  actionLabel?: string
  /** Компактный вид для плотных сеток на страницах списков */
  variant?: 'default' | 'compact'
}

export function PostCard({
  href,
  title,
  previewImage,
  typeLabel,
  isSprintTheme = false,
  actionLabel,
  variant = 'default',
}: PostCardProps) {
  const isCompact = variant === 'compact'

  return (
    <Link
      href={href}
      className={cn(
        'group flex h-full flex-col overflow-hidden border transition-all',
        isCompact ? 'rounded-xl' : 'rounded-2xl',
        isSprintTheme
          ? 'border-[#1B2946] bg-[#0F172A] hover:border-[#3B82F6] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.25)]'
          : 'border-gray-200 bg-white hover:border-action-blue hover:shadow-sm'
      )}
    >
      <div
        className={cn(
          'relative w-full shrink-0 overflow-hidden',
          isCompact ? 'aspect-[3/2]' : 'aspect-[4/3] lg:aspect-[16/11]',
          isSprintTheme ? 'bg-slate-900' : 'bg-gray-100'
        )}
      >
        {previewImage ? (
          <Image
            src={previewImage.startsWith('/') ? previewImage : `/${previewImage}`}
            alt={getPostPreviewImageAlt(title)}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes={
              isCompact
                ? '(max-width: 767px) 100vw, (max-width: 1023px) 50vw, (max-width: 1535px) 33vw, 25vw'
                : '(max-width: 767px) 100vw, (max-width: 1279px) 50vw, (max-width: 1919px) 33vw, 25vw'
            }
          />
        ) : (
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              isCompact ? 'text-xs' : 'text-sm',
              isSprintTheme ? 'text-slate-500' : 'text-gray-400'
            )}
          >
            {typeLabel}
          </span>
        )}
      </div>
      <div
        className={cn(
          'flex flex-1 flex-col justify-between',
          isCompact ? 'gap-2 p-3' : 'gap-3 p-4 lg:p-5'
        )}
      >
        <span
          className={cn(
            'line-clamp-2 font-semibold transition-colors',
            isCompact ? 'text-sm leading-5' : 'text-base leading-6',
            isSprintTheme ? 'text-slate-100 group-hover:text-[#9CC0FF]' : 'text-text group-hover:text-action-blue'
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            'font-medium',
            isCompact ? 'text-xs' : 'text-sm',
            isSprintTheme ? 'text-[#7AA2FF]' : 'text-slate-500'
          )}
        >
          {actionLabel ?? `Открыть ${typeLabel.toLowerCase()}`}
        </span>
      </div>
    </Link>
  )
}
