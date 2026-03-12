import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProductPageContent } from '@/components/site/product-page-content'
import * as productService from '@/services/product.service'
import { parseProductGalleryPhotos } from '@/lib/product-gallery'
import { getSettingsMap } from '@/services/settings.service'
import { buildProductJsonLd } from '@/lib/schema-org'

export const revalidate = 60

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

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { categories: { include: { category: true } } },
  })

  if (!product) notFound()

  const categoryIds = product.categories.map((item) => item.categoryId)
  const relatedProducts = await productService.getRelatedProductsByCategory(product.id, categoryIds, 8)
  const photos = parseProductGalleryPhotos(product.photos, product.photo)

  const settings = await getSettingsMap()
  const baseUrl = settings.schema_org_url?.trim() || ''
  const url = baseUrl ? `${baseUrl}/product/${slug}` : `/product/${slug}`
  const imageUrls = photos.map((p) => p.url)
  const productJsonLd = buildProductJsonLd({
    settings,
    product: {
      title: product.title,
      description: product.description ?? null,
      price: product.price,
      quantity: product.quantity,
      brand: product.brand ?? null,
      sku: product.sku ?? null,
    },
    url,
    images: imageUrls,
  })

  return (
    <>
      <ProductPageContent
        product={product}
        tabs={buildTabs(product)}
        photos={photos}
        relatedProducts={relatedProducts}
      />
      {productJsonLd && (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
    </>
  )
}
