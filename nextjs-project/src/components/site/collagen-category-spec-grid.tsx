import type { CollagenSpecCell } from '@/content/collagen-category-line'
import { cn } from '@/lib/utils'

export interface CollagenCategorySpecGridProps {
  readonly cells: readonly CollagenSpecCell[]
  readonly className?: string
}

/**
 * Блок из шести колонок (на десктопе 3×2) для `/catalog/collagen` — оформление в духе Sprint (тёмная тема).
 */
export function CollagenCategorySpecGrid({ cells, className }: CollagenCategorySpecGridProps) {
  return (
    <section
      className={cn(
        'mt-10 overflow-hidden rounded-2xl border border-slate-600/80 bg-[#0B1222]/90 shadow-lg shadow-black/25 sm:mt-12',
        className
      )}
      aria-label="Описание и условия применения"
    >
      <div className="grid grid-cols-1 md:grid-cols-3">
        {cells.map((cell, index) => (
          <div
            key={cell.id}
            className={cn(
              'p-5 sm:p-6',
              index < cells.length - 1 && 'border-b border-slate-700/80 md:border-b-0',
              index < 3 && 'md:border-b md:border-slate-700/80',
              index % 3 !== 2 && 'md:border-r md:border-slate-700/80'
            )}
          >
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-sky-200/95 sm:text-sm">
              {cell.title}
            </h2>
            <p className="text-sm leading-relaxed text-slate-300 sm:text-[0.9375rem]">{cell.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
