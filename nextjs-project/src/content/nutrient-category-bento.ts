import type { MarketingBentoTile } from '@/types/marketing-bento-tile'

export const NUTRIENT_CATEGORY_BENTO_TILES: readonly MarketingBentoTile[] = [
  {
    id: 'restore-testosterone-secretion',
    title: 'восстанавливает секрецию тестостерона',
    imageSrc: '/images/catalog/nutrient/01.png',
    imageObjectPosition: '50% 30%',
  },
  {
    id: 'normalize-spermatogenesis',
    title: 'нормализует показатели сперматогенеза, повышает фертильность',
    imageSrc: '/images/catalog/nutrient/03.png',
    imageObjectPosition: '50% 28%',
  },
  {
    id: 'improve-libido',
    title: 'улучшает либидо, эректильную функцию и качество сексуальной жизни',
    imageSrc: '/images/catalog/nutrient/05.png',
    imageObjectPosition: '60% 30%',
  },
  {
    id: 'metabolism-and-muscle-growth',
    title:
      'помогает наладить обмен веществ, уменьшить жировую ткань и активировать рост мышечной массы',
    imageSrc: '/images/catalog/nutrient/04.png',
    imageObjectPosition: '45% 30%',
  },
  {
    id: 'physical-activity-and-recovery',
    title:
      'увеличивает физическую активность, работоспособность, выносливость, сокращает время восстановления после физических нагрузок',
    imageSrc: '/images/catalog/nutrient/02.png',
    imageObjectPosition: '55% 25%',
  },
] as const

export const NUTRIENT_MARKETING_BENTO_GRID_CLASS =
  'grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3 lg:auto-rows-[11rem] lg:gap-4'

export const NUTRIENT_MARKETING_BENTO_TILE_LAYOUT_CLASSES: readonly string[] = [
  // Left tall
  'lg:col-start-1 lg:row-start-1 lg:col-span-1 lg:row-span-2 min-h-[220px]',
  // Center top small
  'lg:col-start-2 lg:row-start-1 lg:col-span-1 lg:row-span-1 min-h-[150px]',
  // Right tall (dominant)
  'lg:col-start-3 lg:row-start-1 lg:col-span-1 lg:row-span-3 min-h-[280px]',
  // Center wide bottom
  'lg:col-start-2 lg:row-start-2 lg:col-span-1 lg:row-span-2 min-h-[220px]',
  // Left bottom small
  'lg:col-start-1 lg:row-start-3 lg:col-span-1 lg:row-span-1 min-h-[150px]',
] as const

