import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { requireAdminSession } from '@/lib/require-admin'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import {
  getBlocksForPage,
  upsertBlocks,
  getResolvedBlocksForPage,
} from '@/services/content-block.service'

function validateInternalHref(value: string): boolean {
  if (value.trim() !== value) return false
  if (!value.startsWith('/')) return false
  if (value.startsWith('//')) return false
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code <= 0x20 || code === 0x7f) return false
  }

  try {
    const url = new URL(value, 'https://example.invalid')
    return url.origin === 'https://example.invalid'
  } catch {
    return false
  }
}

const pageQuerySchema = z.object({
  page: z.string().min(1).transform((s) => s.trim()),
})

const contentBlockSchema = z.object({
  id: z.string().optional(),
  page: z.string().min(1),
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['short', 'rich']),
  text: z.string().nullable().optional(),
  richJson: z.unknown().nullable().optional(),
  colorToken: z.string().nullable().optional(),
  fontVariant: z.string().nullable().optional(),
  fontWeight: z.string().nullable().optional(),
})

const savePayloadSchema = z.object({
  page: z.string().min(1),
  blocks: z.array(contentBlockSchema),
})

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)

  const { searchParams } = new URL(request.url)
  const parseResult = pageQuerySchema.safeParse({ page: searchParams.get('page') })

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid page parameter' }, { status: 400 })
  }

  try {
    // Возвращаем блоки, объединённые с дефолтами, чтобы админ видел текущие тексты
    const blocks = await getResolvedBlocksForPage(parseResult.data.page, brandId)
    return NextResponse.json(blocks)
  } catch (error) {
    console.error('Error fetching content blocks:', error)
    return NextResponse.json({ error: 'Failed to fetch content blocks' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)

  let body: z.infer<typeof savePayloadSchema>
  try {
    const raw = await request.json()
    body = savePayloadSchema.parse(raw)
  } catch (err) {
    const msg =
      err instanceof z.ZodError
        ? err.issues.map((e) => e.message).join('; ')
        : 'Invalid payload'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  for (const block of body.blocks) {
    if (!block.key.endsWith('.href')) continue
    const hrefValue = block.text ?? ''
    if (hrefValue === '') continue
    if (!validateInternalHref(hrefValue)) {
      return NextResponse.json(
        { error: `Invalid href for key "${block.key}"` },
        { status: 400 }
      )
    }
  }

  try {
    await upsertBlocks(
      body.blocks.map((b) => ({
        ...b,
        richJson: (b.richJson ?? null) as Prisma.JsonValue | null,
      })),
      brandId
    )

    const refreshed = await getBlocksForPage(body.page, brandId)
    return NextResponse.json(refreshed)
  } catch (error) {
    console.error('Error saving content blocks:', error)
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Failed to save content blocks'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

