import type { MarketingBentoTile } from '@/types/marketing-bento-tile'

/** Шесть ячеек сетки «описание / КБЖУ / применение…» над TipTap на `/catalog/collagen`. */
export interface CollagenSpecCell {
  readonly id: string
  readonly title: string
  readonly body: string
}

export const COLLAGEN_SPEC_CELLS: readonly CollagenSpecCell[] = [
  {
    id: 'description',
    title: 'Описание',
    body: 'Содержание в суточной дозе (4 таблетки): коллаген (в т. ч. глицин) — 1700 мг (350 мг), витамин С — 84 мг.',
  },
  {
    id: 'nutrition',
    title: 'Пищевая и энергетическая ценность в 1 таблетке',
    body: 'Белки — 0,425 г, пищевые волокна — 0,025 г, 1,75 ккал.',
  },
  {
    id: 'usage',
    title: 'Применение',
    body: 'Взрослым по 2 таблетки 2 раза в день или по 4 таблетки 1 раз в день во время еды. Продолжительность приёма — 1 месяц. При необходимости приём можно повторить.',
  },
  {
    id: 'safety',
    title: 'Безопасность',
    body: 'Система менеджмента качества и безопасности предприятия соответствует требованиям GMP и ISO 22000. Производство осуществляется под строгим контролем процесса и качества.',
  },
  {
    id: 'contra',
    title: 'Противопоказания',
    body: 'Индивидуальная непереносимость компонентов продукта.',
  },
  {
    id: 'storage',
    title: 'Условия хранения',
    body: 'Хранить в сухом месте, защищённом от прямых солнечных лучей и недоступном для детей, при температуре не выше 25 °C.',
  },
]

export const COLLAGEN_BENTO_SECTION_HEADING =
  'Преимущества коллагена для спортсменов всех возрастов и уровней'

export const COLLAGEN_MARKETING_BENTO_GRID_CLASS =
  'grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-5 lg:gap-4'

/** Раскладка как на макете: крупный блок слева, узкий столбец справа и нижний ряд. */
export const COLLAGEN_MARKETING_BENTO_TILE_LAYOUT_CLASSES: readonly string[] = [
  'lg:col-span-2 lg:row-span-3 lg:col-start-1 lg:row-start-1 min-h-[220px] lg:min-h-0',
  'lg:col-start-3 lg:row-start-1 lg:col-span-1 lg:row-span-1 min-h-[140px]',
  'lg:col-start-3 lg:row-start-2 lg:col-span-1 lg:row-span-2 min-h-[180px]',
  'lg:col-start-4 lg:row-start-1 lg:col-span-1 lg:row-span-3 min-h-[200px]',
  'lg:col-start-1 lg:row-start-4 lg:col-span-2 lg:row-span-1 min-h-[140px]',
  'lg:col-start-1 lg:row-start-5 lg:col-span-3 lg:row-span-1 min-h-[160px]',
  'lg:col-start-4 lg:row-start-4 lg:col-span-1 lg:row-span-2 min-h-[160px]',
  'lg:col-start-3 lg:row-start-4 lg:col-span-1 lg:row-span-1 min-h-[130px]',
]

/** Файлы: `public/images/catalog/collagen-bento/01-…08-*.png` (порядок совпадает с плитками ниже). */
export const COLLAGEN_CATEGORY_BENTO_TILES: readonly MarketingBentoTile[] = [
  {
    id: 'joints',
    title: 'Уменьшают боль в суставах (особенно боль, связанную с физической активностью)',
    body: 'Коллаген улучшает состояние хрящей и соединительной ткани (сухожилий и связок), снижает дискомфорт в суставах и повышает подвижность; способствует умеренному противовоспалительному эффекту.',
    imageSrc: '/images/catalog/collagen-bento/01-joints.png',
  },
  {
    id: 'connective',
    title: 'Поддерживают соединительную ткань и помогают снизить риск травм',
    body: 'Достаточный уровень коллагена важен для прочности связок и сухожилий. Коллаген также участвует в процессах заживления без избыточного рубцового фиброза.',
    imageSrc: '/images/catalog/collagen-bento/02-connective.png',
  },
  {
    id: 'amino',
    title: 'Незаменимый источник аминокислот',
    body: 'Содержит 19 аминокислот и восемь из девяти незаменимых, которые организм получает из пищи. Высокое содержание пролина, аланина, глицина, гидроксипролина и аргинина связано с синтезом креатина и может поддерживать силу и выносливость при сокращении мышц.',
    imageSrc: '/images/catalog/collagen-bento/03-amino.png',
  },
  {
    id: 'nitrogen',
    title: 'Помогают поддерживать положительный баланс азота',
    body: 'Сбалансированный азотный баланс способствует анаболическому фону, который важен для роста и восстановления мышечной ткани.',
    imageSrc: '/images/catalog/collagen-bento/04-nitrogen.png',
  },
  {
    id: 'mass',
    title: 'Помогают увеличить мышечную массу',
    body: 'Пептиды коллагена участвуют в оптимизации синтеза креатина, что может ускорять набор сухой мышечной массы после нагрузок. Добавки с коллагеном в ряде исследований ассоциировались с улучшением силы и объёма мышц и с защитой от возрастной утраты мышечной ткани.',
    imageSrc: '/images/catalog/collagen-bento/05-mass.png',
  },
  {
    id: 'recovery',
    title: 'Помогут ускорить восстановление мышц',
    body: 'Белок коллагена даёт аминокислоты — строительный материал для мышц и фактор восстановления после стресса, вызванного тренировкой.',
    imageSrc: '/images/catalog/collagen-bento/06-recovery.png',
  },
  {
    id: 'metabolism',
    title: 'Помогут ускорить метаболизм',
    body: 'Глутамин, глицин, аргинин и другие аминокислоты из коллагена участвуют в синтезе белка мышц и могут поддерживать более активный расход энергии.',
    imageSrc: '/images/catalog/collagen-bento/07-metabolism.png',
  },
  {
    id: 'performance',
    title: 'Улучшают спортивные результаты',
    body: 'Сокращение мышц в тренировке опирается на креатин из аргинина, метионина и глицина. В коллагене много глицина и заметная доля аргинина — это поддерживает естественный синтез креатина в организме.',
    imageSrc: '/images/catalog/collagen-bento/08-performance.png',
  },
]
