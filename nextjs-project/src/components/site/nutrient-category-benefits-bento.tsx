import { MarketingBentoGrid } from '@/components/site/marketing-bento-grid'
import {
  NUTRIENT_CATEGORY_BENTO_TILES,
  NUTRIENT_MARKETING_BENTO_GRID_CLASS,
  NUTRIENT_MARKETING_BENTO_TILE_LAYOUT_CLASSES,
} from '@/content/nutrient-category-bento'

export interface NutrientCategoryBenefitsBentoProps {
  readonly className?: string
}

/** Bento для `/catalog/nutrient`; временно использует коллаж-картинку с кропами через `objectPosition`. */
export function NutrientCategoryBenefitsBento({ className }: NutrientCategoryBenefitsBentoProps) {
  return (
    <MarketingBentoGrid
      tiles={NUTRIENT_CATEGORY_BENTO_TILES}
      gridClassName={NUTRIENT_MARKETING_BENTO_GRID_CLASS}
      tileLayoutClasses={NUTRIENT_MARKETING_BENTO_TILE_LAYOUT_CLASSES}
      ariaLabel="Ключевые свойства"
      className={className}
      tileTitleClassName="text-sm font-semibold leading-snug tracking-tight text-white sm:text-base"
    />
  )
}

