import Link from 'next/link'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { Heading2 } from '@/components/ui/responsive-text'

const DEFAULT_STEPS = [
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

interface HowToOrderStep {
  title: string
  text: string
  href: string
  linkLabel: string
}

interface HowToOrderStepsProps {
  /** When embedded inside another container (e.g. FAQ), skip outer AdaptiveContainer + title. */
  embedded?: boolean
  /** When false, hide outer section borders (useful when adjacent sections have mismatched spacing). */
  showBorders?: boolean
  isSprintTheme?: boolean
  title?: string
  steps?: HowToOrderStep[]
}

export function HowToOrderSteps({
  embedded = false,
  showBorders = true,
  isSprintTheme = false,
  title,
  steps,
}: HowToOrderStepsProps) {
  const resolvedTitle = title ?? 'Как заказать'
  const resolvedSteps = steps ?? [...DEFAULT_STEPS]

  const inner = (
    <>
      {!embedded && (
        <Heading2 className={`mb-6 text-center sm:text-left ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
          {resolvedTitle}
        </Heading2>
      )}
      {embedded && (
        <p className={`font-semibold mb-4 ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
          {resolvedTitle} — три шага
        </p>
      )}
      <ol className="grid gap-6 sm:grid-cols-3">
        {resolvedSteps.map((step, i) => (
          <li
            key={`${i}-${step.title}`}
            className={`rounded-2xl border p-5 shadow-sm flex flex-col ${
              isSprintTheme ? 'border-slate-700 bg-[#0F172A]' : 'border-gray-200 bg-white'
            }`}
          >
            <span className="text-xs font-semibold text-action-blue mb-2">Шаг {i + 1}</span>
            <h3 className={`text-lg font-semibold mb-2 ${isSprintTheme ? 'text-slate-100' : 'text-text'}`}>
              {step.title}
            </h3>
            <p className={`text-sm flex-1 mb-3 ${isSprintTheme ? 'text-slate-300' : 'text-gray-600'}`}>
              {step.text}
            </p>
            <Link
              href={step.href}
              className={`text-sm font-medium underline-offset-2 hover:underline inline-block ${
                isSprintTheme ? 'text-[#7AA2FF]' : 'text-action-blue'
              }`}
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
        isSprintTheme ? 'bg-[#060A14]' : 'bg-gray-50',
        showBorders ? (isSprintTheme ? 'border-y border-slate-800' : 'border-y border-gray-100') : '',
      ].join(' ')}
    >
      <AdaptiveContainer maxWidth="default">{inner}</AdaptiveContainer>
    </section>
  )
}
