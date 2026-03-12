import Link from 'next/link'
import Image from 'next/image'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'

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

export function PartnersBlock() {
  return (
    <section
      className="py-16 sm:py-24 bg-white border-t border-slate-100"
      aria-labelledby="partners-heading"
    >
      <AdaptiveContainer maxWidth="default">
        <h2
          id="partners-heading"
          className="text-3xl font-semibold tracking-tighter text-slate-900 mb-12 text-center"
        >
          Наши Партнёры
        </h2>
        <div className="grid gap-8 sm:gap-12 sm:grid-cols-2 lg:grid-cols-2 xl:gap-14 2xl:gap-16 3xl:gap-18 4xl:gap-20">
          {PARTNERS.map((partner) => (
            <Link
              key={partner.url}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col sm:flex-row gap-4 p-6 rounded-2xl border border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="relative shrink-0 w-full sm:w-40 lg:w-48 2xl:w-56 3xl:w-64 h-32 lg:h-36 2xl:h-40 3xl:h-44 bg-white rounded-xl border border-gray-200 overflow-hidden">
                <Image
                  src={partner.imageUrl}
                  alt={partner.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, 10rem"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-text mb-2 group-hover:text-primary transition-colors">
                  {partner.name}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {partner.description}
                </p>
                <span className="inline-block mt-2 text-sm text-primary font-medium">
                  Перейти на сайт →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </AdaptiveContainer>
    </section>
  )
}
