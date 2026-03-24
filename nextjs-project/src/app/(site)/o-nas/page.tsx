import Link from 'next/link'
import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { ResponsiveText } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import { getResolvedBlocksForPage } from '@/services/content-block.service'
import type { Metadata } from 'next'
import { getServerBrandContext } from '@/lib/brand/brand-server'

const IMAGE_FACE_DEFAULT = '/images/o-nas/face-lift.jpg'
const IMAGE_NUTRITION_DEFAULT = '/images/o-nas/nutrition.jpg'

export const revalidate = 86400

const PARTNERS = [
  'Международным институтом PreventAge',
  'Университетом образовательной медицины (UOM)',
  'Международным институтом интегративной нутрициологии (МИИН)',
  'Первым Московским государственным медицинским университетом им. И.М. Сеченова',
] as const

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
    <div className="bg-white">
      <AdaptiveContainer
        maxWidth="default"
        className="pt-2 md:pt-3 pb-12 sm:pb-16 md:pb-20 lg:pb-24"
      >
        <Breadcrumbs items={breadcrumbItems} />

        <ResponsiveText as="h1" variant="4xl" weight="bold" className="mb-10 mt-0 font-display">
          О нас
        </ResponsiveText>

        {/* Блок 1: Формула красоты и молодости */}
        <section className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
          <div className="space-y-4 text-gray-700 leading-relaxed order-2 lg:order-1">
            <>
              <p>
                Формула красоты и молодости существует. Главное в ней не дорогие
                крема, сыворотки, кондиционеры и шампуни. Красота рождается изнутри.
                Здоровые люди обворожительны по-особому.
              </p>
              <p>
                {siteTitle} – это инновационные здоровьесберегающие продукты с
                нутрикосметическим эффектом. Они расширяют границы вашего потенциала.
                С ними ваш белковый статус в норме. А ухоженная, упругая кожа, густые,
                блестящие волосы, легкая походка, стройное тело вне времени, вне
                возраста.
              </p>
              <p>
                Все от разработки формул и производства основного сырья делаем в
                России. Стоимость продукции не обременена затратами на логистику и
                колебаниями курса доллара.
              </p>
              <p>
                Чистые составы без дополнительных объемных реагентов, консервантов,
                красителей, подсластителей. Высокая биодоступность и эффективная
                синергия компонентов. Результативность пролонгирована. Ее чувствуют,
                видят, ценят.
              </p>
            </>
          </div>
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm max-w-md mx-auto w-full order-1 lg:order-2">
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
                className="mb-6"
              >
                {block2Title?.text ?? siteTitle}
              </ResponsiveText>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <>
                  <p>
                    {siteTitle} на рынке с 2022 года, но уже сыскала доверие
                    покупателей. Более 5000 человек каждый день становятся с нами
                    здоровее и возвращаются вновь и вновь. Особая гордость – более
                    2000 положительных отзывов, которые вдохновляют нас идти дальше.
                    Бесценно доверие врачей конвенциальной и превентивной медицины,
                    нутрициологов, диетологов, косметологов.
                  </p>
                  <p>
                    Сотрудничаем с{' '}
                    {PARTNERS.map((name, i) => (
                      <span key={name}>
                        {i > 0 && ', '}
                        {name}
                      </span>
                    ))}
                    .
                  </p>
                </>
              </div>
            </div>
          </div>
        </section>

        <ScalableSpacing size="lg" />

        {/* Призыв к действию */}
        <section className="mt-10 bg-soft-background rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-text font-medium mb-4">
            Выберите продукты для красоты и здоровья изнутри
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center rounded-full bg-action-blue text-gray-800 font-medium px-6 py-2.5 min-h-[44px] hover:bg-action-blue/90 transition-colors"
          >
            Перейти в каталог
          </Link>
        </section>
      </AdaptiveContainer>
    </div>
  )
}
