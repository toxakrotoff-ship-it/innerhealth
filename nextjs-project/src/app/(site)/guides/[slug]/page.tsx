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
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 600
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { siteTitle, brandId } = await getServerBrandContext()
  const { slug } = await params
  const hub = await seoHubService.getPublishedSeoHubBySlug(slug, brandId)
  if (!hub) return {}
  const fromBody = extractPlainTextFromPostContent(hub.content, 200)
  const description =
    hub.excerpt?.trim() ||
    (fromBody.length > 0 ? fromBody.slice(0, 158) : `${hub.title} — подборка ${siteTitle}.`)
  const path = `/guides/${slug}`
  return {
    title: hub.title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${hub.title} | ${siteTitle}`,
      description,
      url: path,
    },
  }
}

export default async function SeoHubPage({ params }: PageProps) {
  const { siteTitle, brandId } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const { slug } = await params
  const hub = await seoHubService.getPublishedSeoHubBySlug(slug, brandId)
  if (!hub) notFound()

  const slugOrder: Map<string, number> = new Map(
    hub.productSlugs.map((s, i): [string, number] => [s, i])
  )
  const products =
    hub.productSlugs.length > 0
      ? await prisma.product.findMany({
          where: {
            slug: { in: hub.productSlugs },
            ...(isSprintTheme
              ? { brand: 'sprint-power' }
              : { OR: [{ brand: null }, { brand: { not: 'sprint-power' } }] }),
          },
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
            quantity: true,
            isPreorderEnabled: true,
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
    <section className={isSprintTheme ? 'bg-[#060A14]' : ''}>
      <AdaptiveContainer
        maxWidth="default"
        className={`py-10 ${isSprintTheme ? 'text-slate-100' : ''}`}
      >
        <BreadcrumbJsonLd items={breadcrumbItems} currentPath={currentPath} />
        <Breadcrumbs items={breadcrumbItems} />
        <article className="mt-4">
          <Heading1 className={`mb-4 ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>{hub.title}</Heading1>
          {hub.excerpt && (
            <p className={`mb-6 ${isSprintTheme ? 'text-slate-300' : 'text-gray-600'}`}>{hub.excerpt}</p>
          )}
          <TipTapDocRenderer raw={hub.content} />
          {products.length > 0 && (
            <section className="mt-12">
              <Heading2 className={`mb-6 ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
                Товары в подборке
              </Heading2>
              <FluidGrid
                cols={2}
                colsTablet={3}
                colsDesktop={4}
                gap="6"
                adaptiveGap={false}
                className="max-sm:grid-cols-1 gap-6"
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
                    photos={p.photos}
                    slug={p.slug}
                    isPromoEligible={p.isPromoEligible}
                    discountPrice={p.discountPrice}
                    quantity={p.quantity}
                    isPreorderEnabled={p.isPreorderEnabled}
                    priority={index < 2}
                    blurDataURL={getFirstPhotoBlurDataURL(p.photos)}
                  />
                ))}
              </FluidGrid>
            </section>
          )}
          <footer
            className={`mt-10 rounded-xl px-4 py-3 text-sm ${
              isSprintTheme
                ? 'border border-slate-700 bg-[#0F172A] text-slate-300'
                : 'border border-gray-200 bg-gray-50 text-gray-700'
            }`}
          >
            <p className={`font-medium mb-1 ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>Источник</p>
            <p>
              <span className={isSprintTheme ? 'text-slate-400' : 'text-gray-600'}>
                Материал {siteTitle}:{' '}
              </span>
              <a
                href={toAbsoluteSiteUrl(currentPath)}
                className={`break-all underline-offset-2 hover:underline ${
                  isSprintTheme ? 'text-[#7AA2FF]' : 'text-action-blue'
                }`}
              >
                {toAbsoluteSiteUrl(currentPath)}
              </a>
            </p>
          </footer>
        </article>
        <Link
          href="/informaciya"
          className={`text-sm mt-6 inline-block hover:underline ${
            isSprintTheme ? 'text-[#7AA2FF]' : 'text-action-blue'
          }`}
        >
          ← Ко всем статьям
        </Link>
      </AdaptiveContainer>
    </section>
  )
}
