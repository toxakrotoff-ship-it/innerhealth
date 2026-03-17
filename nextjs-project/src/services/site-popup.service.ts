import type { SitePopup } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function getActiveSitePopup(): Promise<SitePopup | null> {
  const popup = await prisma.sitePopup.findFirst({
    where: { isEnabled: true },
    orderBy: { updatedAt: 'desc' },
  })

  return popup
}

export async function getOrCreateSingletonSitePopup(): Promise<SitePopup> {
  const existing = await prisma.sitePopup.findFirst({
    orderBy: { createdAt: 'asc' },
  })

  if (existing) return existing

  const created = await prisma.sitePopup.create({
    data: {
      title: 'Главный промо-попап',
      isEnabled: false,
      delaySeconds: 5,
      hideForDays: 7,
    },
  })

  return created
}

