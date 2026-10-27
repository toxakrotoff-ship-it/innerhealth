import 'server-only'
import type { Prisma } from '@prisma/client'
import type { BrandId } from '@/lib/brand/brand'
import { makeScopedSettingKey } from '@/lib/brand/brand-settings'
import { prisma } from '@/lib/prisma'
import { DEFAULT_DELIVERY_PACKAGE } from '@/lib/delivery-package-defaults'
import type { ParcelLine } from './parcel'

type SettingsReader = Pick<Prisma.TransactionClient, 'siteSetting'>
const fields = {
  weight: ['cdek_default_package_weight_g', DEFAULT_DELIVERY_PACKAGE.weightG],
  length: ['cdek_default_package_length_mm', DEFAULT_DELIVERY_PACKAGE.lengthMm],
  width: ['cdek_default_package_width_mm', DEFAULT_DELIVERY_PACKAGE.widthMm],
  height: ['cdek_default_package_height_mm', DEFAULT_DELIVERY_PACKAGE.heightMm],
} as const

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

/** Read only numeric package settings, freshly and through the order transaction when supplied. */
export async function getOzonPackageDefaults(brand: BrandId, db: SettingsReader = prisma) {
  const keys = Object.values(fields).flatMap(([key]) => [makeScopedSettingKey(brand, key), key])
  const rows = await db.siteSetting.findMany({ where: { key: { in: keys } }, select: { key: true, value: true } })
  const values = new Map(rows.map(row => [row.key, row.value]))
  const result = { weight: 0, length: 0, width: 0, height: 0 }
  for (const field of Object.keys(fields) as Array<keyof typeof fields>) {
    const [key, fallback] = fields[field]
    const candidates = [values.get(makeScopedSettingKey(brand, key)), values.get(key)]
      .map(value => Number.parseInt(value?.trim() || '', 10))
    result[field] = candidates.find(positiveInteger) ?? fallback
  }
  return result
}

/** Resolve missing catalogue fields before both packing and cart fingerprinting. */
export async function resolveOzonParcelLines(lines: ParcelLine[], brand: BrandId, db: SettingsReader = prisma): Promise<ParcelLine[]> {
  if (lines.every(line => Object.keys(fields).every(field => positiveInteger(line[field as keyof typeof fields])))) return lines
  const defaults = await getOzonPackageDefaults(brand, db)
  return lines.map(line => ({
    ...line,
    weight: positiveInteger(line.weight) ? line.weight : defaults.weight,
    length: positiveInteger(line.length) ? line.length : defaults.length,
    width: positiveInteger(line.width) ? line.width : defaults.width,
    height: positiveInteger(line.height) ? line.height : defaults.height,
  }))
}
