import { MarketingBentoGrid } from '@/components/site/marketing-bento-grid'
import {
  BCAA6000_BENTO_SECTION_HEADING,
  BCAA6000_CATEGORY_BENTO_TILES,
  BCAA6000_MARKETING_BENTO_GRID_CLASS,
  BCAA6000_MARKETING_BENTO_TILE_LAYOUT_CLASSES,
} from '@/content/bcaa6000-category-bento'

export interface Bcaa6000CategoryBenefitsBentoProps {
  readonly className?: string
}

export function Bcaa6000CategoryBenefitsBento({ className }: Bcaa6000CategoryBenefitsBentoProps) {
  return (
    <MarketingBentoGrid
      tiles={BCAA6000_CATEGORY_BENTO_TILES}
      gridClassName={BCAA6000_MARKETING_BENTO_GRID_CLASS}
      tileLayoutClasses={BCAA6000_MARKETING_BENTO_TILE_LAYOUT_CLASSES}
      heading={BCAA6000_BENTO_SECTION_HEADING}
      headingId="bcaa6000-bento-heading"
      tileTitleClassName="text-xs font-bold uppercase tracking-[0.08em] text-white sm:text-sm"
      className={className}
    />
  )
}

