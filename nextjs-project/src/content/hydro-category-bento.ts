import type { MarketingBentoTile } from '@/types/marketing-bento-tile'

/**
 * Статический контент блоков категории `/catalog/hydro` (Sprint Power).
 *
 * **Описание продукта** (над bento и TipTap) — `HYDRO_CATEGORY_PRODUCT_DESCRIPTION`.
 *
 * **Bento:** плитки — `HYDRO_CATEGORY_BENTO_TILES`, сетка — `HYDRO_MARKETING_BENTO_*` (передайте в `MarketingBentoGrid` на других страницах).
 */
export interface HydroCategoryProductDescription {
  readonly heading: string
  readonly points: readonly string[]
}

export const HYDRO_CATEGORY_PRODUCT_DESCRIPTION: HydroCategoryProductDescription = {
  heading: 'Описание продукта',
  points: [
    'Белок птицы гидролизованный куриный, характеризующийся высоким содержанием белковых веществ, выделенный из куриного сырья (мышечная, костная, соединительная ткани)',
    'Продукт растворим в воде, произведён путем гидролиза с использованием ферментов, последующей механической, термической обработкой, высушенный на распылительной сушке',
    'Протеин, гидролизованный под действием ферментов, лучше, чем белок, сохраняет аминокислотный профиль продукта. Размер одной порции 10 г (мерная ложка)',
  ],
}

export const HYDRO_MARKETING_BENTO_GRID_CLASS =
  'grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-5 lg:gap-4'

export const HYDRO_MARKETING_BENTO_TILE_LAYOUT_CLASSES: readonly string[] = [
  'lg:col-span-2 lg:row-span-3 lg:col-start-1 lg:row-start-1 min-h-[220px] lg:min-h-0',
  'lg:col-start-3 lg:row-start-1 lg:col-span-1 lg:row-span-1 min-h-[140px]',
  'lg:col-start-3 lg:row-start-2 lg:col-span-1 lg:row-span-2 min-h-[180px]',
  'lg:col-start-4 lg:row-start-1 lg:col-span-1 lg:row-span-3 min-h-[200px]',
  'lg:col-start-1 lg:row-start-4 lg:col-span-2 lg:row-span-1 min-h-[140px]',
  'lg:col-start-1 lg:row-start-5 lg:col-span-3 lg:row-span-1 min-h-[160px]',
  'lg:col-start-3 lg:row-start-4 lg:col-span-1 lg:row-span-1 min-h-[130px]',
  'lg:col-start-4 lg:row-start-4 lg:col-span-1 lg:row-span-2 min-h-[160px]',
]

export const HYDRO_CATEGORY_BENTO_TILES: readonly MarketingBentoTile[] = [
  {
    id: 'taste',
    title: 'Приятный вкус',
    body: 'Продукт при приеме не обладает горьковатым вкусом. Так как за этот вкус отвечают свободные аминокислоты, а в гидролизованном протеине их содержание не превышает 3%. Такое содержание аминокислот удается достичь благодаря управляемости ферментативного гидролиза.',
    imageSrc: '/images/catalog/hydro-bento/01-taste.png',
  },
  {
    id: 'glucose',
    title: 'Помогает регулировать уровень сахара в крови',
    imageSrc: '/images/catalog/hydro-bento/02-glucose.png',
  },
  {
    id: 'immune',
    title: 'Устраняет симптомы угнетения иммунитета',
    imageSrc: '/images/catalog/hydro-bento/03-immune.png',
  },
  {
    id: 'absorption',
    title: 'Обладает максимальной скоростью усвоения',
    body: 'Гидролизованный протеин практически не требует времени на переваривание и относится к сверхбыстрым белковым продуктам, так как начинает усваиваться сразу после поступления. Одна порция на пустой желудок полностью усваивается через 20-30 минут.',
    imageSrc: '/images/catalog/hydro-bento/04-absorption.png',
  },
  {
    id: 'ldl',
    title: 'Снижает содержание в крови гликопротеинов низкой плотности',
    imageSrc: '/images/catalog/hydro-bento/05-ldl.png',
  },
  {
    id: 'glycogen',
    title: 'Более быстрое восполнение запасов гликогена в мышцах после тренировки',
    body: 'Было проведено исследование, в котором сравнивались анаболические свойства свободных аминокислот и гидролизата протеина. Оказалось, что набор массы протекал быстрее в случае использования гидролизованного белка, также были выше показатели задержки азота и концентрация глютамина в мышцах.',
    imageSrc: '/images/catalog/hydro-bento/06-glycogen.png',
  },
  {
    id: 'insulin',
    title: 'Более высокая способность стимулировать секрецию инсулина',
    imageSrc: '/images/catalog/hydro-bento/07-insulin.png',
  },
  {
    id: 'tolerance',
    title: 'Лучшая переносимость',
    body: 'Данный вид протеина имеет высокую степень очистки, поэтому практически не содержит жира и углеводов, а также обладает наилучшей переносимостью и минимальной аллергенностью.',
    imageSrc: '/images/catalog/hydro-bento/08-tolerance.png',
  },
]
