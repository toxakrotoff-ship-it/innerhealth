import { MarketingBentoGrid } from '@/components/site/marketing-bento-grid'
import {
  HYDRO_CATEGORY_BENTO_TILES,
  HYDRO_MARKETING_BENTO_GRID_CLASS,
  HYDRO_MARKETING_BENTO_TILE_LAYOUT_CLASSES,
} from '@/content/hydro-category-bento'

export interface HydroCategoryBenefitsBentoProps {
  readonly className?: string
}

/** Bento для `/catalog/hydro`; данные и раскладка — в `hydro-category-bento.ts`. */
export function HydroCategoryBenefitsBento({ className }: HydroCategoryBenefitsBentoProps) {
  return (
    <MarketingBentoGrid
      tiles={HYDRO_CATEGORY_BENTO_TILES}
      gridClassName={HYDRO_MARKETING_BENTO_GRID_CLASS}
      tileLayoutClasses={HYDRO_MARKETING_BENTO_TILE_LAYOUT_CLASSES}
      ariaLabel="Ключевые свойства линейки"
      className={className}
    />
  )
}
