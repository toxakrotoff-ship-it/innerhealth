import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle, NavArrowRight } from 'iconoir-react'

import sprintPowerMockup from '@/assets/sprint-power-mockup.png'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'

export function SprintPowerBlock() {
  return (
    <section
      className="border-t border-slate-100 bg-linear-to-b from-slate-50/90 via-white to-white py-14 sm:py-20 md:py-24 2xl:py-28 3xl:py-32"
      aria-labelledby="sprint-power-heading"
    >
      <AdaptiveContainer maxWidth="default">
        <FluidGrid
          cols={1}
          colsTablet={2}
          colsDesktop={2}
          colsXl={2}
          cols2xl={2}
          cols3xl={2}
          cols4xl={2}
          cols5xl={2}
          cols6xl={2}
          align="center"
          gap={12}
          adaptiveGap
          className="md:gap-16 2xl:gap-20 3xl:gap-24"
        >
          {/* Слева: изображение + плавающая карточка как в референсе */}
          <div className="relative min-w-0">
            <div className="relative aspect-square overflow-hidden rounded-[clamp(1.25rem,4vw+0.5rem,2.5rem)] bg-slate-100 2xl:rounded-[clamp(2.5rem,1.5vw+2rem,3rem)]">
              {/* Inset keeps the mockup visibly smaller than the slate “frame” (was fill + object-cover edge-to-edge). */}
              <div className="absolute inset-[6%] sm:inset-[8%] md:inset-[9%]">
                <div className="relative h-full w-full">
                  <Image
                    src={sprintPowerMockup}
                    alt=""
                    fill
                    className="object-contain object-center"
                    sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 40vw"
                  />
                </div>
              </div>
            </div>
            <div className="absolute bottom-3 left-3 right-3 z-10 mx-auto max-w-[min(15.5rem,calc(100%-1.5rem))] rounded-2xl border border-slate-100 bg-white p-4 shadow-xl sm:bottom-4 sm:left-auto sm:right-4 sm:mx-0 sm:max-w-[240px] sm:rounded-3xl sm:p-6 md:-bottom-6 md:-right-6 2xl:max-w-[320px] 2xl:p-8">
              <h3 className="mb-1.5 text-xs font-semibold tracking-tight text-slate-900 uppercase sm:mb-2 sm:text-sm 2xl:text-base 3xl:text-lg">
                Sprint Power
              </h3>
              <p className="text-[clamp(0.6875rem,0.35vw+0.62rem,0.75rem)] font-light leading-relaxed text-slate-500 sm:text-xs 2xl:text-base">
                Спортивное питание нового поколения. Брутальный дизайн и научный подход.
              </p>
            </div>
          </div>

          {/* Справа: заголовок, текст, список, ссылка */}
          <div className="min-w-0 space-y-6 sm:space-y-8 2xl:space-y-10">
            <h2
              id="sprint-power-heading"
              className="text-balance text-[clamp(1.5rem,3.6vw+0.85rem,2.25rem)] font-semibold tracking-tighter text-slate-900 sm:text-4xl 2xl:text-5xl 3xl:text-6xl"
            >
              Больше чем спорт. <br />
              Чистая энергия.
            </h2>
            <p className="max-w-prose font-light leading-relaxed text-slate-600 text-[clamp(0.9375rem,0.5vw+0.82rem,1.125rem)] 2xl:text-xl">
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
              href="/catalog"
              className="desktop-button-scale inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-action-blue sm:w-auto"
            >
              В каталог Sprint Power
              <NavArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          </div>
        </FluidGrid>
      </AdaptiveContainer>
    </section>
  )
}
