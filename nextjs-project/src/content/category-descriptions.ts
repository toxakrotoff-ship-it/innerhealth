/**
 * Hero and description content for catalog category pages.
 * Keys are category slugs. Local image paths are under /images/categories/
 *
 * Записи с копирайтом Inner Health не показываются на витрине Sprint Power — см. `getCategoryPageContent`.
 */

import type { JSONContent } from '@tiptap/core'
import type { BrandId } from '@/lib/brand/brand'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'

export interface CategoryPageContent {
  /** Local path for hero image (e.g. /images/categories/gribnaya-kollekciya.jpg) */
  heroImage: string
  /** Main title on hero (e.g. "ГРИБНАЯ КОЛЛЕКЦИЯ") */
  heroTitle?: string
  /** Optional subtitle line */
  heroSubtitle?: string
  /** Heading above bullet list */
  descriptionHeading?: string
  bullets?: string[]
  paragraphs?: string[]
}

export const CATEGORY_PAGE_CONTENT: Record<string, CategoryPageContent> = {
  collagen: {
    heroImage: '/images/categories/collagen.png',
    heroTitle: 'КОЛЛАГЕН',
    heroSubtitle: 'И ПЕПТИДЫ',
    descriptionHeading: 'Коллаген и пептиды Inner Health:',
    bullets: [
      'продукты на основе гидролизованного коллагена в разных форматах и вкусах;',
      'есть коллаген II типа, а также мультикомплексы I, II и III типов;',
      'в линейке представлены варианты для ежедневного рациона и удобного сравнения по составу и формату;',
      'описания и характеристики помогают подобрать подходящий продукт без лишних обещаний.',
    ],
    paragraphs: [
      'В категории собраны порошковые и таблетированные продукты, которые отличаются источником сырья, формой выпуска и составом.',
      'Сравните характеристики и выберите вариант, который лучше подходит вашему повседневному рациону.',
    ],
  },
  'gribnaya-kollekciya': {
    heroImage: '/images/categories/gribnaya-kollekciya.png',
    heroTitle: 'ФУНКЦИОНАЛЬНЫЕ',
    heroSubtitle: 'ГРИБЫ',
    descriptionHeading: 'Функциональные грибы Inner Health:',
    bullets: [
      'в категории представлены ежовик, кордицепс, рейши, траметес и лисички;',
      'в ассортименте есть капсулы, а также продукты без капсульной формы;',
      'для выбора удобно сравнивать вид сырья, состав и формат выпуска.',
    ],
    paragraphs: [
      'Грибная коллекция объединяет основные позиции линейки Inner Health и помогает быстро выбрать подходящий продукт по формату и составу.',
      'Подробные карточки товаров подскажут, чем отличаются варианты между собой и какой формат удобнее именно вам.',
    ],
  },
  bulony: {
    heroImage: '/images/categories/bulony.png',
    heroTitle: 'НАТУРАЛЬНЫЕ',
    heroSubtitle: 'БУЛЬОНЫ',
    descriptionHeading: 'Натуральные сухие бульоны Inner Health:',
    bullets: [
      'в категории есть концентрированные куриные и говяжьи сухие бульоны;',
      'отдельно представлен пептидный куриный костный бульон без добавок;',
      'сухой формат удобно хранить и использовать дома, на работе и в поездках.',
    ],
    paragraphs: [
      'Бульон можно приготовить как самостоятельный горячий напиток или использовать как основу для супов, соусов и повседневных блюд.',
      'Разные форматы помогают выбрать удобный вариант для кухни и ежедневного рациона.',
    ],
  },
  nutrienty: {
    heroImage: '/images/categories/nutrienty.png',
    heroTitle: 'НУТРИЕНТЫ',
    descriptionHeading: 'Преимущества нутриентов Inner Health:',
    bullets: [
      'органические микро-и микронутриенты широкого спектра действия;',
      'активаторы синтеза внутреннего белка, коллагеновых структур, рекомендованные к приему в качестве кофакторов коллагена;',
      'разнообразие видов нутриентов, высокая степень биодоступности, не требуют высоких дозировок;',
      'доказанная эффективность и безопасность без токсической нагрузки;',
      'отечественное производство;',
      'доступная цена.',
    ],
    paragraphs: [
      'Мы выбираем для вас лучшее. Нутриенты Inner Health – это высокое качество жизни.',
      'Закажите нутриенты Inner Health прямо сейчас и обеспечьте баланс внутренних процессов в организме.',
    ],
  },
  aktsii: {
    heroImage: '/images/categories/aktsii-abstraktnyy-fon.png',
    heroTitle: 'АКЦИИ',
  },
  'podarkovye-nabory': {
    heroImage: '/images/categories/podarkovye-nabory.png',
    heroTitle: 'ПОДАРОЧНЫЕ НАБОРЫ',
  },
}

/** Slugs, для которых текст/герой в этом файле — про Inner Health; на Sprint не подмешиваем. */
const INNER_MARKETING_CATEGORY_SLUGS = new Set<string>([
  'collagen',
  'gribnaya-kollekciya',
  'bulony',
  'nutrienty',
])

export function getCategoryPageContent(
  slug: string,
  brandId?: BrandId | null
): CategoryPageContent | undefined {
  const entry = CATEGORY_PAGE_CONTENT[slug]
  if (!entry) return undefined
  if (brandId != null && isSprintPowerBrand(brandId) && INNER_MARKETING_CATEGORY_SLUGS.has(slug)) {
    return undefined
  }
  return entry
}

function textNode(value: string): JSONContent {
  return { type: 'text', text: value }
}

function paragraph(value: string): JSONContent {
  return { type: 'paragraph', content: [textNode(value)] }
}

function heading(value: string): JSONContent {
  return { type: 'heading', attrs: { level: 2 }, content: [textNode(value)] }
}

function bulletList(items: string[]): JSONContent {
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [paragraph(item)],
    })),
  }
}

export function buildCategoryPageContentDoc(content: CategoryPageContent): JSONContent {
  const blocks: JSONContent[] = []

  if (content.descriptionHeading?.trim()) {
    blocks.push(heading(content.descriptionHeading.trim()))
  }
  if (content.bullets?.length) {
    blocks.push(bulletList(content.bullets))
  }
  if (content.paragraphs?.length) {
    blocks.push(...content.paragraphs.map((item) => paragraph(item)))
  }

  return { type: 'doc', content: blocks }
}

export function getCategoryPageContentDoc(
  slug: string,
  brandId?: BrandId | null
): JSONContent | null {
  const content = getCategoryPageContent(slug, brandId)
  if (!content) return null
  if (!content.descriptionHeading && !content.bullets?.length && !content.paragraphs?.length) {
    return null
  }
  return buildCategoryPageContentDoc(content)
}
