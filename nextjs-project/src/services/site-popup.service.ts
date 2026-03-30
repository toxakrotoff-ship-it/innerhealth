import type { SitePopup } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { BrandId } from '@/lib/brand/brand'
import { resolveDbBrand } from '@/lib/brand/brand-db'

interface SitePopupScopeOptions {
  brandId?: BrandId | null
}

export async function getActiveSitePopup(
  options: SitePopupScopeOptions = {}
): Promise<SitePopup | null> {
  const dbBrand = resolveDbBrand(options.brandId)
  const popup = await prisma.sitePopup.findFirst({
    where: { brand: dbBrand, isEnabled: true },
    orderBy: { updatedAt: 'desc' },
  })

  return popup
}

export async function getOrCreateSingletonSitePopup(
  options: SitePopupScopeOptions = {}
): Promise<SitePopup> {
  const dbBrand = resolveDbBrand(options.brandId)
  const existing = await prisma.sitePopup.findFirst({
    where: { brand: dbBrand },
    orderBy: { createdAt: 'asc' },
  })

  if (existing) return existing

  const created = await prisma.sitePopup.create({
    data: {
      brand: dbBrand,
      title: 'Главный промо-попап',
      isEnabled: false,
      delaySeconds: 5,
      hideForDays: 7,
    },
  })

  return created
}
