'use client'

import { useEffect, useRef, useState } from 'react'
import { Star } from 'iconoir-react'

const MARQUEE_ITEMS = [
  'РОССИЙСКОЕ ПРОИЗВОДСТВО',
  'ПОНЯТНЫЕ СОСТАВЫ',
  'ДОКУМЕНТЫ НА ПРОДУКЦИЮ',
  'ДОСТАВКА ПО РОССИИ',
]

function MarqueeItems() {
  return MARQUEE_ITEMS.map((text) => (
    <span key={text} className="inner-health-marquee__item flex items-center gap-6 sm:gap-12">
      <span>{text}</span>
      <Star className="h-3.5 w-3.5 shrink-0 text-action-blue sm:h-4 sm:w-4" aria-hidden />
    </span>
  ))
}

export function InnerHealthMarquee() {
  const viewportRef = useRef<HTMLElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  // The server and the first client render both show the same static, wrapping list.
  const [repetitions, setRepetitions] = useState(0)

  useEffect(() => {
    const viewport = viewportRef.current
    const strip = stripRef.current
    if (!viewport || !strip) return

    const updateRepetitions = () => {
      const stripWidth = strip.getBoundingClientRect().width
      if (stripWidth > 0) {
        // Each of the two identical groups must cover the whole viewport.
        setRepetitions(Math.max(1, Math.ceil(viewport.clientWidth / stripWidth)))
      }
    }

    updateRepetitions()
    const observer = new ResizeObserver(updateRepetitions)
    observer.observe(viewport)
    // Also catches font loading, zoom and responsive changes to the text/gaps.
    observer.observe(strip)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={viewportRef}
      data-ready={repetitions > 0}
      className="inner-health-marquee relative flex min-w-0 min-h-[2.75rem] items-center overflow-hidden border-y border-slate-100 bg-white py-3.5 text-[clamp(0.625rem,1.15vw+0.5rem,0.875rem)] font-medium uppercase tracking-[0.12em] text-slate-500 sm:min-h-[3.25rem] sm:py-6 sm:tracking-widest"
      aria-label="Преимущества Inner Health"
    >
      <div className="inner-health-marquee__static flex min-h-[2.75rem] w-full flex-wrap items-center justify-center gap-x-6 gap-y-3 px-6 sm:gap-x-12 sm:px-12">
        <MarqueeItems />
      </div>
      <div
        className="animate-marquee-inner"
        aria-hidden="true"
        style={{ animationDuration: `${30 * Math.max(1, repetitions)}s` }}
      >
        {[0, 1].map((group) => (
          <div key={group} className="flex shrink-0">
            {Array.from({ length: Math.max(1, repetitions) }, (_, index) => (
              <div
                key={index}
                ref={group === 0 && index === 0 ? stripRef : undefined}
                className="inner-health-marquee__strip flex w-max shrink-0 items-center gap-6 pr-6 sm:gap-12 sm:pr-12"
              >
                <MarqueeItems />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
