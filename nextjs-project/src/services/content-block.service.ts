import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { CONTENT_BLOCK_DEFAULTS, type ContentBlockDefault } from '@/config/content-blocks-defaults'
import type { BrandId } from '@/lib/brand/brand'

export interface ContentBlockDto {
  id: string
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

function getScopedPage(page: string, brandId: BrandId): string {
  return brandId === 'sprint-power' ? `sprint-power::${page}` : page
}

function shouldIncludeDefaultForBrand(def: ContentBlockDefault, brandId: BrandId): boolean {
  const isSprintOnly = def.key.startsWith('sprint.') || def.key.startsWith('faq.sprint.')
  if (brandId === 'sprint-power') {
    if (def.page === 'home') return def.key.startsWith('sprint.')
    if (def.page === 'faq') return def.key.startsWith('faq.sprint.')
    return !def.key.startsWith('home.') && !def.key.startsWith('hero.')
  }
  return !isSprintOnly
}

export async function getBlocksForPage(page: string, brandId: BrandId = 'inner'): Promise<ContentBlockDto[]> {
  const scopedPage = getScopedPage(page, brandId)
  const blocks = await prisma.contentBlock.findMany({
    where: { page: scopedPage },
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
    const scopedPage = getScopedPage(input.page, brandId)
    const data: Prisma.ContentBlockUncheckedCreateInput = {
      page: scopedPage,
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
              page_key: {
                page: scopedPage,
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

export async function getResolvedBlocksForPage(
  page: string,
  brandId: BrandId = 'inner'
): Promise<ContentBlockResolved[]> {
  const scopedPage = getScopedPage(page, brandId)
  const defaults = CONTENT_BLOCK_DEFAULTS.filter(
    (d) => d.page === page && shouldIncludeDefaultForBrand(d, brandId)
  )
  const existing = await prisma.contentBlock.findMany({ where: { page: scopedPage } })

  return defaults.map((def): ContentBlockResolved => {
    const found = existing.find((b) => b.key === def.key)
    if (!found) {
      return {
        key: def.key,
        label: def.label,
        type: def.type,
        text: def.type === 'short' ? def.text ?? null : null,
        richJson: def.type === 'rich' ? ((def.richJson as Prisma.JsonValue | undefined) ?? null) : null,
        colorToken: def.colorToken ?? null,
        fontVariant: def.fontVariant ?? null,
        fontWeight: def.fontWeight ?? null,
      }
    }

    const richJson =
      found.type === 'rich' &&
      (found.richJson == null ||
        (typeof found.richJson === 'object' &&
          Array.isArray((found.richJson as { content?: unknown }).content) &&
          (found.richJson as { content: unknown[] }).content.length === 0)) &&
      def.richJson != null
        ? (def.richJson as Prisma.JsonValue)
        : found.richJson

    return {
      key: found.key,
      label: found.label,
      type: found.type as 'short' | 'rich',
      text: found.text,
      richJson,
      colorToken: found.colorToken,
      fontVariant: found.fontVariant,
      fontWeight: found.fontWeight,
    }
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
  return CONTENT_BLOCK_DEFAULTS.find((d) => d.page === page && d.key === key) ?? null
}

