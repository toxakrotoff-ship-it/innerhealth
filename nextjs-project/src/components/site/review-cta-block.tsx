import Link from 'next/link'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'

/**
 * Блок призыва оставить отзыв в стиле тёмной карточки (как «Присоединяйтесь к сообществу»).
 */
interface ReviewCtaBlockProps {
  title?: string
  text?: string
  ctaLabel?: string
  isSprintTheme?: boolean
}

export function ReviewCtaBlock({
  title = 'Поделитесь опытом',
  text = 'Расскажите, какой продукт вы выбрали и что оказалось для вас важным. После модерации отзыв появится на сайте.',
  ctaLabel = 'ОСТАВИТЬ ОТЗЫВ',
  isSprintTheme = false,
}: ReviewCtaBlockProps) {
  return (
    <AdaptiveContainer maxWidth="default">
      <div className={`relative flex flex-col items-center justify-center gap-6 overflow-hidden rounded-[40px] p-8 md:p-12 ${isSprintTheme ? 'border border-slate-700 bg-[#0F172A]' : 'bg-[#151C2C]'}`}>
        <div className="absolute top-0 left-0 w-1/3 h-full bg-action-blue/10 blur-[100px] rounded-full pointer-events-none" aria-hidden />
        <div className="max-w-lg space-y-6 relative z-10 text-center">
          <h2 className="text-[28px] text-white font-semibold tracking-tighter leading-tight md:text-[34px]">
            {title}
          </h2>
          <p className="text-sm font-light leading-relaxed text-slate-400">
            {text}
          </p>
          <Link
            href="/otzyvy#review-form"
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-100"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </AdaptiveContainer>
  )
}
