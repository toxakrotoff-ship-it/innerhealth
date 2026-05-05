import type { MarketingBentoTile } from '@/types/marketing-bento-tile'

export const BCAA6000_BENTO_SECTION_HEADING = 'Преимущества BCAA 6000'

export const BCAA6000_MARKETING_BENTO_GRID_CLASS =
  'grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3 lg:grid-rows-6 lg:gap-4'

/**
 * Раскладка как на коллаже:
 * - слева 4 плитки (2 высоких + 2 низких),
 * - по центру 4 плитки,
 * - справа 2 высоких плитки.
 */
export const BCAA6000_MARKETING_BENTO_TILE_LAYOUT_CLASSES: readonly string[] = [
  // left column
  'lg:col-start-1 lg:row-start-1 lg:row-span-2 min-h-[220px] lg:min-h-0',
  'lg:col-start-1 lg:row-start-3 lg:row-span-1 min-h-[160px] lg:min-h-0',
  'lg:col-start-1 lg:row-start-4 lg:row-span-2 min-h-[220px] lg:min-h-0',
  'lg:col-start-1 lg:row-start-6 lg:row-span-1 min-h-[160px] lg:min-h-0',
  // middle column
  'lg:col-start-2 lg:row-start-1 lg:row-span-1 min-h-[140px] lg:min-h-0',
  'lg:col-start-2 lg:row-start-2 lg:row-span-2 min-h-[220px] lg:min-h-0',
  'lg:col-start-2 lg:row-start-4 lg:row-span-1 min-h-[140px] lg:min-h-0',
  'lg:col-start-2 lg:row-start-5 lg:row-span-2 min-h-[220px] lg:min-h-0',
  // right column
  'lg:col-start-3 lg:row-start-1 lg:row-span-3 min-h-[260px] lg:min-h-0',
  'lg:col-start-3 lg:row-start-4 lg:row-span-3 min-h-[260px] lg:min-h-0',
] as const

export const BCAA6000_CATEGORY_BENTO_TILES: readonly MarketingBentoTile[] = [
  {
    id: 'catabolism',
    title: 'Снижает уровень катаболизма, повышает энергопотенциал белковых клеток, ускоряет процессы восстановления',
    imageSrc: '/images/catalog/bcaa6000-bento/01-catabolism.png',
    imageObjectPosition: '50% 36%',
  },
  {
    id: 'creatine',
    title: 'Участвует в синтезе креатина в мышцах, повышая тем самым мышечную работоспособность',
    imageSrc: '/images/catalog/bcaa6000-bento/02-creatine.png',
    imageObjectPosition: '55% 45%',
  },
  {
    id: 'detox',
    title:
      'Улучшает детоксикацию печени, почек, поддерживает процесс очистки организма от белковых шлаков, азота, свободного аммиака, препятствует образованию тромбов и развитию атеросклероза',
    imageSrc: '/images/catalog/bcaa6000-bento/03-detox.png',
    imageObjectPosition: '55% 35%',
  },
  {
    id: 'arteries',
    title:
      'Уменьшает напряжённость гладкой мускулатуры артерий, способствует профилактике сердечно-сосудистых заболеваний',
    imageSrc: '/images/catalog/bcaa6000-bento/04-arteries.png',
    imageObjectPosition: '62% 40%',
  },
  {
    id: 'weight',
    title: 'Стимулирует рост мышечной массы, сокращает жировую ткань, способствует нормализации веса',
    imageSrc: '/images/catalog/bcaa6000-bento/05-weight.png',
    imageObjectPosition: '55% 45%',
  },
  {
    id: 'insulin',
    title: 'Активизирует процессы поступления в кровоток инсулина, глюкагона и выброс гормона роста',
    imageSrc: '/images/catalog/bcaa6000-bento/06-insulin.png',
    imageObjectPosition: '50% 26%',
  },
  {
    id: 'testosterone',
    title: 'Активирует выработку тестостерона',
    imageSrc: '/images/catalog/bcaa6000-bento/07-testosterone.png',
    imageObjectPosition: '52% 35%',
  },
  {
    id: 'activity',
    title:
      'Добавляет активности, выносливости, повышает скорость передачи нервных импульсов в головном мозге, увеличивает выработку соматотропного гормона',
    imageSrc: '/images/catalog/bcaa6000-bento/08-activity.png',
    imageObjectPosition: '55% 40%',
  },
  {
    id: 'regeneration',
    title: 'Увеличивает скорость регенерации поврежденных тканей, сухожилий, костных структур',
    imageSrc: '/images/catalog/bcaa6000-bento/09-regeneration.png',
    imageObjectPosition: '65% 45%',
  },
  {
    id: 'gut',
    title:
      'Обеспечивает рост полезной микрофлоры кишечника, улучшает перистальтику, нормализует стул, снижает риск возникновения воспалительных процессов',
    imageSrc: '/images/catalog/bcaa6000-bento/10-gut.png',
    imageObjectPosition: '62% 55%',
  },
] as const

