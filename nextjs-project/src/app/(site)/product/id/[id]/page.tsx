import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { BreadcrumbJsonLd } from '@/components/site/breadcrumb-json-ld'
import { prisma } from '@/lib/prisma'
import { ProductPageContent } from '@/components/site/product-page-content'
import * as productService from '@/services/product.service'
import { parseProductGalleryPhotos } from '@/lib/product-gallery'
import { slugify, slugifyUnique } from '@/lib/slugify'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand, productBelongsToBrandScope } from '@/lib/brand/brand-scope'

export const revalidate = 300

import { buildProductTabs } from '@/lib/product-tabs'

interface PageProps {
  params: Promise<{ id: string }>
}

async function ensureProductSlug(product: { id: string; title: string; slug: string | null }): Promise<string | null> {
  if (product.slug) return product.slug

  const baseSlug = slugify(product.title || `product-${product.id.slice(0, 8)}`)
  const existingSlugs = await productService.getExistingProductSlugs()
  const nextSlug = slugifyUnique(baseSlug, existingSlugs)

  try {
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { slug: nextSlug },
      select: { slug: true },
    })
    return updated.slug
  } catch {
    const actual = await prisma.product.findUnique({
      where: { id: product.id },
      select: { slug: true },
    })
    return actual?.slug ?? null
  }
}

export default async function ProductByIdPage({ params }: PageProps) {
  const { brandId } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: { categories: { include: { category: true } } },
  })

  if (!product) notFound()
  if (!productBelongsToBrandScope(product.brand, brandId)) notFound()

  const resolvedSlug = await ensureProductSlug(product)
  if (resolvedSlug) redirect(`/product/${resolvedSlug}`)

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
  const productPath = `/product/id/${id}`

  const categoryIds = product.categories.map((item) => item.categoryId)
  const relatedProducts = await productService.getRelatedProductsByCategory(product.id, categoryIds, 8, brandId)
  const photos = parseProductGalleryPhotos(product.photos, product.photo)

  return (
    <section className={isSprintTheme ? 'bg-[#060A14] py-6' : ''}>
      <BreadcrumbJsonLd items={breadcrumbItems} currentPath={productPath} />
      <ProductPageContent
        product={product}
        tabs={buildProductTabs(product)}
        photos={photos}
        relatedProducts={relatedProducts}
        relatedProductsCategoryTitle={primaryCategory?.title ?? null}
        breadcrumbItems={breadcrumbItems}
        isSprintTheme={isSprintTheme}
      />
    </section>
  )
}
