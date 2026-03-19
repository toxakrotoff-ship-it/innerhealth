import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import * as seoHubService from '@/services/seo-hub.service'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { BreadcrumbJsonLd } from '@/components/site/breadcrumb-json-ld'
import { TipTapDocRenderer } from '@/components/site/tiptap-doc-renderer'
import { ProductCard } from '@/components/site/product-card'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { Heading1, Heading2 } from '@/components/ui/responsive-text'
import { getFirstPhotoBlurDataURL } from '@/lib/product-photos'
import { toAbsoluteSiteUrl } from '@/lib/site-url'
import { extractPlainTextFromPostContent } from '@/lib/tiptap-plain-text'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 600

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const hub = await seoHubService.getPublishedSeoHubBySlug(slug)
  if (!hub) return {}
  const fromBody = extractPlainTextFromPostContent(hub.content, 200)
  const description =
    hub.excerpt?.trim() ||
    (fromBody.length > 0 ? fromBody.slice(0, 158) : `${hub.title} — подборка Inner Health.`)
  const path = `/guides/${slug}`
  return {
    title: hub.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${hub.title} | Inner Health`,
      description,
      url: path,
    },
  }
}

export default async function SeoHubPage({ params }: PageProps) {
  const { slug } = await params
  const hub = await seoHubService.getPublishedSeoHubBySlug(slug)
  if (!hub) notFound()

  const slugOrder: Map<string, number> = new Map(
    hub.productSlugs.map((s, i): [string, number] => [s, i])
  )
  const products =
    hub.productSlugs.length > 0
      ? await prisma.product.findMany({
          where: { slug: { in: hub.productSlugs } },
          select: {
            id: true,
            title: true,
            price: true,
            priceOld: true,
            photo: true,
            photos: true,
            slug: true,
            isPromoEligible: true,
            discountPrice: true,
            brand: true,
            sku: true,
          },
        })
      : []

  products.sort((a, b) => {
    const ao: number = a.slug != null ? (slugOrder.get(a.slug) ?? 999) : 999
    const bo: number = b.slug != null ? (slugOrder.get(b.slug) ?? 999) : 999
    return ao - bo
  })

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Статьи', href: '/informaciya' },
    { label: hub.title },
  ]
  const currentPath = `/guides/${slug}`

  return (
    <AdaptiveContainer maxWidth="default" className="py-10">
      <BreadcrumbJsonLd items={breadcrumbItems} currentPath={currentPath} />
      <Breadcrumbs items={breadcrumbItems} />
      <article className="mt-4">
        <Heading1 className="text-text mb-4">{hub.title}</Heading1>
        {hub.excerpt && <p className="text-gray-600 mb-6">{hub.excerpt}</p>}
        <TipTapDocRenderer raw={hub.content} />
        {products.length > 0 && (
          <section className="mt-12">
            <Heading2 className="text-text mb-6">Товары в подборке</Heading2>
            <FluidGrid
              cols={2}
              colsTablet={3}
              colsDesktop={4}
              gap="6"
              adaptiveGap={false}
              className="gap-6"
            >
              {products.map((p, index) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  brand={p.brand}
                  sku={p.sku}
                  price={p.price}
                  priceOld={p.priceOld}
                  photo={p.photo}
                  slug={p.slug}
                  isPromoEligible={p.isPromoEligible}
                  discountPrice={p.discountPrice}
                  priority={index < 2}
                  blurDataURL={getFirstPhotoBlurDataURL(p.photos)}
                />
              ))}
            </FluidGrid>
          </section>
        )}
        <footer className="mt-10 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <p className="font-medium text-text mb-1">Источник</p>
          <p>
            <span className="text-gray-600">Материал Inner Health: </span>
            <a
              href={toAbsoluteSiteUrl(currentPath)}
              className="text-action-blue break-all underline-offset-2 hover:underline"
            >
              {toAbsoluteSiteUrl(currentPath)}
            </a>
          </p>
        </footer>
      </article>
      <Link href="/informaciya" className="text-action-blue hover:underline text-sm mt-6 inline-block">
        ← Ко всем статьям
      </Link>
    </AdaptiveContainer>
  )
}
