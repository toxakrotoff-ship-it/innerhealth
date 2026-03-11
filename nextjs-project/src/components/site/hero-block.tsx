import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export function HeroBlock() {
  return (
    <section
      className="relative min-h-[calc(100vh-65px)] flex items-center overflow-hidden text-white bg-[radial-gradient(circle_at_top_right,#334155_0%,#0f172a_100%)]"
      aria-label="Главный блок"
    >
      <div className="relative max-w-[min(90rem,100vw)] mx-auto px-4 sm:px-6 lg:px-8 w-full grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 xl:gap-16 2xl:gap-20 items-center z-10 overflow-x-hidden">
        {/* Левая колонка: референс — бейдж, заголовок, подзаголовок, кнопки */}
        <div className="max-w-full px-4 sm:px-0 sm:max-w-xl lg:max-w-2xl xl:max-w-3xl space-y-4 sm:space-y-6 lg:space-y-8 py-6 sm:py-8 lg:py-12 overflow-hidden max-h-[calc(100vh-65px)] overflow-y-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-medium tracking-wide">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" aria-hidden />
            НОВЫЙ СТАНДАРТ БИОДОБАВОК
          </div>
          <h1 className="text-fluid-hero font-display font-semibold tracking-tighter max-w-full w-full">
            <span className="block">Функциональное</span>
            <span className="block">питание для</span>
            <span className="block text-blue-300">твоего</span>
            <span className="block">баланса. </span>
          </h1>
          <p className="text-fluid-subtitle text-slate-300 font-light max-w-fluid">
            Мы объединили чистоту натуральных ингредиентов и высокие технологии для поддержания вашего здоровья на клеточном уровне.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-full text-sm font-semibold hover:bg-blue-50 transition-all"
            >
              ПЕРЕЙТИ В КАТАЛОГ
              <ArrowUpRight className="w-4 h-4 shrink-0" aria-hidden />
            </Link>
            <Link
              href="/informaciya"
              className="px-8 py-4 bg-transparent border border-white/20 rounded-full text-sm font-semibold hover:bg-white/5 transition-all"
            >
              НАШИ СЕРТИФИКАТЫ
            </Link>
          </div>
        </div>
      </div>

      {/* Правая колонка: hero-portrait.png без замены + маска и декоративное размытие */}
      <div className="absolute right-0 bottom-0 w-full lg:w-1/2 h-[60vh] sm:h-[70vh] lg:h-full pointer-events-none" aria-hidden>
        <div className="relative w-full h-full">
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              maskImage: 'linear-gradient(to left, black 40%, transparent)',
              WebkitMaskImage: 'linear-gradient(to left, black 40%, transparent)',
            }}
          >
            <Image
              src="/hero-portrait.png"
              alt=""
              fill
              className="object-contain object-bottom-right opacity-80 sm:opacity-90 mix-blend-lighten"
              sizes="(max-width: 640px) 80vw, (max-width: 1024px) 60vw, 50vw"
              priority
            />
          </div>
          <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-64 sm:h-64 bg-blue-500/20 blur-[80px] sm:blur-[120px] rounded-full" aria-hidden />
        </div>
      </div>
    </section>
  )
}
