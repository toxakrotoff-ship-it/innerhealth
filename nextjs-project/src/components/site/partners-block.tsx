import Link from 'next/link'
import Image from 'next/image'

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
      className="py-16 lg:py-20 bg-white border-t border-gray-200"
      aria-labelledby="partners-heading"
    >
      <div className="max-w-[min(90rem,92vw)] mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          id="partners-heading"
          className="text-2xl sm:text-3xl font-bold text-text mb-10 text-center"
        >
          Наши Партнёры
        </h2>
        <div className="grid gap-8 sm:gap-12 sm:grid-cols-2">
          {PARTNERS.map((partner) => (
            <Link
              key={partner.url}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col sm:flex-row gap-4 p-6 rounded-2xl border border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div className="relative shrink-0 w-full sm:w-40 h-32 bg-white rounded-xl border border-gray-200 overflow-hidden">
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
      </div>
    </section>
  )
}
