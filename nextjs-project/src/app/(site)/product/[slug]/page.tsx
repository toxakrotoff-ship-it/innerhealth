import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProductPageContent } from '@/components/site/product-page-content'
import * as productService from '@/services/product.service'
import * as productRelationService from '@/services/product-relation.service'
import * as productDocumentService from '@/services/product-document.service'
import { parseProductGalleryPhotos } from '@/lib/product-gallery'
import { getSettingsMap } from '@/services/settings.service'
import { buildProductJsonLd } from '@/lib/schema-org'
import { toAbsoluteSiteUrl } from '@/lib/site-url'
import { BreadcrumbJsonLd } from '@/components/site/breadcrumb-json-ld'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { getBrandSiteConfig } from '@/lib/brand/site-branding'
import { isSprintPowerBrand, productBelongsToBrandScope } from '@/lib/brand/brand-scope'
import { buildMetadataWithSocial, normalizeSeoDescription, parseSeoKeywords, trimToNull } from '@/lib/seo'

export const revalidate = 300

import { buildProductTabs } from '@/lib/product-tabs'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brandId } = await getServerBrandContext()
  const siteTitle = getBrandSiteConfig(brandId).title
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      title: true,
      description: true,
      seoTitle: true,
      seoDescr: true,
      seoKeywords: true,
      fbTitle: true,
      fbDescr: true,
      photo: true,
      photos: true,
      brand: true,
      isDraft: true,
    },
  })
  if (!product) {
    return {}
  }
  if (!productBelongsToBrandScope(product.brand, brandId)) return {}
  if (product.isDraft) {
    return {
      robots: {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      },
    }
  }

  const photos = parseProductGalleryPhotos(product.photos, product.photo)
  const primaryImage = photos[0]?.url
  const path = `/product/${slug}`
  const description =
    normalizeSeoDescription(product.seoDescr, 200) ??
    normalizeSeoDescription(product.description) ??
    `Купить ${product.title} в интернет-магазине ${siteTitle}. Доставка по России.`
  const metadataTitle = trimToNull(product.seoTitle) ?? product.title
  const ogTitle = trimToNull(product.fbTitle) ?? trimToNull(product.seoTitle) ?? product.title
  const ogDescription = trimToNull(product.fbDescr) ?? trimToNull(product.seoDescr) ?? description
  const keywords = parseSeoKeywords(product.seoKeywords)

  return {
    ...buildMetadataWithSocial({
      title: metadataTitle,
      description,
      path,
      keywords,
      image: primaryImage ? { url: primaryImage, alt: product.title } : null,
    }),
    openGraph: {
      type: 'website',
      title: ogTitle,
      description: ogDescription,
      url: path,
      ...(primaryImage ? { images: [{ url: primaryImage, alt: product.title }] } : {}),
    },
    twitter: {
      card: primaryImage ? 'summary_large_image' : 'summary',
      title: ogTitle,
      description: ogDescription,
      ...(primaryImage ? { images: [primaryImage] } : {}),
    },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { brandId } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { categories: { include: { category: true } } },
  })

  if (!product) notFound()
  if (!productBelongsToBrandScope(product.brand, brandId)) notFound()
  if (product.isDraft) notFound()

  const flavorVariants = product.parentUid
    ? await productService.getProductFlavorVariantsByParentUid(product.parentUid, brandId)
    : []

  const sortedCategoryLinks = [...product.categories].sort((a, b) => {
    const ao = a.category.sortOrder ?? 0
    const bo = b.category.sortOrder ?? 0
    if (ao !== bo) return ao - bo
    return a.category.title.localeCompare(b.category.title, 'ru')
  })
  const primaryCategory = sortedCategoryLinks[0]?.category
  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Каталог', href: '/catalog' },
    ...(primaryCategory
      ? [{ label: primaryCategory.title, href: `/catalog/${primaryCategory.slug}` }]
      : []),
    { label: product.title },
  ]
  const productPath = `/product/${slug}`

  const categoryIds = product.categories.map((item) => item.categoryId)
  const [relatedProducts, relationSections, structuredDocuments] = await Promise.all([
    productService.getRelatedProductsByCategory(product.id, categoryIds, 8, brandId),
    productRelationService.getPublishedProductRelations({ sourceProductId: product.id, brandId }),
    productDocumentService.getPublishedProductDocuments({ productId: product.id, brandId }),
  ])
  const photos = parseProductGalleryPhotos(product.photos, product.photo)

  const settings = await getSettingsMap(undefined, { brandId })
  const schemaUrl = settings.schema_org_url?.trim()
  const url = schemaUrl ? `${schemaUrl.replace(/\/+$/, '')}/product/${slug}` : toAbsoluteSiteUrl(`/product/${slug}`)
  const imageUrls = photos.map((p) => p.url)
  const seoDescription =
    normalizeSeoDescription(product.seoDescr, 200) ??
    normalizeSeoDescription(product.description) ??
    `Купить ${product.title} в интернет-магазине ${getBrandSiteConfig(brandId).title}. Доставка по России.`
  const productJsonLd = buildProductJsonLd({
    settings,
    product: {
      title: product.title,
      description: seoDescription,
      price: product.price,
      quantity: product.quantity,
      isPreorderEnabled: product.isPreorderEnabled,
      brand: product.brand ?? null,
      sku: product.sku ?? null,
    },
    url,
    images: imageUrls,
  })

  return (
    <section className={isSprintTheme ? 'bg-[#060A14] py-6' : ''}>
      <BreadcrumbJsonLd items={breadcrumbItems} currentPath={productPath} />
      <ProductPageContent
        product={product}
        tabs={buildProductTabs(product)}
        photos={photos}
        flavorVariants={flavorVariants}
        relatedProducts={relatedProducts}
        relationSections={relationSections}
        structuredDocuments={structuredDocuments}
        relatedProductsCategoryTitle={primaryCategory?.title ?? null}
        breadcrumbItems={breadcrumbItems}
        isSprintTheme={isSprintTheme}
      />
      {productJsonLd && (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
    </section>
  )
}
