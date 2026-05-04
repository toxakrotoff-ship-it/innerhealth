import type { HydroCategoryProductDescription } from '@/content/hydro-category-bento'
import { cn } from '@/lib/utils'

export interface HydroCategoryProductDescriptionProps {
  readonly content: HydroCategoryProductDescription
  readonly className?: string
}

export function HydroCategoryProductDescription({ content, className }: HydroCategoryProductDescriptionProps) {
  return (
    <section
      className={cn(
        'mt-10 rounded-2xl border border-slate-600/60 bg-slate-100 px-5 py-8 text-slate-900 shadow-sm sm:mt-12 sm:px-8 sm:py-10',
        className
      )}
      aria-labelledby="hydro-product-description-heading"
    >
      <h2
        id="hydro-product-description-heading"
        className="mb-8 text-center text-xl font-bold uppercase tracking-wide text-slate-950 sm:text-2xl"
      >
        {content.heading}
      </h2>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6 lg:gap-8">
        {content.points.map((text, index) => (
          <div key={index} className="flex gap-4">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-sm font-semibold text-white shadow-sm"
              aria-hidden
            >
              {index + 1}
            </span>
            <p className="text-sm leading-relaxed text-slate-800 sm:text-[0.9375rem]">{text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
