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
  const [faqItems, settings] = await Promise.all([faqService.getPublishedFaqItems(), getSettingsMap()])

  const faqJsonLd = buildFaqPageJsonLd({
    settings,
    items: faqItems.map((item) => ({
      question: item.question,
      answerPlain: stripHtmlToPlainText(item.answer, 5000),
    })),
  })

  return (
    <AdaptiveContainer maxWidth="default" className="py-10">
      <Heading1 className="text-text mb-2">
        Часто задаваемые вопросы
      </Heading1>
      <ResponsiveText as="p" variant="base" color="secondary" className="mb-8">
        Ответы на популярные вопросы о товарах, доставке и оформлении заказа.
      </ResponsiveText>
      <FaqAccordion items={faqItems} />
      <HowToOrderSteps embedded />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
    </AdaptiveContainer>
  )
}
