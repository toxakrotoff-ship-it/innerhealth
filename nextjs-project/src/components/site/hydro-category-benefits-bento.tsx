import Image from 'next/image'
import type { HydroCategoryBentoTile } from '@/content/hydro-category-bento'
import { cn } from '@/lib/utils'

const PLACEHOLDER_GRADIENTS: readonly string[] = [
  'from-slate-800 via-slate-900 to-[#0B1222]',
  'from-slate-900 via-[#0f172a] to-slate-950',
  'from-[#0f172a] via-slate-900 to-slate-950',
  'from-slate-800 via-[#111827] to-[#060A14]',
  'from-slate-900 to-[#0B1222]',
  'from-[#1e293b] via-slate-900 to-[#0f172a]',
  'from-slate-800 to-slate-950',
  'from-[#0f172a] via-[#1e293b] to-[#060A14]',
]

export interface HydroCategoryBenefitsBentoProps {
  readonly tiles: readonly HydroCategoryBentoTile[]
  readonly className?: string
}

function BentoTile({
  tile,
  gradientClass,
  layoutClassName,
}: {
  readonly tile: HydroCategoryBentoTile
  readonly gradientClass: string
  readonly layoutClassName: string
}) {
  const hasImage = Boolean(tile.imageSrc)

  return (
    <div
      className={cn(
        'group relative min-h-[160px] overflow-hidden rounded-2xl border border-slate-700/80 shadow-lg shadow-black/20 lg:min-h-0',
        layoutClassName
      )}
    >
      {hasImage && tile.imageSrc ? (
        <>
          <Image
            src={tile.imageSrc}
            alt=""
            fill
            className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 1024px) 100vw, 25vw"
          />
          <div
            className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-transparent"
            aria-hidden
          />
        </>
      ) : (
        <div
          className={cn(
            'absolute inset-0 bg-linear-to-br',
            gradientClass,
            'opacity-95 transition-opacity group-hover:opacity-100'
          )}
          aria-hidden
        />
      )}

      <div className="relative z-10 flex h-full min-h-[160px] flex-col justify-end p-4 sm:p-5 lg:min-h-0">
        <h2 className="text-base font-semibold leading-snug tracking-tight text-white drop-shadow-md sm:text-lg">
          {tile.title}
        </h2>
        {tile.body ? (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/85 drop-shadow">{tile.body}</p>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Sprint Power /catalog/hydro: визуальный блок преимуществ (bento-сетка).
 * Порядок плиток на десктопе задан классами; на мобиле — одна колонка по порядку данных.
 */
export function HydroCategoryBenefitsBento({ tiles, className }: HydroCategoryBenefitsBentoProps) {
  if (tiles.length !== 8) {
    return null
  }

  const layoutClasses: readonly string[] = [
    'lg:col-span-2 lg:row-span-3 lg:col-start-1 lg:row-start-1 min-h-[220px] lg:min-h-0',
    'lg:col-start-3 lg:row-start-1 lg:col-span-1 lg:row-span-1 min-h-[140px]',
    'lg:col-start-3 lg:row-start-2 lg:col-span-1 lg:row-span-2 min-h-[180px]',
    'lg:col-start-4 lg:row-start-1 lg:col-span-1 lg:row-span-3 min-h-[200px]',
    'lg:col-start-1 lg:row-start-4 lg:col-span-2 lg:row-span-1 min-h-[140px]',
    'lg:col-start-1 lg:row-start-5 lg:col-span-3 lg:row-span-1 min-h-[160px]',
    'lg:col-start-3 lg:row-start-4 lg:col-span-1 lg:row-span-1 min-h-[130px]',
    'lg:col-start-4 lg:row-start-4 lg:col-span-1 lg:row-span-2 min-h-[160px]',
  ]

  return (
    <section
      className={cn('mt-10 sm:mt-12', className)}
      aria-label="Ключевые свойства линейки"
    >
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-5 lg:gap-4">
        {tiles.map((tile, index) => (
          <BentoTile
            key={tile.id}
            tile={tile}
            gradientClass={PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length]}
            layoutClassName={layoutClasses[index] ?? ''}
          />
        ))}
      </div>
    </section>
  )
}
