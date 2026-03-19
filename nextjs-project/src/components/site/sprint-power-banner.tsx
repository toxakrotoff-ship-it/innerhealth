import Link from 'next/link'
import { Star } from 'lucide-react'

const BANNER_URL = 'https://sprintpower.ru'

const MARQUEE_ITEMS = [
  'Sprint Power — линейка спортивного питания',
  'Высококачественное сырье',
  'Инновационные формулы',
  'Биодоступная форма',
]

function MarqueeContent() {
  return (
    <>
      <div className="flex items-center gap-12 text-sm font-medium tracking-widest text-white/40 uppercase shrink-0">
        {MARQUEE_ITEMS.map((text, i) => (
          <span key={`${i}-${text}`} className="flex items-center gap-12">
            <span>{text}</span>
            <Star className="w-4 h-4 text-action-blue shrink-0" aria-hidden />
          </span>
        ))}
      </div>
      <div className="flex items-center gap-12 text-sm font-medium tracking-widest text-white/40 uppercase shrink-0 ml-12">
        {MARQUEE_ITEMS.map((text, i) => (
          <span key={`dup-${i}-${text}`} className="flex items-center gap-12">
            <span>{text}</span>
            <Star className="w-4 h-4 text-action-blue shrink-0" aria-hidden />
          </span>
        ))}
      </div>
    </>
  )
}

export function SprintPowerBanner() {
  return (
    <section
      className="bg-slate-900 py-6 border-y border-white/5 overflow-hidden min-h-[3.25rem] flex items-center"
      aria-label="Баннер Sprint Power"
    >
      <Link
        href={BANNER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-max min-h-[2.75rem] items-center animate-marquee-sprint gap-8 whitespace-nowrap hover:[&_span]:text-white/60 transition-colors"
      >
        <MarqueeContent />
        <MarqueeContent />
      </Link>
    </section>
  )
}
