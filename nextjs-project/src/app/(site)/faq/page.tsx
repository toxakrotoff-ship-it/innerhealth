import * as faqService from '@/services/faq.service'
import { FaqAccordion } from '@/components/site/faq-accordion'

export const revalidate = 300

export default async function FaqPage() {
  const faqItems = await faqService.getPublishedFaqItems()

  return (
    <div className="max-w-[min(70rem,92vw)] mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">
        Часто задаваемые вопросы
      </h1>
      <p className="text-gray-600 mb-8">
        Ответы на популярные вопросы о товарах, доставке и оформлении заказа.
      </p>
      <FaqAccordion items={faqItems} />
    </div>
  )
}
