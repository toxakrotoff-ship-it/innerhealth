import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, CheckCircle } from 'iconoir-react'

import sprintPowerMockup from '@/assets/sprint-power-mockup.png'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'

const SPRINT_POWER_URL = 'https://sprintpower.ru'

export function SprintPowerBlock() {
  return (
    <section
      className="border-t border-slate-100 py-20 sm:py-24 2xl:py-28 3xl:py-32"
      aria-labelledby="sprint-power-heading"
    >
      <AdaptiveContainer maxWidth="default">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-16 2xl:gap-20 3xl:gap-24">
          {/* Слева: изображение + плавающая карточка как в референсе */}
          <div className="relative">
            <div className="relative aspect-square overflow-hidden rounded-[40px] bg-slate-100 2xl:rounded-[48px]">
              {/* Inset keeps the mockup visibly smaller than the slate “frame” (was fill + object-cover edge-to-edge). */}
              <div className="absolute inset-[7%] sm:inset-[8%] md:inset-[9%]">
                <div className="relative h-full w-full">
                  <Image
                    src={sprintPowerMockup}
                    alt=""
                    fill
                    className="object-contain object-center"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
            <div className="absolute bottom-4 right-4 z-10 max-w-[240px] rounded-3xl border border-slate-100 bg-white p-6 shadow-xl md:-bottom-6 md:-right-6 2xl:max-w-[320px] 2xl:p-8">
              <h3 className="mb-2 text-sm font-semibold tracking-tight text-slate-900 uppercase 2xl:text-base 3xl:text-lg">
                Sprint Power
              </h3>
              <p className="text-xs font-light leading-relaxed text-slate-500 2xl:text-base">
                Спортивное питание нового поколения. Брутальный дизайн и научный подход.
              </p>
            </div>
          </div>

          {/* Справа: заголовок, текст, список, ссылка */}
          <div className="space-y-8 2xl:space-y-10">
            <h2
              id="sprint-power-heading"
              className="text-3xl font-semibold tracking-tighter text-slate-900 sm:text-4xl 2xl:text-5xl 3xl:text-6xl"
            >
              Больше чем спорт. <br />
              Чистая энергия.
            </h2>
            <p className="font-light leading-relaxed text-slate-600 2xl:text-xl">
              Sprint Power — это инновационные формулы, правильные пропорции и высококачественное сырье в биодоступной форме. Добавки, которые сделают ваши тренировки эффективнее, а победы — ярче.
            </p>
            <ul className="space-y-4 2xl:space-y-5" role="list">
              <li className="flex items-center gap-3 text-sm font-medium text-slate-700 2xl:text-base">
                <CheckCircle className="w-5 h-5 shrink-0 text-action-blue" aria-hidden />
                Европейские стандарты качества
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-slate-700 2xl:text-base">
                <CheckCircle className="w-5 h-5 shrink-0 text-action-blue" aria-hidden />
                Без искусственных красителей
              </li>
            </ul>
            <Link
              href={SPRINT_POWER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="desktop-button-scale inline-flex items-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-action-blue"
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
