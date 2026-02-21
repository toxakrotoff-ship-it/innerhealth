import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProductPageContent } from '@/components/site/product-page-content'

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
  params: Promise<{ id: string }>
}

export default async function ProductByIdPage({ params }: PageProps) {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: { categories: { include: { category: true } } },
  })

  if (!product) notFound()

  if (product.slug) redirect(`/product/${product.slug}`)

  return <ProductPageContent product={product} tabs={buildTabs(product)} />
}
