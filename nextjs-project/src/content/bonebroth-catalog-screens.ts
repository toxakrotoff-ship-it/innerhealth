import type { MarketingBentoTile } from '@/types/marketing-bento-tile'

export interface BoneBrothProductGridCell {
  readonly title: string
  readonly body: string
}

export interface BoneBrothProductDescriptionContent {
  readonly heading: string
  readonly introPoints: readonly [string, string]
  readonly gridCells: readonly BoneBrothProductGridCell[]
}

export interface BoneBrothIngredientBlock {
  readonly term: string
  readonly description: string
}

/** Экран «Описание продукта» — до TipTap. */
export const BONE_BROTH_PRODUCT_DESCRIPTION: BoneBrothProductDescriptionContent = {
  heading: 'Описание продукта',
  introPoints: [
    'Бульон сухой пищевой костный куриный произведён из костной, соединительной и мышечной тканей курицы путём ферментации с использованием гидролитических ферментов с последующей термической обработкой, высушенный на распылительной сушке.',
    'Продукт растворим в воде. Внешний вид готового бульона свойственен бульону, приготовленному обычным кулинарным способом.',
  ],
  gridCells: [
    {
      title: 'Применение',
      body: 'Смешать 1 мерную ложку продукта с 250–350 мл горячей воды, добавить соль, перец по вкусу.',
    },
    {
      title: 'Безопасность',
      body: 'Система менеджмента качества и безопасности предприятия соответствует требованиям GMP и ISO 22000. Производство осуществляется под строгим контролем процесса и качества.',
    },
    {
      title: 'Противопоказания',
      body: 'Индивидуальная непереносимость компонентов продукта.',
    },
    {
      title: 'Условия хранения',
      body: 'Хранить в сухом месте, защищённом от прямых солнечных лучей и недоступном для детей, при температуре не выше 25 °C.',
    },
  ],
}

export const BONE_BROTH_COMPOSITION_HEADING = 'В составе костного бульона есть'

export const BONE_BROTH_COMPOSITION_INGREDIENTS: readonly BoneBrothIngredientBlock[] = [
  {
    term: 'гликозамингликаны',
    description:
      'вещества, которые присутствуют в костях и соединительной ткани, например гиалуроновая кислота.',
  },
  {
    term: 'сульфат хондроитина',
    description:
      'соединение, способное восстанавливать повреждённые ткани в хрящах и снимать боль.',
  },
  {
    term: 'глюкозамин',
    description: 'обладает аналогичным действием.',
  },
]

export const BONE_BROTH_COMPOSITION_CALLOUT =
  'Хондроитин и глюкозамин часто назначают в качестве дорогих добавок при остеоартрите, однако активные вещества из костного бульона усваиваются не менее эффективно и обходятся существенно дешевле.'

/** Сетка с фото — после TipTap; раскладка 2×2 с разной высотой плиток. */
export const BONE_BROTH_COMPOSITION_BENTO_GRID_CLASS =
  'grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:grid-rows-2 lg:gap-4'

export const BONE_BROTH_COMPOSITION_BENTO_TILE_LAYOUT_CLASSES: readonly string[] = [
  'lg:col-start-1 lg:row-start-1 min-h-[220px] lg:min-h-[300px]',
  'lg:col-start-2 lg:row-start-1 min-h-[180px] lg:min-h-[200px]',
  'lg:col-start-1 lg:row-start-2 min-h-[180px] lg:min-h-[200px]',
  'lg:col-start-2 lg:row-start-2 min-h-[220px] lg:min-h-[300px]',
]

export const BONE_BROTH_COMPOSITION_BENTO_TILES: readonly MarketingBentoTile[] = [
  {
    id: 'recovery',
    title: 'Восстановление после нагрузки',
    body: 'Интенсивные тренировки вызывают микроповреждения мышечных волокон. Аминокислоты бульона, в том числе глицин и пролин, участвуют в синтезе белка и могут ускорять восстановление и снижать воспалительный ответ после нагрузки.',
    imageSrc: '/images/catalog/bonebroth-bento/01.png',
    imageObjectPosition: '48% 46%',
  },
  {
    id: 'minerals',
    title: 'Минералы в естественной форме',
    body: 'В состав входят кальций, магний, калий и фосфор в форме, близкой к пищевым источникам: их проще включить в рацион спортсмена для восполнения того, что уходит с потом и при длительных тренировках.',
    imageSrc: '/images/catalog/bonebroth-bento/02.png',
    imageObjectPosition: '50% 44%',
  },
  {
    id: 'joints',
    title: 'Суставы и коллаген',
    body: 'С возрастом синтез коллагена замедляется; поддержка соединительной ткани становится важнее для устойчивости к регулярным нагрузкам. Компоненты костного бульона дополняют рацион белком и строительными элементами для костей и суставов.',
    imageSrc: '/images/catalog/bonebroth-bento/03.png',
    imageObjectPosition: '46% 42%',
  },
  {
    id: 'daily',
    title: 'Как включить в день',
    body: 'Удобно выпивать порцию бульона ежедневно за несколько часов до или после тренировки — как сытный перекус с белком, который помогает дольше сохранять энергию и контролировать голод между приёмами пищи.',
    imageSrc: '/images/catalog/bonebroth-bento/04.png',
    imageObjectPosition: '52% 40%',
  },
]
