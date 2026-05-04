import Image from 'next/image'
import type { MarketingBentoTile } from '@/types/marketing-bento-tile'
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

export interface MarketingBentoGridProps {
  readonly tiles: readonly MarketingBentoTile[]
  /** Классы контейнера сетки, например `grid ... lg:grid-cols-4 lg:grid-rows-5`. */
  readonly gridClassName: string
  /** По одному классу раскладки на плитку (длина = `tiles.length`). */
  readonly tileLayoutClasses: readonly string[]
  /** Подпись секции для a11y, если нет видимого `heading`. */
  readonly ariaLabel?: string
  readonly className?: string
  /** Опциональный заголовок секции над сеткой. */
  readonly heading?: string
  readonly headingClassName?: string
  readonly headingId?: string
  /** Классы для `<h2>`/`<h3>` заголовка внутри каждой плитки (например uppercase для коллагена). */
  readonly tileTitleClassName?: string
}

function MarketingBentoTileView({
  tile,
  gradientClass,
  layoutClassName,
  tileTitleClassName,
}: {
  readonly tile: MarketingBentoTile
  readonly gradientClass: string
  readonly layoutClassName: string
  readonly tileTitleClassName?: string
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
            className={cn(
              'object-cover transition-transform duration-500 group-hover:scale-[1.03]',
              !tile.imageObjectPosition && 'object-center'
            )}
            style={
              tile.imageObjectPosition ? { objectPosition: tile.imageObjectPosition } : undefined
            }
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
        <h3
          className={cn(
            'text-base font-semibold leading-snug tracking-tight text-white drop-shadow-md sm:text-lg',
            tileTitleClassName
          )}
        >
          {tile.title}
        </h3>
        {tile.body ? (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/85 drop-shadow">{tile.body}</p>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Универсальная bento-сетка для витрины: данные и геометрия задаются снаружи (`tiles` + `tileLayoutClasses`).
 * Для новой страницы: заведите массив плиток и массив классов той же длины в `src/content/...`.
 */
export function MarketingBentoGrid({
  tiles,
  gridClassName,
  tileLayoutClasses,
  ariaLabel,
  className,
  heading,
  headingClassName,
  headingId = 'marketing-bento-heading',
  tileTitleClassName,
}: MarketingBentoGridProps) {
  if (tiles.length === 0 || tiles.length !== tileLayoutClasses.length) {
    return null
  }
  if (!heading && !(ariaLabel && ariaLabel.trim())) {
    return null
  }

  return (
    <section
      className={cn('mt-10 sm:mt-12', className)}
      {...(heading ? { 'aria-labelledby': headingId } : { 'aria-label': ariaLabel ?? '' })}
    >
      {heading ? (
        <h2
          id={headingId}
          className={cn(
            'mb-6 text-center text-lg font-bold uppercase tracking-wide text-slate-100 sm:mb-8 sm:text-xl',
            headingClassName
          )}
        >
          {heading}
        </h2>
      ) : null}
      <div className={cn(gridClassName)}>
        {tiles.map((tile, index) => (
          <MarketingBentoTileView
            key={tile.id}
            tile={tile}
            gradientClass={PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length]}
            layoutClassName={tileLayoutClasses[index] ?? ''}
            tileTitleClassName={tileTitleClassName}
          />
        ))}
      </div>
    </section>
  )
}
