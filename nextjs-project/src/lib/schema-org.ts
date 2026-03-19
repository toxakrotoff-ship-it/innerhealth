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
  seller?: {
    '@type': 'Organization'
    name: string
    url: string
  }
  offers?: {
    '@type': 'Offer'
    url?: string
    price: number
    priceCurrency?: string
    availability?: string
    itemCondition?: string
  }
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
      itemCondition: 'https://schema.org/NewCondition',
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

  const orgName =
    params.settings.schema_org_legal_name?.trim() ||
    params.settings.site_name?.trim() ||
    'Inner Health'
  const storeUrl = params.settings.schema_org_url?.trim()?.replace(/\/+$/, '')
  if (storeUrl) {
    jsonLd.seller = {
      '@type': 'Organization',
      name: orgName,
      url: storeUrl,
    }
  }

  return jsonLd
}

/**
 * BreadcrumbList JSON-LD aligned with visible breadcrumbs (Yandex / Google).
 */
export function buildBreadcrumbListJsonLd(params: {
  items: { label: string; href?: string }[]
  /** Path or path+query of the current document, e.g. /catalog?page=2 */
  currentPath: string
  siteOrigin: string
}): Record<string, unknown> | null {
  if (params.items.length === 0) return null
  const origin = params.siteOrigin.replace(/\/+$/, '')
  const abs = (path: string) =>
    path.startsWith('http://') || path.startsWith('https://')
      ? path
      : `${origin}${path.startsWith('/') ? path : `/${path}`}`

  const currentUrl = abs(params.currentPath)

  const itemListElement = params.items.map((crumb, i) => {
    const position = i + 1
    const isLast = i === params.items.length - 1
    const itemUrl = isLast
      ? currentUrl
      : crumb.href
        ? abs(crumb.href)
        : currentUrl
    return {
      '@type': 'ListItem',
      position,
      name: crumb.label,
      item: itemUrl,
    }
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  }
}

function toAbsoluteMediaUrl(siteOrigin: string, imageUrl: string | null | undefined): string | undefined {
  if (!imageUrl?.trim()) return undefined
  const u = imageUrl.trim()
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  const path = u.startsWith('/') ? u : `/${u}`
  return `${siteOrigin.replace(/\/+$/, '')}${path}`
}

/**
 * Rich WebPage + Article/NewsArticle graph for classic SEO and GEO (AI search / RAG-friendly plain articleBody).
 * Emitted for all published posts; does not depend on `schema_org_enabled`.
 */
export function buildNewsArticleGeoStructuredData(params: {
  settings: Record<string, string>
  post: {
    title: string
    type: string
    createdAt: Date
    updatedAt: Date
    excerpt: string | null
    previewImage: string | null
  }
  /** Absolute canonical document URL (https://...) */
  canonicalUrl: string
  /** Site origin for resolving relative images, e.g. from getSiteBaseUrl() */
  siteOrigin: string
  /** Plain text body extracted from editor content */
  articleBodyPlain: string
}): Record<string, unknown> {
  const schemaEnabled = parseBooleanFlag(params.settings.schema_org_enabled)
  const orgName =
    params.settings.schema_org_legal_name?.trim() ||
    params.settings.site_name?.trim() ||
    'Inner Health'
  const logoUrl = params.settings.schema_org_logo_url?.trim()
  const siteUrl =
    params.settings.schema_org_url?.trim()?.replace(/\/+$/, '') || params.siteOrigin.replace(/\/+$/, '')

  const isNews = params.post.type === 'news'
  const articleType = isNews ? 'NewsArticle' : 'Article'
  const published = params.post.createdAt.toISOString()
  const modified = params.post.updatedAt.toISOString()
  const description =
    params.post.excerpt?.trim() ||
    (isNews
      ? 'Публикация Inner Health: новости магазина и полезная информация.'
      : 'Материал Inner Health о здоровье, питании и нутриентах.')

  const absoluteImage = toAbsoluteMediaUrl(params.siteOrigin, params.post.previewImage)
  const wordCount = params.articleBodyPlain.trim().split(/\s+/).filter(Boolean).length

  const publisher: Record<string, unknown> = {
    '@type': 'Organization',
    name: orgName,
    url: siteUrl,
  }
  if (schemaEnabled && logoUrl) {
    publisher.logo = {
      '@type': 'ImageObject',
      url: logoUrl,
    }
  }

  const author: Record<string, unknown> = {
    '@type': 'Organization',
    name: orgName,
    url: siteUrl,
  }

  const webPageId = `${params.canonicalUrl}#webpage`
  const articleId = `${params.canonicalUrl}#article`
  const origin = params.siteOrigin.replace(/\/+$/, '')
  const licenseUrl = `${origin}/oferta`
  const privacyUrl = `${origin}/privacy`
  const year = Math.max(params.post.createdAt.getFullYear(), params.post.updatedAt.getFullYear())
  const copyrightNotice = `© ${year} ${orgName}. Первоисточник: ${params.canonicalUrl}`

  const keywords =
    params.post.type === 'news'
      ? ['Inner Health', 'новости', 'здоровье', 'нутриенты']
      : ['Inner Health', 'статья', 'здоровье', 'питание', 'нутриенты']

  const webPage: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': webPageId,
    url: params.canonicalUrl,
    name: params.post.title,
    description,
    inLanguage: 'ru-RU',
    isPartOf: {
      '@type': 'WebSite',
      name: orgName,
      url: siteUrl,
    },
    datePublished: published,
    dateModified: modified,
    license: licenseUrl,
  }
  if (absoluteImage) {
    webPage.primaryImageOfPage = {
      '@type': 'ImageObject',
      url: absoluteImage,
    }
  }

  const article: Record<string, unknown> = {
    '@type': articleType,
    '@id': articleId,
    mainEntityOfPage: { '@id': webPageId },
    headline: params.post.title,
    description,
    abstract: params.post.excerpt?.trim() || description.slice(0, 280),
    inLanguage: 'ru-RU',
    isAccessibleForFree: true,
    datePublished: published,
    dateModified: modified,
    url: params.canonicalUrl,
    author,
    publisher,
    copyrightHolder: { '@type': 'Organization', name: orgName, url: siteUrl },
    articleSection: isNews ? 'Новости' : 'Статьи',
    keywords: keywords.join(', '),
    about: {
      '@type': 'Thing',
      name: 'Здоровье, нутриенты и сбалансированное питание',
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#geo-article-title', '#geo-article-root'],
    },
    license: licenseUrl,
    publishingPrinciples: privacyUrl,
    copyrightNotice,
    creditText: `Материал: ${orgName}. При цитировании укажите ссылку на ${params.canonicalUrl}`,
  }
  if (absoluteImage) {
    article.image = [absoluteImage]
  }
  if (params.articleBodyPlain.trim().length > 0) {
    article.articleBody = params.articleBodyPlain
    article.wordCount = wordCount
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [webPage, article],
  }
}

