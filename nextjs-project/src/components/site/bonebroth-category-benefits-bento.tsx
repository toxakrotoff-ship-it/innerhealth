import { MarketingBentoGrid } from '@/components/site/marketing-bento-grid'
import {
  BONE_BROTH_CATEGORY_BENTO_TILES,
  BONE_BROTH_MARKETING_BENTO_GRID_CLASS,
  BONE_BROTH_MARKETING_BENTO_TILE_LAYOUT_CLASSES,
} from '@/content/bonebroth-category-bento'

export interface BoneBrothCategoryBenefitsBentoProps {
  readonly className?: string
}

/** Bento для категории костного бульона (Sprint); данные — в `bonebroth-category-bento.ts`. */
export function BoneBrothCategoryBenefitsBento({ className }: BoneBrothCategoryBenefitsBentoProps) {
  return (
    <MarketingBentoGrid
      tiles={BONE_BROTH_CATEGORY_BENTO_TILES}
      gridClassName={BONE_BROTH_MARKETING_BENTO_GRID_CLASS}
      tileLayoutClasses={BONE_BROTH_MARKETING_BENTO_TILE_LAYOUT_CLASSES}
      ariaLabel="Костной бульон: польза для спортсменов"
      className={className}
    />
  )
}
