import Image from 'next/image'
import Link from 'next/link'
import { NavArrowRight } from 'iconoir-react'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { Heading2 } from '@/components/ui/responsive-text'
import { TiltCard } from '@/components/ui/tilt-card'
import type { InnerHomeDirectionItem } from '@/lib/home-page-content'

interface InnerHomeDirectionsSectionProps {
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
  items: InnerHomeDirectionItem[]
  isSprintTheme?: boolean
}

export function InnerHomeDirectionsSection({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  items,
  isSprintTheme = false,
}: InnerHomeDirectionsSectionProps) {
  if (items.length === 0) return null

  return (
    <section className={`py-16 sm:py-24 lg:py-20 xl:py-22 2xl:py-24 3xl:py-28 4xl:py-32 ${isSprintTheme ? 'bg-[#060A14]' : 'bg-white'}`}>
      <AdaptiveContainer maxWidth="default">
        <ScrollReveal as="div" variant="fade-up" className="flex justify-between items-end mb-10 sm:mb-12">
          <div className="space-y-1">
            <Heading2 className={`font-semibold tracking-tighter ${isSprintTheme ? 'text-slate-100' : 'text-slate-900'}`}>{title}</Heading2>
            <p className={`max-w-2xl text-sm font-light 2xl:text-base 3xl:text-lg ${isSprintTheme ? 'text-slate-400' : 'text-slate-500'}`}>
              {subtitle}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal as="div" variant="fade-up">
          <FluidGrid
            cols={1}
            colsTablet={2}
            colsDesktop={3}
            colsXl={3}
            cols2xl={3}
            cols3xl={3}
            cols4xl={3}
            gap={4}
            adaptiveGap
          >
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`block transition-shadow hover:shadow-md rounded-3xl ${isSprintTheme ? 'hover:border-[#7AA2FF]' : 'hover:border-action-blue'}`}
              >
                <TiltCard variant={isSprintTheme ? 'dark' : 'default'}>
                  <article className={`desktop-card-scale relative flex min-h-[21rem] flex-col justify-end overflow-hidden rounded-3xl border p-6 text-white sm:min-h-[24rem] 2xl:min-h-[26rem] ${isSprintTheme ? 'border-slate-700/80 bg-slate-900' : 'border-slate-200/80 bg-slate-950'}`}>
                    {item.imageSrc ? (
                      <>
                        <Image
                          src={item.imageSrc}
                          alt={item.imageAlt}
                          fill
                          className="object-cover object-center"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                        <div
                          className="absolute inset-0 bg-linear-to-b from-slate-950/10 via-slate-950/30 to-slate-950/90"
                          aria-hidden
                        />
                      </>
                    ) : (
                      <div
                        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#1e293b_0%,#020617_100%)]"
                        aria-hidden
                      />
                    )}

                    <div className="relative z-10 space-y-3">
                      <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        {item.title}
                      </h3>
                      {item.description ? (
                        <p className="max-w-sm text-sm text-white/80 2xl:text-base">
                          {item.description}
                        </p>
                      ) : null}
                      <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-white/90 uppercase 2xl:text-sm">
                        Перейти
                        <NavArrowRight className="h-4 w-4" aria-hidden />
                      </span>
                    </div>
                  </article>
                </TiltCard>
              </Link>
            ))}
          </FluidGrid>
        </ScrollReveal>

        <div className="mt-8 text-center">
          <Link
            href={ctaHref}
            className={`desktop-button-scale inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-semibold transition-colors 2xl:text-base 3xl:px-10 3xl:py-5 ${isSprintTheme ? 'bg-[#7AA2FF] text-slate-950 hover:bg-[#9AB8FF]' : 'bg-slate-900 text-white hover:bg-action-blue'}`}
          >
            {ctaLabel}
            <NavArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </AdaptiveContainer>
    </section>
  )
}
