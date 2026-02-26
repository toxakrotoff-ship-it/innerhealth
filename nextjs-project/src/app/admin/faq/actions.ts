'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import * as faqService from '@/services/faq.service'

const faqSchema = z.object({
  question: z.string().trim().min(3, 'Вопрос должен содержать минимум 3 символа'),
  answer: z.string().trim().min(3, 'Ответ должен содержать минимум 3 символа'),
  sortOrder: z.number().int().min(0),
  isPublished: z.boolean(),
})

function getFirstZodErrorMessage(error: z.ZodError): string {
  const firstIssue = error.issues.at(0)
  return firstIssue?.message ?? 'Проверьте корректность заполнения полей'
}

export async function getFaqItems() {
  return faqService.getFaqItemsForAdmin()
}

export async function createFaqItem(input: unknown) {
  const parsed = faqSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(getFirstZodErrorMessage(parsed.error))
  }
  const item = await faqService.createFaqItem(parsed.data)
  revalidatePath('/faq')
  revalidatePath('/admin/faq')
  return item
}

export async function updateFaqItem(id: string, input: unknown) {
  const parsed = faqSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(getFirstZodErrorMessage(parsed.error))
  }
  const item = await faqService.updateFaqItem(id, parsed.data)
  revalidatePath('/faq')
  revalidatePath('/admin/faq')
  return item
}

export async function deleteFaqItem(id: string) {
  await faqService.deleteFaqItem(id)
  revalidatePath('/faq')
  revalidatePath('/admin/faq')
}
