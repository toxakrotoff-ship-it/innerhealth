import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { requireAdminSession } from '@/lib/require-admin'
import * as seoHubService from '@/services/seo-hub.service'

const patchSchema = z.object({
  title: z.string().min(1).transform((s) => s.trim()).optional(),
  slug: z.string().min(1).transform((s) => s.trim()).optional(),
  excerpt: z.string().nullable().optional(),
  content: z.unknown().optional(),
  productSlugs: z.array(z.string()).optional(),
  published: z.boolean().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await params
  const hub = await seoHubService.getSeoHubByIdForAdmin(id)
  if (!hub) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(hub)
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await params

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const data: {
    title?: string
    slug?: string
    excerpt?: string | null
    content?: Prisma.InputJsonValue
    productSlugs?: string[]
    published?: boolean
  } = {}
  if (body.title != null) data.title = body.title
  if (body.slug != null) data.slug = body.slug
  if (body.excerpt !== undefined) data.excerpt = body.excerpt
  if (body.content !== undefined) data.content = body.content as Prisma.InputJsonValue
  if (body.productSlugs !== undefined) {
    data.productSlugs = body.productSlugs.map((s) => s.trim()).filter(Boolean)
  }
  if (body.published !== undefined) data.published = body.published

  try {
    const hub = await seoHubService.updateSeoHub(id, data)
    return NextResponse.json(hub)
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const { id } = await params
  try {
    await seoHubService.deleteSeoHub(id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
