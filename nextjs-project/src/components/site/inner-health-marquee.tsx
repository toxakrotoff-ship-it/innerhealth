import { Star } from 'iconoir-react'

const MARQUEE_ITEMS = [
  'РОССИЙСКОЕ ПРОИЗВОДСТВО',
  'ПОНЯТНЫЕ СОСТАВЫ',
  'ДОКУМЕНТЫ НА ПРОДУКЦИЮ',
  'ДОСТАВКА ПО РОССИИ',
]

/**
 * Одна полоса: одинаковая для двух копий в ряд (для translate3d(-50%) без скачка).
 */
function MarqueeStrip() {
  return (
    <div className="flex shrink-0 items-center gap-6 pr-6 text-[clamp(0.625rem,1.15vw+0.5rem,0.875rem)] font-medium uppercase tracking-[0.12em] text-slate-500 sm:gap-12 sm:pr-12 sm:tracking-widest">
      {MARQUEE_ITEMS.map((text, i) => (
        <span key={`${i}-${text}`} className="flex shrink-0 items-center gap-6 sm:gap-12">
          <span className="whitespace-nowrap">{text}</span>
          <Star className="h-3.5 w-3.5 shrink-0 text-action-blue sm:h-4 sm:w-4" aria-hidden />
        </span>
      ))}
    </div>
  )
}

export function InnerHealthMarquee() {
  return (
    <section
      className="flex min-h-[2.75rem] items-center overflow-hidden border-y border-slate-100 bg-white py-3.5 sm:min-h-[3.25rem] sm:py-6"
      aria-label="Преимущества Inner Health"
    >
      <div className="flex w-max min-h-[2.75rem] items-center whitespace-nowrap motion-reduce:max-w-full motion-reduce:w-full motion-reduce:whitespace-normal motion-reduce:justify-center">
        <span className="flex w-max animate-marquee-inner motion-reduce:justify-center">
          <MarqueeStrip />
          <MarqueeStrip aria-hidden />
        </span>
      </div>
    </section>
  )
}
