import Link from 'next/link'
import Image from 'next/image'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

const PARTNERS = [
  {
    name: 'Московская федерация волейбола',
    description:
      'С 2006 года Московская федерация волейбола занимается популяризацией волейбола, проводит турниры среди граждан всех возрастов и пропагандирует здоровый образ жизни.',
    url: 'https://moscowvolley.ru/',
    imageUrl: '/images/partners/moscow-volley.png',
  },
  {
    name: 'Федерация тхэквондо Московской области',
    description:
      'Федерация тхэквондо Московской области является членом Союза тхэквондо России. В федерацию привлечен высококвалифицированный тренерско-преподавательский состав, что позволит спортсменам не только добиться спортивных высот, но и стать физически крепкими, здоровыми и гармонично развитыми гражданами.',
    url: 'https://tkd-wtfmo.ru/',
    imageUrl: '/images/partners/logo.svg',
  },
] as const

type PartnersBlockProps = {
  brand: 'inner' | 'sprint-power'
}

export function PartnersBlock({ brand }: PartnersBlockProps) {
  const isSprint = brand === 'sprint-power'

  return (
    <section
      className={
        isSprint
          ? 'border-t border-white/10 bg-slate-950 py-16 sm:py-24'
          : 'border-t border-slate-100 bg-white py-16 sm:py-24'
      }
      aria-labelledby="partners-heading"
    >
      <AdaptiveContainer maxWidth="default">
        <ScrollReveal
          as="h2"
          variant="fade-up"
          id="partners-heading"
          className={
            isSprint
              ? 'mb-12 text-center text-3xl font-semibold uppercase tracking-[0.18em] text-white sm:text-4xl'
              : 'mb-12 text-center text-3xl font-semibold tracking-tighter text-slate-900'
          }
        >
          Наши Партнёры
        </ScrollReveal>
        <ScrollReveal
          as="div"
          variant="fade-up"
          className="grid gap-8 sm:grid-cols-2 sm:gap-12 lg:grid-cols-2 xl:gap-14 2xl:gap-16 3xl:gap-18 4xl:gap-20"
        >
          {PARTNERS.map((partner) => (
            <Link
              key={partner.url}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className={
                isSprint
                  ? 'group flex min-h-[360px] flex-col gap-4 rounded-[2rem] border border-white/12 bg-white/[0.04] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-action-blue/60 hover:bg-white/[0.07] sm:min-h-[420px] sm:flex-row 2xl:min-h-[460px]'
                  : 'group flex min-h-[360px] flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-6 transition-colors hover:border-gray-300 hover:bg-gray-50 sm:min-h-[420px] sm:flex-row 2xl:min-h-[460px]'
              }
            >
              <div
                className={
                  isSprint
                    ? 'relative h-32 w-full shrink-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-white sm:w-40 lg:h-36 lg:w-48 2xl:h-40 2xl:w-56 3xl:h-44 3xl:w-64'
                    : 'relative h-32 w-full shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white sm:w-40 lg:h-36 lg:w-48 2xl:h-40 2xl:w-56 3xl:h-44 3xl:w-64'
                }
              >
                <Image
                  src={partner.imageUrl}
                  alt={partner.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 10rem"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className={
                    isSprint
                      ? 'mb-3 font-semibold uppercase tracking-[0.08em] text-white transition-colors group-hover:text-action-blue 2xl:text-2xl'
                      : 'mb-2 font-semibold text-text transition-colors group-hover:text-primary 2xl:text-2xl'
                  }
                >
                  {partner.name}
                </h3>
                <p
                  className={
                    isSprint
                      ? 'overflow-hidden text-sm leading-relaxed text-slate-300 2xl:text-base [display:-webkit-box] [-webkit-line-clamp:11] [-webkit-box-orient:vertical]'
                      : 'overflow-hidden text-sm leading-relaxed text-gray-600 2xl:text-base [display:-webkit-box] [-webkit-line-clamp:11] [-webkit-box-orient:vertical]'
                  }
                >
                  {partner.description}
                </p>
                <span
                  className={
                    isSprint
                      ? 'mt-4 inline-flex items-center text-sm font-semibold uppercase tracking-[0.14em] text-action-blue 2xl:text-base'
                      : 'mt-2 inline-block text-sm font-medium text-primary 2xl:text-base'
                  }
                >
                  Перейти на сайт →
                </span>
              </div>
            </Link>
          ))}
        </ScrollReveal>
      </AdaptiveContainer>
    </section>
  )
}
