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
 * `pr-12` замыкает визуальный зазор между последней звездой и началом второй копии (= gap-12).
 */
function MarqueeStrip() {
  return (
    <div className="flex shrink-0 items-center gap-12 pr-12 text-sm font-medium uppercase tracking-widest text-white/40 transition-colors duration-300">
      {MARQUEE_ITEMS.map((text, i) => (
        <span key={`${i}-${text}`} className="flex shrink-0 items-center gap-12">
          <span>{text}</span>
          <Star className="h-4 w-4 shrink-0 text-action-blue" aria-hidden />
        </span>
      ))}
    </div>
  )
}

export function SprintPowerBanner() {
  return (
    <section
      className="flex min-h-[3.25rem] items-center overflow-hidden border-y border-white/5 bg-slate-900 py-6"
      aria-label="Баннер Sprint Power"
    >
      <Link
        href={BANNER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-max min-h-[2.75rem] items-center whitespace-nowrap hover:[&_span]:text-white/60"
      >
        {/* Анимация только на треке: без transition на том же слое, что и transform */}
        <span className="flex w-max animate-marquee-sprint">
          <MarqueeStrip />
          <MarqueeStrip aria-hidden />
        </span>
      </Link>
    </section>
  )
}
