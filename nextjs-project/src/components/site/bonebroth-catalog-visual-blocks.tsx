import Image from 'next/image'
import {
  BONE_BROTH_SCREEN_COMPOSITION_SIZE,
  BONE_BROTH_SCREEN_COMPOSITION_SRC,
  BONE_BROTH_SCREEN_PRODUCT_DESCRIPTION_SIZE,
  BONE_BROTH_SCREEN_PRODUCT_DESCRIPTION_SRC,
} from '@/content/bonebroth-catalog-visuals'
import { cn } from '@/lib/utils'

export interface BoneBrothCatalogVisualBlocksProps {
  readonly className?: string
}

/** Макет «Описание продукта» — до TipTap. */
export function BoneBrothProductDescriptionScreen({ className }: BoneBrothCatalogVisualBlocksProps) {
  return (
    <figure
      className={cn(
        'mt-10 overflow-hidden rounded-2xl border border-slate-600/80 bg-[#0B1222]/40 shadow-lg shadow-black/20 sm:mt-12',
        className
      )}
    >
      <Image
        src={BONE_BROTH_SCREEN_PRODUCT_DESCRIPTION_SRC}
        alt="Описание продукта: костной бульон — состав, применение, безопасность, противопоказания, условия хранения"
        width={BONE_BROTH_SCREEN_PRODUCT_DESCRIPTION_SIZE.width}
        height={BONE_BROTH_SCREEN_PRODUCT_DESCRIPTION_SIZE.height}
        className="h-auto w-full object-contain"
        sizes="(max-width: 1280px) 100vw, 1200px"
      />
    </figure>
  )
}

/** Макет «В составе костного бульона есть» — после TipTap. */
export function BoneBrothCompositionAndBenefitsScreen({ className }: BoneBrothCatalogVisualBlocksProps) {
  return (
    <figure
      className={cn(
        'mt-12 overflow-hidden rounded-2xl border border-slate-600/80 bg-[#0B1222]/40 shadow-lg shadow-black/20',
        className
      )}
    >
      <Image
        src={BONE_BROTH_SCREEN_COMPOSITION_SRC}
        alt="Состав костного бульона: гликозамингликаны, хондроитин, глюкозамин и преимущества для спортсменов"
        width={BONE_BROTH_SCREEN_COMPOSITION_SIZE.width}
        height={BONE_BROTH_SCREEN_COMPOSITION_SIZE.height}
        className="h-auto w-full object-contain"
        sizes="(max-width: 1280px) 100vw, 1200px"
      />
    </figure>
  )
}
