import Link from 'next/link'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { Heading2 } from '@/components/ui/responsive-text'

const steps = [
  {
    title: 'Выберите товары',
    text: 'Добавьте позиции в корзину из каталога или оформите «в 1 клик» на карточке товара.',
    href: '/catalog',
    linkLabel: 'В каталог',
  },
  {
    title: 'Оформите заказ',
    text: 'Укажите контакты, способ доставки СДЭК (ПВЗ или курьер) и оплату через ЮKassa.',
    href: '/faq',
    linkLabel: 'Вопросы о доставке',
  },
  {
    title: 'Получите и пользуйтесь',
    text: 'Отслеживайте отправление, при необходимости свяжитесь с нами через раздел контактов.',
    href: '/contacts',
    linkLabel: 'Контакты',
  },
] as const

interface HowToOrderStepsProps {
  /** When embedded inside another container (e.g. FAQ), skip outer AdaptiveContainer + title. */
  embedded?: boolean
  /** When false, hide outer section borders (useful when adjacent sections have mismatched spacing). */
  showBorders?: boolean
}

export function HowToOrderSteps({ embedded = false, showBorders = true }: HowToOrderStepsProps) {
  const inner = (
    <>
      {!embedded && (
        <Heading2 className="text-text mb-6 text-center sm:text-left">Как заказать</Heading2>
      )}
      {embedded && <p className="font-semibold text-text mb-4">Как заказать — три шага</p>}
      <ol className="grid gap-6 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col"
          >
            <span className="text-xs font-semibold text-action-blue mb-2">Шаг {i + 1}</span>
            <h3 className="text-lg font-semibold text-text mb-2">{step.title}</h3>
            <p className="text-sm text-gray-600 flex-1 mb-3">{step.text}</p>
            <Link
              href={step.href}
              className="text-sm font-medium text-action-blue underline-offset-2 hover:underline inline-block"
            >
              {step.linkLabel} →
            </Link>
          </li>
        ))}
      </ol>
    </>
  )

  if (embedded) {
    return <div className="mt-8">{inner}</div>
  }

  return (
    <section
      className={[
        'py-12 sm:py-16',
        'bg-gray-50',
        showBorders ? 'border-y border-gray-100' : '',
      ].join(' ')}
    >
      <AdaptiveContainer maxWidth="default">{inner}</AdaptiveContainer>
    </section>
  )
}
