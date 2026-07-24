import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'iconoir-react'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import type { ContentBlockResolved } from '@/services/content-block.service'
import { getInnerHealthHeroPortraitAlt } from '@/lib/image-alt-text'

interface HeroBlockProps {
  badge: ContentBlockResolved | null
  title: ContentBlockResolved | null
  subtitle: ContentBlockResolved | null
  description?: ContentBlockResolved | null
  highlight: ContentBlockResolved | null
  ctaLabel?: string
  ctaHref?: string
  imageSrc?: string | null
  imageAlt?: string
  showBadge?: boolean
  showSubtitle?: boolean
  showDescription?: boolean
  showPrimaryCta?: boolean
  showImage?: boolean
}

export function HeroBlock({
  badge,
  title,
  subtitle,
  description,
  highlight,
  ctaLabel = 'ПЕРЕЙТИ В КАТАЛОГ',
  ctaHref = '/catalog',
  imageSrc = '/hero-portrait.png',
  imageAlt = getInnerHealthHeroPortraitAlt(),
  showBadge = true,
  showSubtitle = true,
  showDescription = true,
  showPrimaryCta = true,
  showImage = true,
}: HeroBlockProps) {

  const badgeText = badge?.text ?? 'НОВЫЙ СТАНДАРТ БИОДОБАВОК'
  const titleText = title?.text ?? 'Функциональное\nпитание для\nтвоего\nбаланса.'
  const subtitleText =
    subtitle?.text ??
    'Мы объединили чистоту натуральных ингредиентов и высокие технологии для поддержания вашего здоровья на клеточном уровне.'
  const descriptionText =
    description?.text ??
    'Понятные составы, удобные форматы и подробная информация о каждом продукте.'

  const highlightWord = (highlight?.text?.trim() ?? 'твоего').toLowerCase()
  const highlightWordLen = highlightWord.length

  const allowedTextColors = [
    'text-white',
    'text-white/90',
    'text-blue-300',
    'text-blue-400',
    'text-slate-300',
    'text-slate-400',
    'text-slate-500',
    'text-slate-600',
    'text-action-blue',
  ] as const
  const highlightColorClass =
    highlight?.colorToken && allowedTextColors.includes(highlight.colorToken as (typeof allowedTextColors)[number])
      ? highlight.colorToken
      : 'text-blue-300'

  const allowedWeights = [
    'thin',
    'light',
    'normal',
    'medium',
    'semibold',
    'bold',
    'extrabold',
  ] as const
  const weightToClass: Record<(typeof allowedWeights)[number], string> = {
    thin: 'font-thin',
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
  }
  const allowedVariants = ['sans', 'display', 'script'] as const
  const variantToClass: Record<(typeof allowedVariants)[number], string> = {
    sans: 'font-sans',
    display: 'font-display',
    script: 'font-script',
  }
  const getWeightClass = (
    block: ContentBlockResolved | null | undefined,
    fallback: (typeof allowedWeights)[number]
  ) =>
    block?.fontWeight && allowedWeights.includes(block.fontWeight as (typeof allowedWeights)[number])
      ? weightToClass[block.fontWeight as (typeof allowedWeights)[number]]
      : weightToClass[fallback]
  const getVariantClass = (
    block: ContentBlockResolved | null | undefined,
    fallback: (typeof allowedVariants)[number]
  ) =>
    block?.fontVariant && allowedVariants.includes(block.fontVariant as (typeof allowedVariants)[number])
      ? variantToClass[block.fontVariant as (typeof allowedVariants)[number]]
      : variantToClass[fallback]
  const getColorClass = (
    block: ContentBlockResolved | null | undefined,
    fallback: (typeof allowedTextColors)[number]
  ) =>
    block?.colorToken && allowedTextColors.includes(block.colorToken as (typeof allowedTextColors)[number])
      ? block.colorToken
      : fallback

  const titleWeightClass =
    getWeightClass(title, 'thin')
  const titleVariantClass =
    getVariantClass(title, 'display')
  const subtitleWeightClass =
    getWeightClass(subtitle, 'light')
  const subtitleVariantClass =
    getVariantClass(subtitle, 'sans')
  const subtitleColorClass =
    getColorClass(subtitle, 'text-slate-300')
  const descriptionWeightClass =
    getWeightClass(description, 'light')
  const descriptionVariantClass =
    getVariantClass(description, 'sans')
  const descriptionColorClass =
    getColorClass(description, 'text-slate-300')

  const badgeClassName =
    'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide sm:text-sm 2xl:px-4 2xl:py-1.5 2xl:text-base 3xl:px-5 3xl:py-2'

  /** Подсвечивает слово внутри строки (первое вхождение, без учёта регистра). */
  function renderLineWithHighlight(line: string) {
    if (!highlightWordLen) return line
    const lower = line.toLowerCase()
    const i = lower.indexOf(highlightWord)
    if (i === -1) return line
    const before = line.slice(0, i)
    const word = line.slice(i, i + highlightWordLen)
    const after = line.slice(i + highlightWordLen)
    return (
      <>
        {before}
        <span className={highlightColorClass}>{word}</span>
        {after}
      </>
    )
  }

  /* min-h breakpoints mirror `main` pt in `app/(site)/layout.tsx` (sticky header offset). */
  return (
    <section
      className="relative box-border min-h-[clamp(560px,calc(100dvh-4rem-env(safe-area-inset-top)),980px)] 2xl:min-h-[clamp(620px,calc(100dvh-4.5rem-env(safe-area-inset-top)),1080px)] 3xl:min-h-[clamp(680px,calc(100dvh-5rem-env(safe-area-inset-top)),1160px)] 4xl:min-h-[clamp(720px,calc(100dvh-6rem-env(safe-area-inset-top)),1220px)] 5xl:min-h-[clamp(760px,calc(100dvh-7rem-env(safe-area-inset-top)),1280px)] 6xl:min-h-[clamp(800px,calc(100dvh-8rem-env(safe-area-inset-top)),1360px)] flex items-center overflow-hidden pb-6 sm:pb-8 text-white bg-[radial-gradient(circle_at_top_right,#334155_0%,#0f172a_100%)]"
      aria-label="Главный блок"
    >
      <AdaptiveContainer
        maxWidth="default"
        className="relative z-10 grid w-full items-center gap-6 overflow-x-hidden sm:gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16 2xl:gap-20 3xl:gap-24"
      >
        <ScrollReveal
          as="div"
          variant="fade-up"
          className="min-h-0 max-w-full space-y-4 px-4 py-6 sm:max-w-xl sm:space-y-6 sm:px-0 sm:py-8 lg:max-w-2xl lg:space-y-8 lg:py-12 xl:max-w-3xl 3xl:max-w-4xl"
        >
          {showBadge ? (
            <div className={`${badgeClassName} 3xl:text-sm 3xl:px-4 3xl:py-1.5`}>
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" aria-hidden />
              {badgeText}
            </div>
          ) : null}
          <h1
            className={`text-fluid-hero tracking-tighter max-w-full w-full ${titleVariantClass} ${titleWeightClass}`}
          >
            {titleText.split('\n').map((line, index) => (
              <span key={`line-${index}`} className="block">
                {renderLineWithHighlight(line)}
              </span>
            ))}
          </h1>
          {showSubtitle ? (
            <p
              className={`text-fluid-subtitle max-w-fluid ${subtitleVariantClass} ${subtitleWeightClass} ${subtitleColorClass}`}
            >
              {subtitleText}
            </p>
          ) : null}
          {showDescription ? (
            <p
              className={`text-fluid-subtitle max-w-fluid ${descriptionVariantClass} ${descriptionWeightClass} ${descriptionColorClass}`}
            >
              {descriptionText}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-4 sm:gap-4 3xl:gap-5">
            {showPrimaryCta ? (
              <Link
                href={ctaHref}
                className="desktop-button-scale inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-900 transition-all hover:bg-blue-50 sm:px-8 sm:py-4 3xl:px-10 3xl:py-5 3xl:text-base"
              >
                {ctaLabel}
                <ArrowUpRight className="w-4 h-4 shrink-0" aria-hidden />
              </Link>
            ) : null}
            <Link
              href="/sertifikaty-sootvetstviya"
              className="desktop-button-scale rounded-full border border-white/10 bg-white/10 px-7 py-3 text-sm font-semibold text-slate-100 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/15 sm:px-8 sm:py-4 3xl:px-10 3xl:py-5 3xl:text-base"
            >
              НАШИ СЕРТИФИКАТЫ
            </Link>
          </div>
        </ScrollReveal>
      </AdaptiveContainer>

      {showImage && imageSrc ? (
        <div
          className="absolute right-0 bottom-0 w-full lg:w-1/2 h-[60vh] sm:h-[70vh] lg:h-full pointer-events-none"
          aria-hidden
        >
          <div className="relative w-full h-full">
            <div
              className="absolute inset-0 w-full h-full"
              style={{
                maskImage: 'linear-gradient(to left, black 40%, transparent)',
                WebkitMaskImage: 'linear-gradient(to left, black 40%, transparent)',
              }}
            >
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={1008}
                height={1016}
                className="absolute inset-0 h-full w-full object-contain object-bottom-right opacity-80 sm:opacity-90 mix-blend-lighten hero-portrait-image"
                sizes="(max-width: 640px) 80vw, (max-width: 1024px) 60vw, 50vw"
                priority
                fetchPriority="high"
                style={{ imageOrientation: 'none' }}
              />
            </div>
            <div
              className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-64 sm:h-64 bg-blue-500/20 blur-[80px] sm:blur-[120px] rounded-full"
              aria-hidden
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
