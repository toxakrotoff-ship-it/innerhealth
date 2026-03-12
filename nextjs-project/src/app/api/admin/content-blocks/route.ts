import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { requireAdminSession } from '@/lib/require-admin'
import {
  getBlocksForPage,
  upsertBlocks,
  getResolvedBlocksForPage,
} from '@/services/content-block.service'

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

  const { searchParams } = new URL(request.url)
  const parseResult = pageQuerySchema.safeParse({ page: searchParams.get('page') })

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid page parameter' }, { status: 400 })
  }

  try {
    // Возвращаем блоки, объединённые с дефолтами, чтобы админ видел текущие тексты
    const blocks = await getResolvedBlocksForPage(parseResult.data.page)
    return NextResponse.json(blocks)
  } catch (error) {
    console.error('Error fetching content blocks:', error)
    return NextResponse.json({ error: 'Failed to fetch content blocks' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

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

  try {
    await upsertBlocks(
      body.blocks.map((b) => ({
        ...b,
        richJson: (b.richJson ?? null) as Prisma.JsonValue | null,
      }))
    )

    const refreshed = await getBlocksForPage(body.page)
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

