import Link from 'next/link'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { ResponsiveText } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { TipTapDocRenderer } from '@/components/site/tiptap-doc-renderer'
import { getResolvedBlocksForPage } from '@/services/content-block.service'
import type { Metadata } from 'next'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'

const IMAGE_FACE_DEFAULT = '/images/o-nas/face-lift.jpg'
const IMAGE_NUTRITION_DEFAULT = '/images/o-nas/nutrition.jpg'

export const revalidate = 86400

export async function generateMetadata(): Promise<Metadata> {
  const { siteTitle } = await getServerBrandContext()
  return {
    title: `О нас | ${siteTitle}`,
    description:
      `${siteTitle} – инновационные здоровьесберегающие продукты с нутрикосметическим эффектом. Разработка и производство в России.`,
  }
}

export default async function AboutPage() {
  const { siteTitle, brandId } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'О нас' },
  ]

  const blocks = await getResolvedBlocksForPage('about', brandId)
  const block1 = blocks.find((b) => b.key === 'about.block1')
  const block2Title = blocks.find((b) => b.key === 'about.block2.title')
  const block2Text = blocks.find((b) => b.key === 'about.block2.text')
  const image1Src = blocks.find((b) => b.key === 'about.image1.src')
  const image1Alt = blocks.find((b) => b.key === 'about.image1.alt')
  const image2Src = blocks.find((b) => b.key === 'about.image2.src')
  const image2Alt = blocks.find((b) => b.key === 'about.image2.alt')

  return (
    <div className={isSprintTheme ? 'bg-[#060A14] text-slate-100' : 'bg-white'}>
      <AdaptiveContainer
        maxWidth="default"
        className="pt-2 md:pt-3 pb-12 sm:pb-16 md:pb-20 lg:pb-24"
      >
        <Breadcrumbs items={breadcrumbItems} isInverted={isSprintTheme} />

        <ResponsiveText
          as="h1"
          variant="4xl"
          weight="bold"
          className={`mb-10 mt-0 font-display ${isSprintTheme ? 'text-slate-100' : ''}`}
        >
          О нас
        </ResponsiveText>

        {/* Блок 1: Формула красоты и молодости */}
        <section className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
          <div className="order-2 lg:order-1">
            <TipTapDocRenderer
              raw={block1?.richJson}
              className={isSprintTheme ? 'prose-invert text-slate-300 [&_p]:text-slate-300 [&_strong]:text-slate-100' : 'text-gray-700'}
            />
          </div>
          <div
            className={`order-1 mx-auto w-full max-w-md overflow-hidden rounded-2xl border shadow-sm lg:order-2 ${
              isSprintTheme ? 'border-slate-800 bg-slate-950/40' : 'border-gray-200'
            }`}
          >
            <img
              src={image1Src?.text || IMAGE_FACE_DEFAULT}
              alt={image1Alt?.text || 'Красота и здоровье изнутри'}
              className="w-full h-auto object-cover aspect-[16/9] md:aspect-[3/2] lg:aspect-[4/3]"
            />
          </div>
        </section>

        <ScalableSpacing size="lg" />

        {/* Блок 2: На рынке с 2022, доверие, партнёры */}
        <section className="mt-4">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <div className="order-2 lg:order-1 rounded-2xl overflow-hidden border border-gray-200 shadow-sm max-w-md mx-auto w-full">
              <img
                src={image2Src?.text || IMAGE_NUTRITION_DEFAULT}
                alt={image2Alt?.text || 'Питание и здоровый образ жизни'}
                className="w-full h-auto object-cover aspect-[16/9] md:aspect-[3/2] lg:aspect-[4/3]"
              />
            </div>
            <div className="order-1 lg:order-2">
              <ResponsiveText
                as="h2"
                variant="4xl"
                weight="semibold"
                fontFamily="display"
                className={`mb-6 ${isSprintTheme ? 'text-slate-100' : ''}`}
              >
                {block2Title?.text ?? siteTitle}
              </ResponsiveText>
              <TipTapDocRenderer
                raw={block2Text?.richJson}
                className={isSprintTheme ? 'prose-invert text-slate-300 [&_p]:text-slate-300 [&_strong]:text-slate-100' : 'text-gray-700'}
              />
            </div>
          </div>
        </section>

        <ScalableSpacing size="lg" />

        {/* Призыв к действию */}
        <section
          className={`mt-10 rounded-2xl border p-8 text-center ${
            isSprintTheme ? 'border-slate-800 bg-[#101828]' : 'border-gray-200 bg-soft-background'
          }`}
        >
          <p className={`mb-4 font-medium ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
            Выберите продукты для красоты и здоровья изнутри
          </p>
          <Link
            href="/catalog"
            className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-6 py-2.5 font-medium transition-colors ${
              isSprintTheme
                ? 'bg-[#7AA2FF] text-[#06101f] hover:bg-[#8fb0ff]'
                : 'bg-action-blue text-gray-800 hover:bg-action-blue/90'
            }`}
          >
            Перейти в каталог
          </Link>
        </section>
      </AdaptiveContainer>
    </div>
  )
}
