import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  CONTENT_BLOCK_DEFAULTS,
  getAdminContentSchemaForBrandPage,
  type ContentBlockDefault,
} from '@/config/content-blocks-defaults'
import type { BrandId } from '@/lib/brand/brand'

export type ContentBlockValueSource = 'override' | 'brand_default' | 'generic_default'

function isEmptyRichJson(value: Prisma.JsonValue | null | undefined): boolean {
  return (
    value == null ||
    (typeof value === 'object' &&
      Array.isArray((value as { content?: unknown }).content) &&
      (value as { content: unknown[] }).content.length === 0)
  )
}

function hasOwnShortText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function getDefaultsForPage(page: string, brandId: BrandId): ContentBlockDefault[] {
  const scopedDefaults = CONTENT_BLOCK_DEFAULTS.filter(
    (item) => item.page === page && item.brand === brandId
  )

  if (scopedDefaults.length === 0) {
    return CONTENT_BLOCK_DEFAULTS.filter((item) => item.page === page && item.brand == null)
  }

  const genericDefaults = CONTENT_BLOCK_DEFAULTS.filter((item) => item.page === page && item.brand == null)
  const scopedKeys = new Set(scopedDefaults.map((item) => item.key))
  return [...genericDefaults.filter((item) => !scopedKeys.has(item.key)), ...scopedDefaults]
}

function getDefaultBlockForBrand(
  page: string,
  key: string,
  brandId: BrandId
): ContentBlockDefault | null {
  return getDefaultsForPage(page, brandId).find((item) => item.key === key) ?? null
}

function getValueSource(
  found: {
    text?: string | null
    richJson?: Prisma.JsonValue | null
  } | null | undefined,
  def: ContentBlockDefault | undefined,
  brandId: BrandId
): ContentBlockValueSource {
  if (found && (hasOwnShortText(found.text) || !isEmptyRichJson(found.richJson))) {
    return 'override'
  }

  if (def?.brand === brandId) return 'brand_default'
  return 'generic_default'
}

function getEffectiveShortText(
  found: { text?: string | null } | null | undefined,
  def: ContentBlockDefault | undefined
): string | null {
  if (hasOwnShortText(found?.text)) return found?.text?.trim() ?? null
  return def?.text ?? null
}

function getEffectiveRichJson(
  found: { richJson?: Prisma.JsonValue | null } | null | undefined,
  def: ContentBlockDefault | undefined
): Prisma.JsonValue | null {
  if (found && !isEmptyRichJson(found.richJson)) return found.richJson ?? null
  return (def?.richJson as Prisma.JsonValue | undefined) ?? null
}

export interface ContentBlockDto {
  id: string
  brand: string
  page: string
  key: string
  label: string
  type: 'short' | 'rich'
  text: string | null
  richJson: Prisma.JsonValue | null
  colorToken: string | null
  fontVariant: string | null
  fontWeight: string | null
}

export async function getBlocksForPage(page: string, brandId: BrandId = 'inner'): Promise<ContentBlockDto[]> {
  const blocks = await prisma.contentBlock.findMany({
    where: { brand: brandId, page },
    orderBy: { createdAt: 'asc' },
  })

  return blocks.map((block) => ({
    ...block,
    type: block.type as 'short' | 'rich',
  }))
}

export interface UpsertBlockInput {
  id?: string
  page: string
  key: string
  label: string
  type: 'short' | 'rich'
  text?: string | null
  richJson?: Prisma.JsonValue | null
  colorToken?: string | null
  fontVariant?: string | null
  fontWeight?: string | null
}

export async function upsertBlocks(
  inputs: UpsertBlockInput[],
  brandId: BrandId = 'inner'
): Promise<ContentBlockDto[]> {
  const result: ContentBlockDto[] = []

  for (const input of inputs) {
    const data: Prisma.ContentBlockUncheckedCreateInput = {
      brand: brandId,
      page: input.page,
      key: input.key,
      label: input.label,
      type: input.type,
      text: input.text ?? null,
      richJson: input.richJson ?? null,
      colorToken: input.colorToken ?? null,
      fontVariant: input.fontVariant ?? null,
      fontWeight: input.fontWeight ?? null,
    }

    const block =
      input.id != null && input.id !== ''
        ? await prisma.contentBlock.update({
            where: { id: input.id },
            data,
          })
        : await prisma.contentBlock.upsert({
            where: {
              brand_page_key: {
                brand: brandId,
                page: input.page,
                key: input.key,
              },
            },
            create: data,
            update: data,
          })

    result.push({ ...block, type: block.type as 'short' | 'rich' })
  }

  return result
}

export interface ContentBlockResolved {
  key: string
  label: string
  type: 'short' | 'rich'
  text: string | null
  richJson: Prisma.JsonValue | null
  colorToken: string | null
  fontVariant: string | null
  fontWeight: string | null
}

