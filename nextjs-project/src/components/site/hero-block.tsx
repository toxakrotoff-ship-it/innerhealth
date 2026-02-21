import Image from "next/image"
import Link from "next/link"
import { LiquidButton } from "@/components/ui/liquid-glass-button"

const HERO_HEADLINE = 'Функциональные Продукты'

export function HeroBlock() {
  return (
    <section
      className="relative min-h-[520px] sm:min-h-[560px] lg:min-h-[520px] overflow-hidden bg-[#1a2332]"
      aria-label="Главный блок"
    >
      {/* Aurora-фон в палитре бренда: приглушённые синие и мягкий голубой */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="absolute -inset-[10px] will-change-transform
            [--aurora:repeating-linear-gradient(100deg,#3B66F5_8%,#2563eb_14%,#1e3a5f_20%,#D9EFFF_26%,#475569_32%)]
            [background-image:var(--aurora)]
            [background-size:300%_200%]
            [background-position:50%_50%]
            blur-[12px]
            opacity-[0.48]
            animate-aurora
            [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black_25%,transparent_65%)]"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full min-h-[520px] sm:min-h-[560px] lg:min-h-[520px] flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_1fr] md:grid-rows-1 gap-8 lg:gap-12 flex-1 min-h-0 pt-12 lg:pt-16 pb-0">
          {/* Левая колонка: текст и CTA явно слева, компактный блок */}
          <div className="flex flex-col justify-center order-1 text-center md:text-left min-h-0 md:max-w-sm lg:max-w-md xl:max-w-lg w-full">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[2.75rem] font-bold text-white tracking-tight leading-tight">
              {HERO_HEADLINE}
            </h1>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <LiquidButton asChild variant="heroPrimary" size="xl">
                <Link href="/catalog">КАТАЛОГ</Link>
              </LiquidButton>
              <LiquidButton asChild variant="heroOutline" size="xl">
                <Link href="/contacts">КОНТАКТЫ</Link>
              </LiquidButton>
            </div>
          </div>

          {/* Правая колонка: контейнер на всю высоту, картинка жёстко привязана к низу (absolute bottom-0) */}
          <div className="relative order-2 min-h-[280px] md:min-h-0 w-full">
            <div className="absolute bottom-0 right-0 w-full max-w-md md:max-w-none aspect-[1680/904] md:aspect-auto h-[280px] sm:h-[340px] md:h-[380px] lg:h-[420px] xl:h-[480px] bg-transparent">
              <Image
                src="/hero-portrait.png"
                alt=""
                fill
                className="object-contain object-[right_bottom] bg-transparent"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
