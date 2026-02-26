import 'server-only'
import { prisma } from '@/lib/prisma'

export interface FaqInput {
  question: string
  answer: string
  sortOrder: number
  isPublished: boolean
}

export async function getPublishedFaqItems() {
  return prisma.faq.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function getFaqItemsForAdmin() {
  return prisma.faq.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  })
}

export async function createFaqItem(input: FaqInput) {
  return prisma.faq.create({
    data: input,
  })
}

export async function updateFaqItem(id: string, input: FaqInput) {
  return prisma.faq.update({
    where: { id },
    data: input,
  })
}

export async function deleteFaqItem(id: string) {
  return prisma.faq.delete({
    where: { id },
  })
}
