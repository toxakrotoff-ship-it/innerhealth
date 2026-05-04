import { MarketingBentoGrid } from '@/components/site/marketing-bento-grid'
import {
  COLLAGEN_BENTO_SECTION_HEADING,
  COLLAGEN_CATEGORY_BENTO_TILES,
  COLLAGEN_MARKETING_BENTO_GRID_CLASS,
  COLLAGEN_MARKETING_BENTO_TILE_LAYOUT_CLASSES,
} from '@/content/collagen-category-line'

export interface CollagenCategoryBenefitsBentoProps {
  readonly className?: string
}

/** Bento преимуществ для `/catalog/collagen`; данные — в `collagen-category-line.ts`. */
export function CollagenCategoryBenefitsBento({ className }: CollagenCategoryBenefitsBentoProps) {
  return (
    <MarketingBentoGrid
      tiles={COLLAGEN_CATEGORY_BENTO_TILES}
      gridClassName={COLLAGEN_MARKETING_BENTO_GRID_CLASS}
      tileLayoutClasses={COLLAGEN_MARKETING_BENTO_TILE_LAYOUT_CLASSES}
      heading={COLLAGEN_BENTO_SECTION_HEADING}
      headingId="collagen-line-bento-heading"
      tileTitleClassName="text-xs font-bold uppercase tracking-wide text-white sm:text-sm"
      className={className}
    />
  )
}
