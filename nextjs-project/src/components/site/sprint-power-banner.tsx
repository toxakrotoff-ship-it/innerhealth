import Link from 'next/link'

const BANNER_URL = 'https://sprintpower.ru'
const BANNER_TEXT = 'Переходи на sprintpower.ru — наша линейка спортивного питания нового поколения'

export function SprintPowerBanner() {
  return (
    <section className="bg-text text-white py-3 overflow-hidden" aria-label="Баннер Sprint Power">
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap">
        {[1, 2, 3].map((i) => (
          <Link
            key={i}
            href={BANNER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-8 text-sm sm:text-base font-medium hover:underline shrink-0"
          >
            <span>{BANNER_TEXT}</span>
            <span className="text-action-blue">sprintpower.ru</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
