import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProductPageContent } from '@/components/site/product-page-content'
import * as productService from '@/services/product.service'
import { parseProductGalleryPhotos } from '@/lib/product-gallery'
import { slugify, slugifyUnique } from '@/lib/slugify'

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
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: { categories: { include: { category: true } } },
  })

  if (!product) notFound()

  const resolvedSlug = await ensureProductSlug(product)
  if (resolvedSlug) redirect(`/product/${resolvedSlug}`)

  const sortedCategoryLinks = [...product.categories].sort((a, b) => {
    const ao = a.category.sortOrder ?? 0
    const bo = b.category.sortOrder ?? 0
    if (ao !== bo) return ao - bo
    return a.category.title.localeCompare(b.category.title, 'ru')
  })
  const primaryCategory = sortedCategoryLinks[0]?.category

  const categoryIds = product.categories.map((item) => item.categoryId)
  const relatedProducts = await productService.getRelatedProductsByCategory(product.id, categoryIds, 8)
  const photos = parseProductGalleryPhotos(product.photos, product.photo)

  return (
    <ProductPageContent
      product={product}
      tabs={buildTabs(product)}
      photos={photos}
      relatedProducts={relatedProducts}
      relatedProductsCategoryTitle={primaryCategory?.title ?? null}
    />
  )
}
