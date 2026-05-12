import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle, NavArrowRight } from 'iconoir-react'

import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'

export interface InnerHealthCrossBrandBlockProps {
  /** Main heading in the text column (e.g. «Inner Health»). */
  title: string
  /** Long body copy from CMS / defaults. */
  body: string
  /** CTA label (e.g. «Перейти на сайт»). */
  ctaLabel: string
  /** Absolute URL of the Inner Health storefront. */
  innerSiteUrl: string
}

const BULLET_1 = 'Пептиды, нутриенты и грибные комплексы с прозрачным составом'
const BULLET_2 = 'Превентивный подход: дозировки и схемы приёма на основе исследований'

/**
 * Sprint home: cross-link to Inner Health — same grid layout as {@link SprintPowerBlock} on Inner,
 * оформление в фирменных тёмных тонах Sprint (как блоки новостей / линейки на главной).
 */
export function InnerHealthCrossBrandBlock({
  title,
  body,
  ctaLabel,
  innerSiteUrl,
}: InnerHealthCrossBrandBlockProps) {
  return (
    <section
      className="border-t border-[#1B2946] bg-[#060A14] py-20 sm:py-24 2xl:py-28 3xl:py-32"
      aria-labelledby="inner-health-cross-brand-heading"
    >
      <AdaptiveContainer maxWidth="default">
        <p className="mb-10 text-xs font-bold uppercase tracking-[0.2em] text-[#7AA2FF] sm:text-sm sm:tracking-[0.24em]">
          INNER HEALTH
        </p>
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
          <div className="relative">
            <a
              href={innerSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
              aria-label="Перейти на сайт Inner Health"
            >
              <div className="relative aspect-square overflow-hidden rounded-[40px] border border-[#1B2946] bg-[#0F172A] 2xl:rounded-[48px]">
                <div className="absolute inset-[7%] sm:inset-[8%] md:inset-[9%]">
                  <div className="relative h-full w-full">
                    <Image
                      src="/images/sprint-power/cross-brand-inner-health.png"
                      alt=""
                      fill
                      className="object-contain object-center transition-transform duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                </div>
              </div>
            </a>
            <div className="pointer-events-none absolute bottom-4 right-4 z-10 max-w-[240px] rounded-3xl border border-[#1B2946] bg-[#0F172A] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] md:-bottom-6 md:-right-6 2xl:max-w-[320px] 2xl:p-8">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-tight text-slate-100 2xl:text-base 3xl:text-lg">
                Inner Health
              </h3>
              <p className="text-xs font-light leading-relaxed text-slate-400 2xl:text-base">
                Активное долголетие, превентивная медицина, нутрицевтика.
              </p>
            </div>
          </div>

          <div className="space-y-8 2xl:space-y-10">
            <h2
              id="inner-health-cross-brand-heading"
              className="text-3xl font-semibold tracking-tighter text-white sm:text-4xl 2xl:text-5xl 3xl:text-6xl"
            >
              {title}
            </h2>
            <p className="font-light leading-relaxed text-slate-300 2xl:text-xl">{body}</p>
            <ul className="space-y-4 2xl:space-y-5" role="list">
              <li className="flex items-center gap-3 text-sm font-medium text-slate-200 2xl:text-base">
                <CheckCircle className="h-5 w-5 shrink-0 text-[#7AA2FF]" aria-hidden />
                {BULLET_1}
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-slate-200 2xl:text-base">
                <CheckCircle className="h-5 w-5 shrink-0 text-[#7AA2FF]" aria-hidden />
                {BULLET_2}
              </li>
            </ul>
            <div className="flex justify-center md:justify-start">
              <Link
                href={innerSiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="desktop-button-scale inline-flex items-center gap-2 rounded-full bg-[#7AA2FF] px-8 py-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-[#9AB8FF]"
              >
                {ctaLabel}
                <NavArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </div>
          </div>
        </FluidGrid>
      </AdaptiveContainer>
    </section>
  )
}
