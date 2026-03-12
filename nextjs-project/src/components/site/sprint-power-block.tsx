import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, CheckCircle } from 'lucide-react'

import sprintPowerMockup from '@/assets/sprint-power-mockup.png'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'

const SPRINT_POWER_URL = 'https://sprintpower.ru'

export function SprintPowerBlock() {
  return (
    <section
      className="py-24 border-t border-slate-100"
      aria-labelledby="sprint-power-heading"
    >
      <AdaptiveContainer maxWidth="default">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Слева: изображение + плавающая карточка как в референсе */}
          <div className="relative">
            <div className="relative aspect-square bg-slate-100 rounded-[40px] overflow-hidden">
              <Image
                src={sprintPowerMockup}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-3xl shadow-xl border border-slate-100 max-w-[240px] z-10">
              <h3 className="text-sm font-semibold mb-2 tracking-tight uppercase text-slate-900">
                Sprint Power
              </h3>
              <p className="text-xs text-slate-500 font-light leading-relaxed">
                Спортивное питание нового поколения. Брутальный дизайн и научный подход.
              </p>
            </div>
          </div>

          {/* Справа: заголовок, текст, список, ссылка */}
          <div className="space-y-8">
            <h2
              id="sprint-power-heading"
              className="text-3xl sm:text-4xl font-semibold tracking-tighter text-slate-900"
            >
              Больше чем спорт. <br />
              Чистая энергия.
            </h2>
            <p className="text-slate-600 font-light leading-relaxed">
              Sprint Power — это инновационные формулы, правильные пропорции и высококачественное сырье в биодоступной форме. Добавки, которые сделают ваши тренировки эффективнее, а победы — ярче.
            </p>
            <ul className="space-y-4" role="list">
              <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <CheckCircle className="w-5 h-5 shrink-0 text-action-blue" aria-hidden />
                Европейские стандарты качества
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <CheckCircle className="w-5 h-5 shrink-0 text-action-blue" aria-hidden />
                Без искусственных красителей
              </li>
            </ul>
            <Link
              href={SPRINT_POWER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-full text-sm font-semibold hover:bg-action-blue transition-colors"
            >
              ПЕРЕЙТИ НА SPRINTPOWER.RU
              <ArrowUpRight className="w-4 h-4 shrink-0" aria-hidden />
            </Link>
          </div>
        </div>
      </AdaptiveContainer>
    </section>
  )
}
