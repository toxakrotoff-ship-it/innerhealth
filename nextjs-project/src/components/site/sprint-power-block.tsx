import Image from 'next/image'
import Link from 'next/link'

const SPRINT_POWER_TEXT = `С удовольствием представляем второй наш проект – Sprint Power. Спортивное питание нового поколения. Не уступает, а во многом и превосходит многие дорогие импортные аналоги. Инновационные формулы, правильные пропорции, высококачественное сырье в биодоступной форме. Добавки Sprint Power сделают ваши тренировки эффективнее, тело красивее, победы ярче. Дизайн упаковки – брутален и изыскан, идеально передает гармоничное соотношение внутренней силы и внешней красоты. Пробуйте. Делитесь впечатлениями и результатами. Они – главная оценка нашего труда.`

const SPRINT_POWER_URL = 'https://sprintpower.ru'

export function SprintPowerBlock() {
  return (
    <section className="py-16 lg:py-20 bg-soft-background" aria-labelledby="sprint-power-heading">
      <div className="max-w-[min(90rem,92vw)] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Мокап слева — до 500px, без апскейла (исходник 500×500) */}
          <div className="order-1 flex justify-center lg:justify-start">
            <div
              className="relative w-[200px] sm:w-[280px] md:w-[320px] lg:w-[360px] xl:w-[400px] xl:max-w-[400px]"
              aria-hidden
            >
              <Image
                src="/sprint-power-mockup.png"
                alt=""
                width={500}
                height={500}
                className="w-full h-auto object-contain"
                sizes="(max-width: 640px) 200px, (max-width: 768px) 280px, (max-width: 1024px) 360px, (max-width: 1280px) 420px, 500px"
              />
            </div>
          </div>

          {/* Текст справа */}
          <div className="order-2">
            <h2 id="sprint-power-heading" className="text-2xl sm:text-3xl font-bold text-text mb-6">
              Sprint Power
            </h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {SPRINT_POWER_TEXT}
            </p>
            <Link
              href={SPRINT_POWER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-action-blue text-gray-800 font-medium px-6 py-3 min-h-[44px] hover:bg-action-blue/90 transition-colors"
            >
              Перейти на сайт
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