interface WebSiteJsonLd {
  '@context': 'https://schema.org'
  '@type': 'WebSite'
  name?: string
  url?: string
  potentialAction?: {
    '@type': 'SearchAction'
    target: {
      '@type': 'EntryPoint'
      urlTemplate: string
    }
    'query-input': string
  }
}

interface FaqPageJsonLd {
  '@context': 'https://schema.org'
  '@type': 'FAQPage'
  mainEntity: {
    '@type': 'Question'
    name: string
    acceptedAnswer: {
      '@type': 'Answer'
      text: string
    }
  }[]
}

/**
 * WebSite + SearchAction for sitelinks search box (when base URL and name are configured).
 */
export function buildWebSiteJsonLd(settings: Record<string, string>): WebSiteJsonLd | null {
  const enabled = parseBooleanFlag(settings.schema_org_enabled)
  if (!enabled) return null

  const url = settings.schema_org_url?.trim()
  const name =
    settings.schema_org_legal_name?.trim() || settings.site_name?.trim() || 'Inner Health'

  if (!url) return null

  const catalogSearchTemplate = `${url.replace(/\/+$/, '')}/catalog?q={search_term_string}`

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: catalogSearchTemplate,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * FAQPage structured data for rich results (plain-text answers required).
 */
export function buildFaqPageJsonLd(params: {
  settings: Record<string, string>
  items: { question: string; answerPlain: string }[]
}): FaqPageJsonLd | null {
  const enabled = parseBooleanFlag(params.settings.schema_org_enabled)
  if (!enabled || params.items.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: params.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answerPlain,
      },
    })),
  }
}
