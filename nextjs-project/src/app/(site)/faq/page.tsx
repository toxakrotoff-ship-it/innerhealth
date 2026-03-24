import type { Metadata } from 'next'
import * as faqService from '@/services/faq.service'
import { getSettingsMap } from '@/services/settings.service'
import { buildFaqPageJsonLd } from '@/lib/schema-org'
import { stripHtmlToPlainText } from '@/lib/plain-text'
import { FaqAccordion } from '@/components/site/faq-accordion'
import { HowToOrderSteps } from '@/components/site/how-to-order-steps'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { ResponsiveText, Heading1 } from '@/components/ui/responsive-text'
import { getServerBrandContext } from '@/lib/brand/brand-server'
import { isSprintPowerBrand } from '@/lib/brand/brand-scope'
import { getResolvedBlocksForPage } from '@/services/content-block.service'

export const revalidate = 86400

export async function generateMetadata(): Promise<Metadata> {
  const { siteTitle } = await getServerBrandContext()
  return {
    title: 'Часто задаваемые вопросы',
    description: `Ответы на популярные вопросы ${siteTitle}: доставка, оплата, товары, возврат и оформление заказа.`,
    alternates: { canonical: '/faq' },
    openGraph: {
      title: `FAQ | ${siteTitle}`,
      description: 'Часто задаваемые вопросы о магазине, доставке и заказах.',
      url: '/faq',
    },
  }
}

export default async function FaqPage() {
  const { brandId } = await getServerBrandContext()
  const isSprintTheme = isSprintPowerBrand(brandId)
  const [faqItemsFromDb, settings, sprintFaqBlocks] = await Promise.all([
    faqService.getPublishedFaqItems(),
    getSettingsMap(),
    isSprintTheme ? getResolvedBlocksForPage('faq', brandId) : Promise.resolve([]),
  ])
  const getSprintBlockText = (key: string, fallback: string): string => {
    const text = sprintFaqBlocks.find((b) => b.key === key)?.text?.trim()
    return text && text.length > 0 ? text : fallback
  }
  const sprintFaqItems = [
    {
      id: 'sp-faq-1',
      question: getSprintBlockText(
        'faq.sprint.q1',
        'Как выбрать продукт Sprint Power под цель тренировки?'
      ),
      answer: getSprintBlockText(
        'faq.sprint.a1',
        'Для набора и восстановления выбирайте белковые комплексы, для выносливости — формулы поддержки энергии и электролитов. Начните с базового продукта и отслеживайте самочувствие 2-3 недели.'
      ),
    },
    {
      id: 'sp-faq-2',
      question: getSprintBlockText(
        'faq.sprint.q2',
        'Можно ли сочетать несколько продуктов Sprint Power одновременно?'
      ),
      answer: getSprintBlockText(
        'faq.sprint.a2',
        'Да, но лучше вводить их поэтапно. Начните с одного продукта, затем добавляйте следующий с интервалом 5-7 дней, чтобы оценить переносимость и эффект.'
      ),
    },
    {
      id: 'sp-faq-3',
      question: getSprintBlockText(
        'faq.sprint.q3',
        'Когда принимать продукты: до или после тренировки?'
      ),
      answer: getSprintBlockText(
        'faq.sprint.a3',
        'Зависит от формулы: продукты для энергии обычно принимают до тренировки, для восстановления — после. Ориентируйтесь на рекомендации на странице товара.'
      ),
    },
    {
      id: 'sp-faq-4',
      question: getSprintBlockText(
        'faq.sprint.q4',
        'Есть ли доставка по России и как быстро приходит заказ?'
      ),
      answer: getSprintBlockText(
        'faq.sprint.a4',
        'Да, доставляем по России через СДЭК. Срок зависит от региона и обычно отображается при оформлении заказа.'
      ),
    },
  ] as const
  const faqItems = isSprintTheme ? sprintFaqItems : faqItemsFromDb

  const faqJsonLd = buildFaqPageJsonLd({
    settings,
    items: faqItems.map((item) => ({
      question: item.question,
      answerPlain: stripHtmlToPlainText(item.answer, 5000),
    })),
  })

  return (
    <section className={isSprintTheme ? 'bg-[#060A14]' : ''}>
      <AdaptiveContainer maxWidth="default" className={`py-10 ${isSprintTheme ? 'text-slate-100' : ''}`}>
        <Heading1 className={`mb-2 ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
          Часто задаваемые вопросы
        </Heading1>
        <ResponsiveText
          as="p"
          variant="base"
          color={isSprintTheme ? 'primary' : 'secondary'}
          className={`mb-8 ${isSprintTheme ? 'text-slate-300' : ''}`}
        >
          {isSprintTheme
            ? getSprintBlockText(
                'faq.sprint.subtitle',
                'Ответы на частые вопросы о линейке Sprint Power, приеме продуктов, доставке и заказах.'
              )
            : 'Ответы на популярные вопросы о товарах, доставке и оформлении заказа.'}
        </ResponsiveText>
        <FaqAccordion items={faqItems} isSprintTheme={isSprintTheme} />
        <HowToOrderSteps embedded isSprintTheme={isSprintTheme} />
        {faqJsonLd ? (
          <script
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
          />
        ) : null}
      </AdaptiveContainer>
    </section>
  )
}
