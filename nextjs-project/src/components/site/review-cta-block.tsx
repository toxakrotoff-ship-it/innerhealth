import Link from 'next/link'
import { Mail, Phone } from 'lucide-react'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'

/**
 * Блок призыва оставить отзыв в стиле тёмной карточки (как «Присоединяйтесь к сообществу»).
 */
export function ReviewCtaBlock() {
  return (
    <AdaptiveContainer maxWidth="default">
      <div className="bg-[#151C2C] rounded-[40px] p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1/3 h-full bg-action-blue/10 blur-[100px] rounded-full pointer-events-none" aria-hidden />
        <div className="max-w-lg space-y-6 relative z-10">
          <h2 className="text-3xl md:text-4xl text-white font-semibold tracking-tighter leading-tight">
            Нам важно ваше мнение
          </h2>
          <p className="text-slate-400 font-light leading-relaxed">
            Оставьте отзыв — он появится на сайте после модерации. Ваш опыт помогает другим выбирать лучшее.
          </p>
          <Link
            href="/otzyvy#review-form"
            className="inline-flex items-center justify-center rounded-full bg-white text-slate-900 px-8 py-3 text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            ОСТАВИТЬ ОТЗЫВ
          </Link>
        </div>
        <div className="flex gap-4 relative z-10">
          <a
            href="mailto:innerhealth@mail.ru"
            className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all"
            aria-label="Написать на почту"
          >
            <Mail className="w-6 h-6" aria-hidden />
          </a>
          <a
            href="tel:+79891039192"
            className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-all"
            aria-label="Позвонить"
          >
            <Phone className="w-6 h-6" aria-hidden />
          </a>
        </div>
      </div>
    </AdaptiveContainer>
  )
}
