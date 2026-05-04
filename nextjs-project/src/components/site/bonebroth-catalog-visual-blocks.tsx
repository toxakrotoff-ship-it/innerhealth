import { MarketingBentoGrid } from '@/components/site/marketing-bento-grid'
import {
  BONE_BROTH_COMPOSITION_BENTO_GRID_CLASS,
  BONE_BROTH_COMPOSITION_BENTO_TILE_LAYOUT_CLASSES,
  BONE_BROTH_COMPOSITION_BENTO_TILES,
  BONE_BROTH_COMPOSITION_CALLOUT,
  BONE_BROTH_COMPOSITION_HEADING,
  BONE_BROTH_COMPOSITION_INGREDIENTS,
  BONE_BROTH_PRODUCT_DESCRIPTION,
} from '@/content/bonebroth-catalog-screens'
import { cn } from '@/lib/utils'

const sectionCard =
  'rounded-2xl border border-slate-600/60 bg-slate-100 px-5 py-8 text-slate-900 shadow-sm sm:px-8 sm:py-10'

export interface BoneBrothCatalogVisualBlocksProps {
  readonly className?: string
}

/** Описание продукта — до TipTap (вёрстка в стиле Sprint / hydro-карточки). */
export function BoneBrothProductDescriptionScreen({ className }: BoneBrothCatalogVisualBlocksProps) {
  const { heading, introPoints, gridCells } = BONE_BROTH_PRODUCT_DESCRIPTION

  return (
    <section
      className={cn('mt-10 sm:mt-12', className)}
      aria-labelledby="bonebroth-product-description-heading"
    >
      <div className={sectionCard}>
        <h2
          id="bonebroth-product-description-heading"
          className="mb-8 text-center text-xl font-bold uppercase tracking-wide text-slate-950 sm:mb-10 sm:text-2xl"
        >
          {heading}
        </h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          {introPoints.map((text, index) => (
            <div key={index} className="flex gap-4">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-semibold text-white shadow-sm"
                aria-hidden
              >
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-slate-800 sm:text-[0.9375rem]">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-300 pt-10">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-slate-300 sm:grid-cols-2">
            {gridCells.map((cell) => (
              <div key={cell.title} className="bg-slate-100 px-5 py-6 sm:px-6 sm:py-8">
                <h3 className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-slate-950 sm:text-base">
                  {cell.title}
                </h3>
                <p className="text-center text-sm leading-relaxed text-slate-700">{cell.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Состав и блок преимуществ с фото-сеткой — после TipTap. */
export function BoneBrothCompositionAndBenefitsScreen({ className }: BoneBrothCatalogVisualBlocksProps) {
  return (
    <section
      className={cn('mt-12 sm:mt-14', className)}
      aria-labelledby="bonebroth-composition-heading"
    >
      <div className={sectionCard}>
        <h2
          id="bonebroth-composition-heading"
          className="mb-8 text-center text-xl font-bold tracking-tight text-slate-950 sm:mb-10 sm:text-2xl"
        >
          {BONE_BROTH_COMPOSITION_HEADING}
        </h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6 lg:gap-8">
          {BONE_BROTH_COMPOSITION_INGREDIENTS.map((item, index) => (
            <div key={item.term} className="flex gap-4">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-semibold text-white shadow-sm"
                aria-hidden
              >
                {index + 1}
              </span>
              <p className="text-sm leading-relaxed text-slate-800 sm:text-[0.9375rem]">
                <span className="font-semibold text-slate-950">{item.term}</span>
                {' — '}
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex gap-4 rounded-xl border border-slate-300 bg-white/90 p-4 sm:p-5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white"
            aria-hidden
          >
            i
          </div>
          <p className="text-sm leading-relaxed text-slate-800 sm:text-[0.9375rem]">
            {BONE_BROTH_COMPOSITION_CALLOUT}
          </p>
        </div>

        <MarketingBentoGrid
          className="mt-8 sm:mt-10"
          tiles={BONE_BROTH_COMPOSITION_BENTO_TILES}
          gridClassName={BONE_BROTH_COMPOSITION_BENTO_GRID_CLASS}
          tileLayoutClasses={BONE_BROTH_COMPOSITION_BENTO_TILE_LAYOUT_CLASSES}
          ariaLabel="Преимущества костного бульона для спортсменов"
        />
      </div>
    </section>
  )
}
