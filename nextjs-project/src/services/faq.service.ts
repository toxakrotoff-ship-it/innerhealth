import 'server-only'
import { prisma } from '@/lib/prisma'
import type { BrandId } from '@/lib/brand/brand'
import { resolveDbBrand } from '@/lib/brand/brand-db'

export interface FaqInput {
  question: string
  answer: string
  sortOrder: number
  isPublished: boolean
}

const SPRINT_DEFAULT_FAQ_ITEMS: readonly FaqInput[] = [
  {
    question: 'Как выбрать продукт Sprint Power под цель тренировки?',
    answer:
      'Для набора и восстановления выбирайте белковые комплексы, для выносливости — формулы поддержки энергии и электролитов. Начните с базового продукта и отслеживайте самочувствие 2-3 недели.',
    sortOrder: 0,
    isPublished: true,
  },
  {
    question: 'Можно ли сочетать несколько продуктов Sprint Power одновременно?',
    answer:
      'Да, но лучше вводить их поэтапно. Начните с одного продукта, затем добавляйте следующий с интервалом 5-7 дней, чтобы оценить переносимость и эффект.',
    sortOrder: 1,
    isPublished: true,
  },
  {
    question: 'Когда принимать продукты: до или после тренировки?',
    answer:
      'Зависит от формулы: продукты для энергии обычно принимают до тренировки, для восстановления — после. Ориентируйтесь на рекомендации на странице товара.',
    sortOrder: 2,
    isPublished: true,
  },
  {
    question: 'Есть ли доставка по России и как быстро приходит заказ?',
    answer:
      'Да, доставляем по России через СДЭК. Срок зависит от региона и обычно отображается при оформлении заказа.',
    sortOrder: 3,
    isPublished: true,
  },
] as const

function getDefaultFaqSeed(brandId?: BrandId | null): readonly FaqInput[] {
  return brandId === 'sprint-power' ? SPRINT_DEFAULT_FAQ_ITEMS : []
}

export function getFallbackFaqItems(brandId?: BrandId | null) {
  const brand = resolveDbBrand(brandId)
  return getDefaultFaqSeed(brandId).map((item, index) => ({
    id: `fallback-${brand}-${index + 1}`,
    brand,
    question: item.question,
    answer: item.answer,
    sortOrder: item.sortOrder,
    isPublished: item.isPublished,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }))
}

function isMissingFaqBrandColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : ''

  return code === 'P2022' || message.includes('does not exist')
}

export async function getPublishedFaqItems(brandId?: BrandId | null) {
  try {
    const items = await prisma.faq.findMany({
      where: { brand: resolveDbBrand(brandId), isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return items.length > 0 ? items : getFallbackFaqItems(brandId)
  } catch (error) {
    if (!isMissingFaqBrandColumnError(error)) throw error

    const items = await prisma.faq.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return items.length > 0 ? items : getFallbackFaqItems(brandId)
  }
}

export async function getFaqItemsForAdmin(brandId?: BrandId | null) {
  try {
    return await prisma.faq.findMany({
      where: { brand: resolveDbBrand(brandId) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
  } catch (error) {
    if (!isMissingFaqBrandColumnError(error)) throw error

    return prisma.faq.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
  }
}

export async function ensureFaqSeedForBrand(brandId?: BrandId | null) {
  const brand = resolveDbBrand(brandId)
  const defaults = getDefaultFaqSeed(brandId)
  if (defaults.length === 0) return

  try {
    const count = await prisma.faq.count({ where: { brand } })
    if (count > 0) return

    await prisma.faq.createMany({
      data: defaults.map((item) => ({
        brand,
        question: item.question,
        answer: item.answer,
        sortOrder: item.sortOrder,
        isPublished: item.isPublished,
      })),
    })
  } catch (error) {
    if (!isMissingFaqBrandColumnError(error)) throw error
  }
}

export async function createFaqItem(input: FaqInput, brandId?: BrandId | null) {
  try {
    return await prisma.faq.create({
      data: {
        ...input,
        brand: resolveDbBrand(brandId),
      },
    })
  } catch (error) {
    if (!isMissingFaqBrandColumnError(error)) throw error

    return prisma.faq.create({
      data: input,
    })
  }
}

export async function updateFaqItem(id: string, input: FaqInput, brandId?: BrandId | null) {
  try {
    const updated = await prisma.faq.updateMany({
      where: { id, brand: resolveDbBrand(brandId) },
      data: input,
    })
    if (updated.count === 0) {
      throw new Error('FAQ item not found in selected brand scope')
    }
    return prisma.faq.findUniqueOrThrow({ where: { id } })
  } catch (error) {
    if (!isMissingFaqBrandColumnError(error)) throw error

    return prisma.faq.update({
      where: { id },
      data: input,
    })
  }
}

export async function deleteFaqItem(id: string, brandId?: BrandId | null) {
  try {
    const deleted = await prisma.faq.deleteMany({
      where: { id, brand: resolveDbBrand(brandId) },
    })
    if (deleted.count === 0) {
      throw new Error('FAQ item not found in selected brand scope')
    }
  } catch (error) {
    if (!isMissingFaqBrandColumnError(error)) throw error

    await prisma.faq.delete({
      where: { id },
    })
  }
}
