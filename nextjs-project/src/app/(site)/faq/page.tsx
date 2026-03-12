import * as faqService from '@/services/faq.service'
import { FaqAccordion } from '@/components/site/faq-accordion'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { ResponsiveText, Heading1 } from '@/components/ui/responsive-text'

export const revalidate = 300

export default async function FaqPage() {
  const faqItems = await faqService.getPublishedFaqItems()

  return (
    <AdaptiveContainer maxWidth="default" className="py-10">
      <Heading1 className="text-text mb-2">
        Часто задаваемые вопросы
      </Heading1>
      <ResponsiveText as="p" variant="base" color="secondary" className="mb-8">
        Ответы на популярные вопросы о товарах, доставке и оформлении заказа.
      </ResponsiveText>
      <FaqAccordion items={faqItems} />
    </AdaptiveContainer>
  )
}
