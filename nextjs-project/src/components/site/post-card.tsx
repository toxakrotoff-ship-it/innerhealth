import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface PostCardProps {
  href: string
  title: string
  previewImage: string | null
  typeLabel: string
  isSprintTheme?: boolean
  actionLabel?: string
}

export function PostCard({
  href,
  title,
  previewImage,
  typeLabel,
  isSprintTheme = false,
  actionLabel,
}: PostCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border transition-all',
        isSprintTheme
          ? 'border-[#1B2946] bg-[#0F172A] hover:border-[#3B82F6] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.25)]'
          : 'border-gray-200 bg-white hover:border-action-blue hover:shadow-sm'
      )}
    >
      <div
        className={cn(
          'relative aspect-[4/3] w-full shrink-0 overflow-hidden lg:aspect-[16/11]',
          isSprintTheme ? 'bg-slate-900' : 'bg-gray-100'
        )}
      >
        {previewImage ? (
          <Image
            src={previewImage.startsWith('/') ? previewImage : `/${previewImage}`}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, (max-width: 1919px) 33vw, 25vw"
          />
        ) : (
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center text-sm',
              isSprintTheme ? 'text-slate-500' : 'text-gray-400'
            )}
          >
            {typeLabel}
          </span>
        )}
        <span
          className={cn(
            'absolute left-4 top-4 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
            isSprintTheme
              ? 'bg-white/10 text-slate-100 backdrop-blur'
              : 'bg-white/90 text-slate-900 backdrop-blur'
          )}
        >
          {typeLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3 p-4 lg:p-5">
        <span
          className={cn(
            'line-clamp-2 text-base font-semibold leading-6 transition-colors',
            isSprintTheme ? 'text-slate-100 group-hover:text-[#9CC0FF]' : 'text-text group-hover:text-action-blue'
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            'text-sm font-medium',
            isSprintTheme ? 'text-[#7AA2FF]' : 'text-slate-500'
          )}
        >
          {actionLabel ?? `Открыть ${typeLabel.toLowerCase()}`}
        </span>
      </div>
    </Link>
  )
}
