import Link from 'next/link'

const IMAGE_FACE = '/images/o-nas/face-lift.jpg'
const IMAGE_NUTRITION = '/images/o-nas/nutrition.jpg'

const PARTNERS = [
  'Международным институтом PreventAge',
  'Университетом образовательной медицины (UOM)',
  'Международным институтом интегративной нутрициологии (МИИН)',
  'Первым Московским государственным медицинским университетом им. И.М. Сеченова',
] as const

export const metadata = {
  title: 'О нас | Inner Health',
  description:
    'Inner Health – инновационные здоровьесберегающие продукты с нутрикосметическим эффектом. Разработка и производство в России.',
}

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* Хлебные крошки */}
      <div className="max-w-[min(90rem,92vw)] mx-auto px-4 pt-6 pb-2 sm:px-6 lg:px-8">
        <nav className="text-sm text-gray-500" aria-label="Хлебные крошки">
          <Link href="/" className="hover:text-action-blue transition-colors">
            Главная
          </Link>
          <span className="mx-2">/</span>
          <span className="text-text font-medium">О нас</span>
        </nav>
      </div>

      <div className="max-w-[min(90rem,92vw)] mx-auto px-4 py-8 sm:px-6 lg:px-8 pb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-text mb-10">О нас</h1>

        {/* Блок 1: Формула красоты и молодости */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-text mb-6 uppercase tracking-wide">
            О НАС
          </h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              Формула красоты и молодости существует. Главное в ней не дорогие
              крема, сыворотки, кондиционеры и шампуни. Красота рождается изнутри.
              Здоровые люди обворожительны по-особому.
            </p>
            <p>
              Inner Health – это инновационные здоровьесберегающие продукты с
              нутрикосметическим эффектом. Они расширяют границы вашего потенциала.
              С ними ваш белковый статус в норме. А ухоженная, упругая кожа, густые,
              блестящие волосы, легкая походка, стройное тело вне времени, вне
              возраста.
            </p>
            <p>
              Все от разработки формул и производства основного сырья делаем в
              России. Стоимость продукции не обременена затратами на логистику и
              колебаниями курса доллара.
            </p>
            <p>
              Чистые составы без дополнительных объемных реагентов, консервантов,
              красителей, подсластителей. Высокая биодоступность и эффективная
              синергия компонентов. Результативность пролонгирована. Ее чувствуют,
              видят, ценят.
            </p>
          </div>
          <div className="mt-8 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <img
              src={IMAGE_FACE}
              alt="Красота и здоровье изнутри"
              className="w-full h-auto object-cover"
            />
          </div>
        </section>

        {/* Блок 2: На рынке с 2022, доверие, партнёры */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-text mb-6">Inner Health</h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              Inner Health на рынке с 2022 года, но уже сыскала доверие
              покупателей. Более 5000 человек каждый день становятся с нами
              здоровее и возвращаются вновь и вновь. Особая гордость – более 2000
              положительных отзывов, которые вдохновляют нас идти дальше.
              Бесценно доверие врачей конвенциальной и превентивной медицины,
              нутрициологов, диетологов, косметологов.
            </p>
            <p>
              Сотрудничаем с{' '}
              {PARTNERS.map((name, i) => (
                <span key={name}>
                  {i > 0 && ', '}
                  {name}
                </span>
              ))}
              .
            </p>
          </div>
          <div className="mt-8 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <img
              src={IMAGE_NUTRITION}
              alt="Питание и здоровый образ жизни"
              className="w-full h-auto object-cover"
            />
          </div>
        </section>

        {/* Призыв к действию */}
        <section className="bg-soft-background rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-text font-medium mb-4">
            Выберите продукты для красоты и здоровья изнутри
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center rounded-full bg-action-blue text-gray-800 font-medium px-6 py-2.5 min-h-[44px] hover:bg-action-blue/90 transition-colors"
          >
            Перейти в каталог
          </Link>
        </section>
      </div>
    </div>
  )
}
