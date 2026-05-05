interface NutrientCategoryUsageCompositionProps {
  readonly usageText?: string
  readonly compositionText?: string
}

const DEFAULT_USAGE_TEXT =
  'один впрыск в час, до 10 нажатий в день. Перед употреблением взболтать. Продолжительность приема 2–3 недели. При необходимости прием можно повторить через месяц.'

const DEFAULT_COMPOSITION_TEXT =
  'вода очищенная, пептидный комплекс MH+GNDR-19-21 (глицин, пролин, аргинин, лейцин, тирозин, серин, триптофан, гистидин, пироглутаминовая кислота), ниацин (витамин PP), экстракт корней левзеи, экстракт'

export function NutrientCategoryUsageComposition({
  usageText = DEFAULT_USAGE_TEXT,
  compositionText = DEFAULT_COMPOSITION_TEXT,
}: NutrientCategoryUsageCompositionProps) {
  return (
    <section className="mt-12">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 backdrop-blur sm:p-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-slate-600 uppercase">
              Применение
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-800 sm:text-base">
              {usageText}
            </p>
          </div>

          <div className="md:border-l md:border-slate-200 md:pl-10">
            <h2 className="text-sm font-semibold tracking-wide text-slate-600 uppercase">
              Состав
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-800 sm:text-base">
              {compositionText}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

