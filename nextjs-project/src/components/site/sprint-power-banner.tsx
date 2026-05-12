import Link from 'next/link'
import { Star } from 'iconoir-react'

const BANNER_URL = 'https://sprintpower.ru'

const MARQUEE_ITEMS = [
  'Sprint Power — линейка спортивного питания',
  'Высококачественное сырье',
  'Инновационные формулы',
  'Биодоступная форма',
]

/**
 * Одна полоса: одинаковая для двух копий в ряд (для translate3d(-50%) без скачка).
 * На узких экранах меньше `gap`/`pr`, на sm+ — как у двойной полосы (-50% без скачка).
 */
function MarqueeStrip() {
  return (
    <div className="flex shrink-0 items-center gap-6 pr-6 text-[clamp(0.625rem,1.15vw+0.5rem,0.875rem)] font-medium uppercase tracking-[0.12em] text-white/40 transition-colors duration-300 sm:gap-12 sm:pr-12 sm:tracking-widest">
      {MARQUEE_ITEMS.map((text, i) => (
        <span key={`${i}-${text}`} className="flex shrink-0 items-center gap-6 sm:gap-12">
          <span className="whitespace-nowrap">{text}</span>
          <Star className="h-3.5 w-3.5 shrink-0 text-action-blue sm:h-4 sm:w-4" aria-hidden />
        </span>
      ))}
    </div>
  )
}

export function SprintPowerBanner() {
  return (
    <section
      className="flex min-h-[2.75rem] items-center overflow-hidden border-y border-white/5 bg-slate-900 py-3.5 sm:min-h-[3.25rem] sm:py-6"
      aria-label="Баннер Sprint Power"
    >
      <Link
        href={BANNER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-max min-h-[2.75rem] items-center whitespace-nowrap hover:[&_span]:text-white/60 motion-reduce:max-w-full motion-reduce:w-full motion-reduce:whitespace-normal motion-reduce:justify-center"
      >
        {/* Анимация только на треке: без transition на том же слое, что и transform */}
        <span className="flex w-max animate-marquee-sprint motion-reduce:justify-center">
          <MarqueeStrip />
          <MarqueeStrip aria-hidden />
        </span>
      </Link>
    </section>
  )
}
