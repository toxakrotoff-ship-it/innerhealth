import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { requireAdminSession } from '@/lib/require-admin'
import { slugify, slugifyUnique } from '@/lib/slugify'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import * as seoHubService from '@/services/seo-hub.service'

const postBodySchema = z.object({
  title: z.string().min(1).transform((s) => s.trim()),
  slug: z.string().transform((s) => s.trim()).optional(),
  excerpt: z.string().nullable().optional(),
  content: z.unknown().optional(),
  productSlugs: z.array(z.string()).optional(),
  published: z.boolean().default(false),
})

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)
  try {
    const hubs = await seoHubService.listSeoHubsForAdmin(brandId)
    return NextResponse.json(hubs)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to list' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session
  const brandId = resolveBrandOrDefaultFromRequest(request)

  let body: z.infer<typeof postBodySchema>
  try {
    body = postBodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const existing = (await seoHubService.listSeoHubsForAdmin(brandId)).map((h) => h.slug)
  let slug = body.slug ?? ''
  if (!slug) {
    const base = slugify(body.title) || 'hub'
    slug = slugifyUnique(base, existing)
  } else if (existing.includes(slug)) {
    return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
  }

  const content = (body.content ?? { type: 'doc', content: [] }) as Prisma.InputJsonValue
  const productSlugs = (body.productSlugs ?? []).map((s) => s.trim()).filter(Boolean)

  try {
    const hub = await seoHubService.createSeoHub({
      slug,
      title: body.title,
      excerpt: body.excerpt ?? null,
      content,
      productSlugs,
      published: body.published,
    }, brandId)
    return NextResponse.json(hub)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Create failed' }, { status: 500 })
  }
}
