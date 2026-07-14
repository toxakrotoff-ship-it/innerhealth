import 'server-only'

import type { Metadata } from 'next'
import type { BrandId } from '@/lib/brand/brand'
import { getBrandSiteConfig } from '@/lib/brand/site-branding'
import { getResolvedBlocksForPage } from '@/services/content-block.service'
import { stripHtmlToPlainText } from '@/lib/plain-text'

const DEFAULT_DESCRIPTION_MAX_LENGTH = 158

export function trimToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeSeoDescription(
  value: string | null | undefined,
  maxLength: number = DEFAULT_DESCRIPTION_MAX_LENGTH
): string | null {
  const trimmed = trimToNull(value)
  if (!trimmed) return null
  return stripHtmlToPlainText(trimmed, maxLength)
}

export function parseSeoKeywords(value: string | null | undefined): string[] | undefined {
  const trimmed = trimToNull(value)
  if (!trimmed) return undefined

  const seen = new Set<string>()
  const items = trimmed
    .split(/[;,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .filter((item) => {
      const key = item.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  return items.length > 0 ? items : undefined
}

function buildOgAndTwitter(params: {
  title: string
  description: string
  path: string
  image?: { url: string; alt?: string | null } | null
}): Pick<Metadata, 'openGraph' | 'twitter' | 'alternates'> {
  const { title, description, path, image } = params
  return {
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title,
      description,
      url: path,
      ...(image?.url
        ? {
            images: [
              {
                url: image.url,
                ...(trimToNull(image.alt) ? { alt: trimToNull(image.alt)! } : {}),
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: image?.url ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image?.url ? { images: [image.url] } : {}),
    },
  }
}

export function buildMetadataWithSocial(params: {
  title: string
  description: string
  path: string
  keywords?: string[]
  image?: { url: string; alt?: string | null } | null
}): Metadata {
  const { title, description, path, keywords, image } = params
  return {
    title,
    description,
    ...(keywords && keywords.length > 0 ? { keywords } : {}),
    ...buildOgAndTwitter({ title, description, path, image }),
  }
}

export async function buildContentPageMetadata(params: {
  brandId: BrandId
  page: string
  path: string
  fallbackTitle: string
  fallbackDescription: string
  fallbackImage?: string | null
}): Promise<Metadata> {
  const { brandId, page, path, fallbackTitle, fallbackDescription, fallbackImage } = params
  const blocks = await getResolvedBlocksForPage(page, brandId)
  const seoTitle = trimToNull(blocks.find((block) => block.key === 'seo.title')?.text)
  const seoDescription = trimToNull(blocks.find((block) => block.key === 'seo.description')?.text)
  const seoOgImage = trimToNull(blocks.find((block) => block.key === 'seo.ogImage')?.text)
  const siteTitle = getBrandSiteConfig(brandId).title
  const description = seoDescription ?? fallbackDescription
  const imageUrl = seoOgImage ?? trimToNull(fallbackImage)

  return buildMetadataWithSocial({
    title: seoTitle ?? fallbackTitle,
    description,
    path,
    image: imageUrl ? { url: imageUrl, alt: seoTitle ?? fallbackTitle ?? siteTitle } : null,
  })
}