export interface ContentBlockAdminResolved extends ContentBlockResolved {
  id?: string
  page: string
  rawText: string | null
  rawRichJson: Prisma.JsonValue | null
  effectiveText: string | null
  effectiveRichJson: Prisma.JsonValue | null
  defaultText: string | null
  defaultRichJson: Prisma.JsonValue | null
  valueSource: ContentBlockValueSource
  isInherited: boolean
}

export async function getResolvedBlocksForPage(
  page: string,
  brandId: BrandId = 'inner'
): Promise<ContentBlockResolved[]> {
  const defaults = getDefaultsForPage(page, brandId)
  const existing = await prisma.contentBlock.findMany({ where: { brand: brandId, page } })

  return defaults.map((def): ContentBlockResolved => {
    const found = existing.find((b) => b.key === def.key)

    return {
      key: found?.key ?? def.key,
      label: found?.label ?? def.label,
      type: (found?.type as 'short' | 'rich' | undefined) ?? def.type,
      text: def.type === 'short' ? getEffectiveShortText(found, def) : null,
      richJson: def.type === 'rich' ? getEffectiveRichJson(found, def) : null,
      colorToken: found?.colorToken ?? def.colorToken ?? null,
      fontVariant: found?.fontVariant ?? def.fontVariant ?? null,
      fontWeight: found?.fontWeight ?? def.fontWeight ?? null,
    }
  })
}

export async function getAdminBlocksForPage(
  page: string,
  brandId: BrandId = 'inner'
): Promise<ContentBlockAdminResolved[]> {
  const schema = getAdminContentSchemaForBrandPage(brandId, page)
  if (schema.length === 0) return []

  const existing = await prisma.contentBlock.findMany({
    where: {
      brand: brandId,
      OR: schema.map((entry) => ({
        page: entry.page,
        key: entry.key,
      })),
    },
  })

  return schema
    .map((entry): ContentBlockAdminResolved | null => {
      const def = getDefaultBlockForBrand(entry.page, entry.key, brandId)
      const found = existing.find((block) => block.page === entry.page && block.key === entry.key)
      if (!def && !found) return null

      const resolvedType = ((found?.type as 'short' | 'rich' | undefined) ?? def?.type)
      if (!resolvedType) return null

      const effectiveText = resolvedType === 'short' ? getEffectiveShortText(found, def) : null
    const effectiveRichJson =
      resolvedType === 'rich'
        ? getEffectiveRichJson(found, def) ?? ({ type: 'doc', content: [] } as Prisma.JsonValue)
        : null
      const defaultText = resolvedType === 'short' ? def?.text ?? null : null
    const defaultRichJson =
      resolvedType === 'rich'
        ? (((def?.richJson as Prisma.JsonValue | undefined) ?? { type: 'doc', content: [] }) as Prisma.JsonValue)
        : null
      const valueSource = getValueSource(found, def, brandId)

      return {
        id: found?.id,
        page: found?.page ?? entry.page,
        key: found?.key ?? entry.key,
        label: found?.label ?? entry.adminLabel ?? def?.label ?? entry.key,
        type: resolvedType,
        text: effectiveText,
        richJson: effectiveRichJson,
        rawText: found?.text ?? null,
        rawRichJson: found?.richJson ?? null,
        effectiveText,
        effectiveRichJson,
        defaultText,
        defaultRichJson,
        valueSource,
        isInherited: valueSource !== 'override',
        colorToken: found?.colorToken ?? def?.colorToken ?? null,
        fontVariant: found?.fontVariant ?? def?.fontVariant ?? null,
        fontWeight: found?.fontWeight ?? def?.fontWeight ?? null,
      }
    })
    .filter((entry): entry is ContentBlockAdminResolved => entry != null)
}

export interface ResetBlockOverrideInput {
  page: string
  key: string
}

export async function resetBlockOverrides(
  inputs: ResetBlockOverrideInput[],
  brandId: BrandId = 'inner'
): Promise<void> {
  if (inputs.length === 0) return

  await prisma.contentBlock.deleteMany({
    where: {
      brand: brandId,
      OR: inputs.map((input) => ({
        page: input.page,
        key: input.key,
      })),
    },
  })
}

export async function getResolvedBlock(
  page: string,
  key: string,
  brandId: BrandId = 'inner'
): Promise<ContentBlockResolved | null> {
  const all = await getResolvedBlocksForPage(page, brandId)
  return all.find((b) => b.key === key) ?? null
}

export function getDefaultBlock(page: string, key: string): ContentBlockDefault | null {
  return getDefaultBlockForBrand(page, key, 'inner')
}

export function getDefaultBlockForPageBrand(
  page: string,
  key: string,
  brandId: BrandId = 'inner'
): ContentBlockDefault | null {
  return getDefaultBlockForBrand(page, key, brandId)
}
