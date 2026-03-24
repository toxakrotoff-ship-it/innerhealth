import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { PartnershipForm } from '@/components/site/partnership-form'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { getResolvedBlocksForPage } from '@/services/content-block.service'
import type { Metadata } from 'next'
import { getServerBrandContext } from '@/lib/brand/brand-server'

export async function generateMetadata(): Promise<Metadata> {
  const { siteTitle } = await getServerBrandContext()
  return {
    title: `Сотрудничество | ${siteTitle}`,
    description:
      `Партнёрская программа ${siteTitle}: скидки, кешбэк, оптовые условия. Сотрудничаем с врачами, нутрициологами, health-coach, косметологами и фитнес-тренерами.`,
  }
}

const breadcrumbItems = [
  { label: 'Главная', href: '/' },
  { label: 'Сотрудничество' },
]

export const revalidate = 86400

function getText(
  blocks: Array<{ key: string; text: string | null }>,
  key: string,
  fallback: string
): string {
  const value = blocks.find((b) => b.key === key)?.text?.trim()
  return value || fallback
}

export default async function SotrudnichestvoPage() {
  const { siteTitle } = await getServerBrandContext()
  const blocks = await getResolvedBlocksForPage('sotrudnichestvo')
  const pageTitle = getText(blocks, 'cooperation.title', 'Сотрудничество')
  const pageSubtitle = getText(
    blocks,
    'cooperation.subtitle',
    `${siteTitle}: внешние трансформации через красоту изнутри`
  )
  const formTitle = getText(blocks, 'cooperation.form.title', 'Оставить заявку')
  const formSubtitle = getText(
    blocks,
    'cooperation.form.subtitle',
    'Заполните форму — мы свяжемся с вами и обсудим условия сотрудничества.'
  )
  const introTitle = getText(blocks, 'cooperation.intro.title', `Вступайте в команду ${siteTitle}!`)
  const introP1 = getText(
    blocks,
    'cooperation.intro.p1',
    'Объединяем тех, кто точно знает, что молодость и красота – физическое проявление внутреннего здоровья.'
  )
  const introP2 = getText(
    blocks,
    'cooperation.intro.p2',
    'В основе разработок наших препаратов — знание физиологии, научные исследования, превентивная практика, передовые технологии и контроль качества.'
  )
  const introP3 = getText(
    blocks,
    'cooperation.intro.p3',
    'Эффективные формулы. Максимальная биодоступность. Бескомпромиссный результат. Пролонгированное действие.'
  )
  const audienceTitle = getText(blocks, 'cooperation.audience.title', 'С кем мы работаем')
  const audienceText = getText(
    blocks,
    'cooperation.audience.text',
    'Сотрудничаем с врачами, нутрициологами, health-coach, специалистами помогающих профессий, фитнес-тренерами, косметологами.'
  )
  const benefitsTitle = getText(blocks, 'cooperation.benefits.title', 'Вы получите')
  const benefitsItems = [
    getText(
      blocks,
      'cooperation.benefits.item1',
      'Скидка до 25% по личному промокоду для вас, ваших клиентов, пациентов, друзей и знакомых.'
    ),
    getText(
      blocks,
      'cooperation.benefits.item2',
      'Ежемесячный кешбэк от суммы заказа по промокоду — выплачивается по результатам месяца на вашу банковскую карту.'
    ),
    getText(
      blocks,
      'cooperation.benefits.item3',
      'Выгодные условия для оптовых закупок и работы представительств в регионах.'
    ),
  ]
  const extraTitle = getText(blocks, 'cooperation.extra.title', 'А также')
  const extraItems = [
    getText(
      blocks,
      'cooperation.extra.item1',
      'Есть интересные кейсы применения наших продуктов и вы готовы ими делиться — предоставим свои информационные ресурсы.'
    ),
    getText(
      blocks,
      'cooperation.extra.item2',
      'Интересно апробировать в профилактических и терапевтических протоколах и есть возможность фиксировать результат — обсудим и предоставим особые условия на приобретение продукции.'
    ),
    getText(
      blocks,
      'cooperation.extra.item3',
      'Изучаете рынок продуктов для здоровья и делаете обзоры в соцсетях — расскажем о преимуществах и предоставим продукты на тестирование.'
    ),
  ]

  return (
    <div className="bg-white min-h-screen">
      <AdaptiveContainer maxWidth="default" className="pt-6 pb-2">
        <Breadcrumbs items={breadcrumbItems} />
      </AdaptiveContainer>

      <AdaptiveContainer maxWidth="default" className="py-8 pb-16">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-text mb-4">
            {pageTitle}
          </h1>
          <p className="text-xl text-gray-600 font-medium">
            {pageSubtitle}
          </p>
        </header>

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-text mb-3">
              {introTitle}
            </h2>
            <p>{introP1}</p>
            <p>{introP2}</p>
            <p className="font-medium text-text">
              {introP3}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text mb-3">{audienceTitle}</h2>
            <p>{audienceText}</p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-soft-background/50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-text mb-4">{benefitsTitle}</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              {benefitsItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-soft-background/50 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-text mb-4">{extraTitle}</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              {extraItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          </section>
        </div>

        <section className="mt-14 pt-10 border-t border-gray-200">
          <h2 className="text-2xl font-semibold text-text mb-2">{formTitle}</h2>
          <p className="text-gray-600 mb-8">
            {formSubtitle}
          </p>
          <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <PartnershipForm />
          </div>
        </section>
      </AdaptiveContainer>
    </div>
  )
}
