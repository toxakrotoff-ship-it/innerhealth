import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProductPageContent } from '@/components/site/product-page-content'
import * as productService from '@/services/product.service'
import { parseProductGalleryPhotos } from '@/lib/product-gallery'
import { getSettingsMap } from '@/services/settings.service'
import { buildProductJsonLd } from '@/lib/schema-org'
import { stripHtmlToPlainText } from '@/lib/plain-text'
import { toAbsoluteSiteUrl } from '@/lib/site-url'
import { BreadcrumbJsonLd } from '@/components/site/breadcrumb-json-ld'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { getBrandSiteConfig } from '@/lib/brand/site-branding'
import { isSprintPowerBrand, productBelongsToBrandScope } from '@/lib/brand/brand-scope'

export const revalidate = 300

const DEFAULT_TAB_TITLES = ['Преимущества', 'Состав', 'Способ применения и дозировка', 'Характеристики'] as const

function buildTabs(product: {
  tab1: string | null
  tab2: string | null
  tab3: string | null
  tab4: string | null
  tab1Title: string | null
  tab2Title: string | null
  tab3Title: string | null
  tab4Title: string | null
}) {
  return [
    product.tab1 && { title: (product.tab1Title?.trim() || DEFAULT_TAB_TITLES[0]), content: product.tab1 },
    product.tab2 && { title: (product.tab2Title?.trim() || DEFAULT_TAB_TITLES[1]), content: product.tab2 },
    product.tab3 && { title: (product.tab3Title?.trim() || DEFAULT_TAB_TITLES[2]), content: product.tab3 },
    product.tab4 && { title: (product.tab4Title?.trim() || DEFAULT_TAB_TITLES[3]), content: product.tab4 },
  ].filter(Boolean) as { title: string; content: string }[]
}

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
      photo: true,
      photos: true,
      brand: true,
    },
  })
  if (!product) {
    return {}
  }
  if (!productBelongsToBrandScope(product.brand, brandId)) return {}

  const description = product.description
    ? stripHtmlToPlainText(product.description, 158)
    : `Купить ${product.title} в интернет-магазине ${siteTitle}. Доставка по России.`

  const photos = parseProductGalleryPhotos(product.photos, product.photo)
  const primaryImage = photos[0]?.url
  const path = `/product/${slug}`

  return {
    title: product.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title: product.title,
      description,
      url: path,
      ...(primaryImage
        ? { images: [{ url: primaryImage, alt: product.title }] }
        : {}),
    },
    twitter: {
      card: primaryImage ? 'summary_large_image' : 'summary',
      title: product.title,
      description,
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
  const relatedProducts = await productService.getRelatedProductsByCategory(product.id, categoryIds, 8)
  const photos = parseProductGalleryPhotos(product.photos, product.photo)

  const settings = await getSettingsMap()
  const schemaUrl = settings.schema_org_url?.trim()
  const url = schemaUrl ? `${schemaUrl.replace(/\/+$/, '')}/product/${slug}` : toAbsoluteSiteUrl(`/product/${slug}`)
  const imageUrls = photos.map((p) => p.url)
  const productJsonLd = buildProductJsonLd({
    settings,
    product: {
      title: product.title,
      description: product.description ?? null,
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
        tabs={buildTabs(product)}
        photos={photos}
        relatedProducts={relatedProducts}
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
