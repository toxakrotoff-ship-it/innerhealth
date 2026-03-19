import 'server-only'

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function getPublishedSeoHubBySlug(slug: string) {
  return prisma.seoHub.findFirst({
    where: { slug, published: true },
  })
}

export async function listPublishedSeoHubsForSitemap() {
  return prisma.seoHub.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function listSeoHubsForAdmin() {
  return prisma.seoHub.findMany({
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getSeoHubByIdForAdmin(id: string) {
  return prisma.seoHub.findUnique({ where: { id } })
}

export async function createSeoHub(data: {
  slug: string
  title: string
  excerpt: string | null
  content: Prisma.InputJsonValue
  productSlugs: string[]
  published: boolean
}) {
  return prisma.seoHub.create({
    data: {
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
  }
) {
  return prisma.seoHub.update({
    where: { id },
    data,
  })
}

export async function deleteSeoHub(id: string) {
  return prisma.seoHub.delete({ where: { id } })
}
