import { Breadcrumbs } from '@/components/site/breadcrumbs'
import { PartnershipForm } from '@/components/site/partnership-form'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { getResolvedBlocksForPage } from '@/services/content-block.service'
import type { Metadata } from 'next'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'

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
  const { siteTitle, brandId } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const blocks = await getResolvedBlocksForPage('sotrudnichestvo', brandId)
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
    <div className={isSprintTheme ? 'min-h-screen bg-[#060A14] text-slate-100' : 'min-h-screen bg-white'}>
      <AdaptiveContainer maxWidth="default" className="pt-6 pb-2">
        <Breadcrumbs items={breadcrumbItems} isInverted={isSprintTheme} />
      </AdaptiveContainer>

      <AdaptiveContainer maxWidth="default" className="py-8 pb-16">
        <header className="mb-10">
          <h1 className={`mb-4 text-3xl font-bold sm:text-4xl ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
            {pageTitle}
          </h1>
          <p className={`text-xl font-medium ${isSprintTheme ? 'text-slate-300' : 'text-gray-600'}`}>
            {pageSubtitle}
          </p>
        </header>

        <div
          className={`max-w-none space-y-10 leading-relaxed ${
            isSprintTheme ? 'text-slate-300' : 'prose prose-gray text-gray-700'
          }`}
        >
          <section>
            <h2 className={`mb-3 text-xl font-semibold ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
              {introTitle}
            </h2>
            <p>{introP1}</p>
            <p>{introP2}</p>
            <p className={`font-medium ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
              {introP3}
            </p>
          </section>

          <section>
            <h2 className={`mb-3 text-xl font-semibold ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>{audienceTitle}</h2>
            <p>{audienceText}</p>
          </section>

          <section
            className={`rounded-2xl border p-6 sm:p-8 ${
              isSprintTheme ? 'border-slate-800 bg-slate-950/50' : 'border-gray-200 bg-soft-background/50'
            }`}
          >
            <h2 className={`mb-4 text-xl font-semibold ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>{benefitsTitle}</h2>
            <ol className={`list-inside list-decimal space-y-3 ${isSprintTheme ? 'text-slate-300' : 'text-gray-700'}`}>
              {benefitsItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          </section>

          <section
            className={`rounded-2xl border p-6 sm:p-8 ${
              isSprintTheme ? 'border-slate-800 bg-slate-950/50' : 'border-gray-200 bg-soft-background/50'
            }`}
          >
            <h2 className={`mb-4 text-xl font-semibold ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>{extraTitle}</h2>
            <ol className={`list-inside list-decimal space-y-3 ${isSprintTheme ? 'text-slate-300' : 'text-gray-700'}`}>
              {extraItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ol>
          </section>
        </div>

        <section className={`mt-14 border-t pt-10 ${isSprintTheme ? 'border-slate-800' : 'border-gray-200'}`}>
          <h2 className={`mb-2 text-2xl font-semibold ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>{formTitle}</h2>
          <p className={`mb-8 ${isSprintTheme ? 'text-slate-400' : 'text-gray-600'}`}>
            {formSubtitle}
          </p>
          <div
            className={`max-w-xl rounded-2xl border p-6 shadow-sm sm:p-8 ${
              isSprintTheme
                ? 'border-slate-800 bg-[#101828] shadow-[0_24px_80px_rgba(0,0,0,0.35)]'
                : 'border-gray-200 bg-white'
            }`}
          >
            <PartnershipForm isSprintTheme={isSprintTheme} />
          </div>
        </section>
      </AdaptiveContainer>
    </div>
  )
}
