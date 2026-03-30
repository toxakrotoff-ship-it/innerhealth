'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { cookies, headers } from 'next/headers'
import * as faqService from '@/services/faq.service'
import {
  ACTIVE_BRAND_COOKIE_NAME,
  ADMIN_BRAND_COOKIE_NAME,
  resolveAdminBrand,
} from '@/lib/brand/brand-context'
import type { BrandId } from '@/lib/brand/brand'

const faqSchema = z.object({
  question: z.string().trim().min(3, 'Вопрос должен содержать минимум 3 символа'),
  answer: z.string().trim().min(3, 'Ответ должен содержать минимум 3 символа'),
  sortOrder: z.number().int().min(0),
  isPublished: z.boolean(),
})

function getFirstZodErrorMessage(error: z.ZodError): string {
  const firstIssue = error.issues[0]
  return firstIssue?.message ?? 'Проверьте корректность заполнения полей'
}

async function resolveActiveBrand(): Promise<BrandId> {
  const headerStore = await headers()
  const cookieStore = await cookies()

  return resolveAdminBrand({
    forwardedBrand: headerStore.get('x-brand'),
    adminBrandCookie: cookieStore.get(ADMIN_BRAND_COOKIE_NAME)?.value ?? null,
    activeBrandCookie: cookieStore.get(ACTIVE_BRAND_COOKIE_NAME)?.value ?? null,
    host: headerStore.get('x-forwarded-host') || headerStore.get('host'),
  })
}

export async function getFaqItems() {
  const brandId = await resolveActiveBrand()
  await faqService.ensureFaqSeedForBrand(brandId)
  return faqService.getFaqItemsForAdmin(brandId)
}

export async function createFaqItem(input: unknown) {
  const parsed = faqSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(getFirstZodErrorMessage(parsed.error))
  }
  const brandId = await resolveActiveBrand()
  const item = await faqService.createFaqItem(parsed.data, brandId)
  revalidatePath('/faq')
  revalidatePath('/admin/faq')
  return item
}

export async function updateFaqItem(id: string, input: unknown) {
  const parsed = faqSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(getFirstZodErrorMessage(parsed.error))
  }
  const brandId = await resolveActiveBrand()
  const item = await faqService.updateFaqItem(id, parsed.data, brandId)
  revalidatePath('/faq')
  revalidatePath('/admin/faq')
  return item
}

export async function deleteFaqItem(id: string) {
  const brandId = await resolveActiveBrand()
  await faqService.deleteFaqItem(id, brandId)
  revalidatePath('/faq')
  revalidatePath('/admin/faq')
}
