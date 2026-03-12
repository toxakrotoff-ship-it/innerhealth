import 'server-only'

interface OrganizationJsonLd {
  '@context': 'https://schema.org'
  '@type': string
  name?: string
  url?: string
  logo?: string
  telephone?: string
  address?: {
    '@type': 'PostalAddress'
    streetAddress: string
  }
  sameAs?: string[]
}

interface ProductJsonLd {
  '@context': 'https://schema.org'
  '@type': 'Product'
  name: string
  description?: string
  image?: string | string[]
  sku?: string
  brand?: {
    '@type': 'Brand'
    name: string
  }
  offers?: {
    '@type': 'Offer'
    url?: string
    price: number
    priceCurrency?: string
    availability?: string
  }
}

interface ArticleJsonLd {
  '@context': 'https://schema.org'
  '@type': 'Article' | 'NewsArticle'
  headline: string
  image?: string | string[]
  datePublished: string
  dateModified?: string
  author?: {
    '@type': 'Organization' | 'Person'
    name: string
  }
  publisher?: {
    '@type': 'Organization'
    name: string
    logo?: {
      '@type': 'ImageObject'
      url: string
    }
  }
  description?: string
}

function parseBooleanFlag(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

function parseSameAsLinks(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined
  const items = raw
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)

  if (items.length === 0) {
    return undefined
  }

  const validUrls = items.filter((item) => {
    try {
      new URL(item)
      return true
    } catch {
      return false
    }
  })

  return validUrls.length > 0 ? validUrls : undefined
}

export function buildOrganizationJsonLd(
  settings: Record<string, string>
): OrganizationJsonLd | null {
  const enabled = parseBooleanFlag(settings.schema_org_enabled)
  if (!enabled) {
    return null
  }

  const type =
    settings.schema_org_organization_type?.trim() || 'Organization'

  const legalName = settings.schema_org_legal_name?.trim()
  const siteName = settings.site_name?.trim()
  const name = legalName || siteName

  const url = settings.schema_org_url?.trim()
  const logo = settings.schema_org_logo_url?.trim()
  const telephone = settings.schema_org_phone?.trim()
  const addressRaw = settings.schema_org_address?.trim()
  const sameAs = parseSameAsLinks(settings.schema_org_social_links)

  const jsonLd: OrganizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': type,
  }

  if (name) {
    jsonLd.name = name
  }

  if (url) {
    jsonLd.url = url
  }

  if (logo) {
    jsonLd.logo = logo
  }

  if (telephone) {
    jsonLd.telephone = telephone
  }

  if (addressRaw) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      streetAddress: addressRaw,
    }
  }

  if (sameAs && sameAs.length > 0) {
    jsonLd.sameAs = sameAs
  }

  return jsonLd
}

export function buildProductJsonLd(params: {
  settings: Record<string, string>
  product: {
    title: string
    description: string | null
    price: number
    quantity: number | null | undefined
    brand: string | null
    sku: string | null
  }
  url: string
  images: string[]
}): ProductJsonLd | null {
  const enabled = parseBooleanFlag(params.settings.schema_org_enabled)
  if (!enabled) return null

  const currency = params.settings.default_currency?.trim() || 'RUB'
  const images = params.images.filter(Boolean)

  const availability =
    params.product.quantity == null || params.product.quantity <= 0
      ? 'https://schema.org/PreOrder'
      : 'https://schema.org/InStock'

  const jsonLd: ProductJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: params.product.title,
    offers: {
      '@type': 'Offer',
      url: params.url,
      price: params.product.price,
      priceCurrency: currency,
      availability,
    },
  }

  if (params.product.description) {
    jsonLd.description = params.product.description
  }

  if (images.length === 1) {
    jsonLd.image = images[0]
  } else if (images.length > 1) {
    jsonLd.image = images
  }

  if (params.product.sku) {
    jsonLd.sku = params.product.sku
  }

  if (params.product.brand) {
    jsonLd.brand = {
      '@type': 'Brand',
      name: params.product.brand,
    }
  }

  return jsonLd
}

export function buildArticleJsonLd(params: {
  settings: Record<string, string>
  post: {
    title: string
    type: string
    createdAt: Date
    excerpt?: string | null
  }
  url: string
  imageUrl?: string | null
}): ArticleJsonLd | null {
  const enabled = parseBooleanFlag(params.settings.schema_org_enabled)
  if (!enabled) return null

  const isNews = params.post.type === 'news'
  const orgName =
    params.settings.schema_org_legal_name?.trim() ||
    params.settings.site_name?.trim() ||
    'Inner Health'
  const logoUrl = params.settings.schema_org_logo_url?.trim()

  const jsonLd: ArticleJsonLd = {
    '@context': 'https://schema.org',
    '@type': isNews ? 'NewsArticle' : 'Article',
    headline: params.post.title,
    datePublished: params.post.createdAt.toISOString(),
  }

  if (params.post.excerpt) {
    jsonLd.description = params.post.excerpt
  }

  if (params.imageUrl) {
    jsonLd.image = params.imageUrl
  }

  jsonLd.author = {
    '@type': 'Organization',
    name: orgName,
  }

  jsonLd.publisher = {
    '@type': 'Organization',
    name: orgName,
  }

  if (logoUrl) {
    jsonLd.publisher.logo = {
      '@type': 'ImageObject',
      url: logoUrl,
    }
  }

  return jsonLd
}

