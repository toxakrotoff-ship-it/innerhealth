import type { MarketingBentoTile } from '@/types/marketing-bento-tile'

/**
 * Bento для `/catalog/bonebroth` и `sp-bonebroth` (Sprint Power): четыре визуальные плитки
 * поверх `public/images/catalog/bonebroth-bento/01.png` … `04.png`.
 */
export const BONE_BROTH_MARKETING_BENTO_GRID_CLASS =
  'grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-2 lg:gap-4'

export const BONE_BROTH_MARKETING_BENTO_TILE_LAYOUT_CLASSES: readonly string[] = [
  'min-h-[200px] lg:min-h-[240px]',
  'min-h-[200px] lg:min-h-[240px]',
  'min-h-[200px] lg:min-h-[240px]',
  'min-h-[200px] lg:min-h-[240px]',
]

export const BONE_BROTH_CATEGORY_BENTO_TILES: readonly MarketingBentoTile[] = [
  {
    id: 'connective',
    title: 'Опора соединительной ткани',
    body: 'Интерес для спортсменов — гликозамингликаны, хондроитин и глюкозамин из матрикса кости и хряща: компоненты, с которыми связывают поддержку суставов и связок.',
    imageSrc: '/images/catalog/bonebroth-bento/01.png',
    imageObjectPosition: '48% 46%',
  },
  {
    id: 'load',
    title: 'В ритме нагрузок',
    body: 'Удобный формат порции после тренировки или в плотном графике: сосредоточьтесь на восстановлении, не отвлекаясь на сложный рацион.',
    imageSrc: '/images/catalog/bonebroth-bento/02.png',
    imageObjectPosition: '50% 44%',
  },
  {
    id: 'protein',
    title: 'Белок и аминокислоты',
    body: 'Костной бульон даёт полноценный белок и характерный аминокислотный профиль — в том числе для синтеза коллагена и восстановительных процессов.',
    imageSrc: '/images/catalog/bonebroth-bento/03.png',
    imageObjectPosition: '46% 42%',
  },
  {
    id: 'natural',
    title: 'Естественная основа',
    body: 'Продукт из костного сырья и традиционной логики варки — без «химического» ощущения добавки; подходит тем, кто ценит натуральный источник питательных веществ.',
    imageSrc: '/images/catalog/bonebroth-bento/04.png',
    imageObjectPosition: '52% 40%',
  },
]
