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
  const [faqItemsFromDb, settings, faqBlocks, homeBlocks] = await Promise.all([
    faqService.getPublishedFaqItems(),
    getSettingsMap(),
    getResolvedBlocksForPage('faq', brandId),
    getResolvedBlocksForPage('home', brandId),
  ])
  const getBlockText = (key: string, fallback: string): string => {
    const text = faqBlocks.find((b) => b.key === key)?.text?.trim()
    return text && text.length > 0 ? text : fallback
  }
  const sprintFaqItems = [
    {
      id: 'sp-faq-1',
      question: getBlockText(
        'faq.q1',
        'Как выбрать продукт Sprint Power под цель тренировки?'
      ),
      answer: getBlockText(
        'faq.a1',
        'Для набора и восстановления выбирайте белковые комплексы, для выносливости — формулы поддержки энергии и электролитов. Начните с базового продукта и отслеживайте самочувствие 2-3 недели.'
      ),
    },
    {
      id: 'sp-faq-2',
      question: getBlockText(
        'faq.q2',
        'Можно ли сочетать несколько продуктов Sprint Power одновременно?'
      ),
      answer: getBlockText(
        'faq.a2',
        'Да, но лучше вводить их поэтапно. Начните с одного продукта, затем добавляйте следующий с интервалом 5-7 дней, чтобы оценить переносимость и эффект.'
      ),
    },
    {
      id: 'sp-faq-3',
      question: getBlockText(
        'faq.q3',
        'Когда принимать продукты: до или после тренировки?'
      ),
      answer: getBlockText(
        'faq.a3',
        'Зависит от формулы: продукты для энергии обычно принимают до тренировки, для восстановления — после. Ориентируйтесь на рекомендации на странице товара.'
      ),
    },
    {
      id: 'sp-faq-4',
      question: getBlockText(
        'faq.q4',
        'Есть ли доставка по России и как быстро приходит заказ?'
      ),
      answer: getBlockText(
        'faq.a4',
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
            ? getBlockText(
                'faq.subtitle',
                'Ответы на частые вопросы о линейке Sprint Power, приеме продуктов, доставке и заказах.'
              )
            : 'Ответы на популярные вопросы о товарах, доставке и оформлении заказа.'}
        </ResponsiveText>
        <FaqAccordion items={faqItems} isSprintTheme={isSprintTheme} />
        <HowToOrderSteps
          embedded
          isSprintTheme={isSprintTheme}
          title={homeBlocks.find((b) => b.key === 'howToOrder.title')?.text ?? undefined}
          steps={[
            {
              title: homeBlocks.find((b) => b.key === 'howToOrder.step1.title')?.text ?? 'Выберите товары',
              text:
                homeBlocks.find((b) => b.key === 'howToOrder.step1.text')?.text ??
                'Добавьте позиции в корзину из каталога или оформите «в 1 клик» на карточке товара.',
              href: homeBlocks.find((b) => b.key === 'howToOrder.step1.href')?.text ?? '/catalog',
              linkLabel: homeBlocks.find((b) => b.key === 'howToOrder.step1.linkLabel')?.text ?? 'В каталог',
            },
            {
              title: homeBlocks.find((b) => b.key === 'howToOrder.step2.title')?.text ?? 'Оформите заказ',
              text:
                homeBlocks.find((b) => b.key === 'howToOrder.step2.text')?.text ??
                'Укажите контакты, способ доставки СДЭК (ПВЗ или курьер) и оплату через ЮKassa.',
              href: homeBlocks.find((b) => b.key === 'howToOrder.step2.href')?.text ?? '/faq',
              linkLabel:
                homeBlocks.find((b) => b.key === 'howToOrder.step2.linkLabel')?.text ?? 'Вопросы о доставке',
            },
            {
              title: homeBlocks.find((b) => b.key === 'howToOrder.step3.title')?.text ?? 'Получите и пользуйтесь',
              text:
                homeBlocks.find((b) => b.key === 'howToOrder.step3.text')?.text ??
                'Отслеживайте отправление, при необходимости свяжитесь с нами через раздел контактов.',
              href: homeBlocks.find((b) => b.key === 'howToOrder.step3.href')?.text ?? '/contacts',
              linkLabel: homeBlocks.find((b) => b.key === 'howToOrder.step3.linkLabel')?.text ?? 'Контакты',
            },
          ]}
        />
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
