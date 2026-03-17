import 'server-only'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import type { Prisma } from '@prisma/client'
import { getOrCreateSingletonSitePopup } from '@/services/site-popup.service'
import { prisma } from '@/lib/prisma'

const sitePopupFormSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Название обязательно'),
  isEnabled: z.boolean(),
  ctaLabel: z.string().trim().max(200).optional().nullable(),
  ctaUrl: z.string().trim().max(500).optional().nullable(),
  delaySeconds: z.number().int().min(0),
  hideForDays: z.number().int().min(0),
  autoCloseSeconds: z.number().int().min(0).nullable(),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  richJson: z.unknown().nullable(),
})

export type SitePopupFormInput = z.infer<typeof sitePopupFormSchema>

export async function loadSitePopup(): Promise<SitePopupFormInput> {
  const popup = await getOrCreateSingletonSitePopup()

  return {
    id: popup.id,
    title: popup.title,
    isEnabled: popup.isEnabled,
    ctaLabel: popup.ctaLabel,
    ctaUrl: popup.ctaUrl,
    delaySeconds: popup.delaySeconds,
    hideForDays: popup.hideForDays,
    autoCloseSeconds: popup.autoCloseSeconds ?? null,
    imageUrl: popup.imageUrl,
    richJson: (popup.richJson ?? null) as Prisma.JsonValue | null,
  }
}

export async function updateSitePopup(input: SitePopupFormInput): Promise<{ success: boolean; error?: string }> {
  const parsed = sitePopupFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Некорректные данные формы',
    }
  }

  const data = parsed.data

  try {
    await prisma.sitePopup.update({
      where: { id: data.id },
      data: {
        title: data.title,
        isEnabled: data.isEnabled,
        ctaLabel: data.ctaLabel || null,
        ctaUrl: data.ctaUrl || null,
        delaySeconds: data.delaySeconds,
        hideForDays: data.hideForDays,
        autoCloseSeconds: data.autoCloseSeconds ?? null,
        imageUrl: data.imageUrl || null,
        richJson: data.richJson as Prisma.InputJsonValue | null,
      },
    })

    revalidatePath('/')

    return { success: true }
  } catch (error) {
    console.error('Failed to update site popup', error)
    return { success: false, error: 'Не удалось сохранить попап. Попробуйте ещё раз.' }
  }
}

