import 'server-only'

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { BrandId } from '@/lib/brand/brand'
import { resolveDbBrand } from '@/lib/brand/brand-db'

export async function getPublishedSeoHubBySlug(slug: string, brandId?: BrandId | null) {
  return prisma.seoHub.findFirst({
    where: { brand: resolveDbBrand(brandId), slug, published: true },
  })
}

export async function listPublishedSeoHubsForSitemap(brandId?: BrandId | null) {
  return prisma.seoHub.findMany({
    where: { brand: resolveDbBrand(brandId), published: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function listSeoHubsForAdmin(brandId?: BrandId | null) {
  return prisma.seoHub.findMany({
    where: { brand: resolveDbBrand(brandId) },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getSeoHubByIdForAdmin(id: string, brandId?: BrandId | null) {
  return prisma.seoHub.findFirst({
    where: { id, brand: resolveDbBrand(brandId) },
  })
}

export async function createSeoHub(data: {
  slug: string
  title: string
  excerpt: string | null
  content: Prisma.InputJsonValue
  productSlugs: string[]
  published: boolean
}, brandId?: BrandId | null) {
  return prisma.seoHub.create({
    data: {
      brand: resolveDbBrand(brandId),
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt,
      content: data.content,
      productSlugs: data.productSlugs,
      published: data.published,
    },
  })
}

export async function updateSeoHub(
  id: string,
  data: {
    slug?: string
    title?: string
    excerpt?: string | null
    content?: Prisma.InputJsonValue
    productSlugs?: string[]
    published?: boolean
  },
  brandId?: BrandId | null
) {
  const updated = await prisma.seoHub.updateMany({
    where: { id, brand: resolveDbBrand(brandId) },
    data,
  })
  if (updated.count === 0) {
    throw new Error('SEO hub not found in selected brand scope')
  }
  return prisma.seoHub.findUniqueOrThrow({ where: { id } })
}

export async function deleteSeoHub(id: string, brandId?: BrandId | null) {
  const deleted = await prisma.seoHub.deleteMany({
    where: { id, brand: resolveDbBrand(brandId) },
  })
  if (deleted.count === 0) {
    throw new Error('SEO hub not found in selected brand scope')
  }
}
