interface FaqItem {
  id: string
  question: string
  answer: string
}

interface FaqAccordionProps {
  items: ReadonlyArray<FaqItem>
  isSprintTheme?: boolean
}

export function FaqAccordion({ items, isSprintTheme = false }: FaqAccordionProps) {
  if (items.length === 0) {
    return (
      <p className={isSprintTheme ? 'text-slate-400' : 'text-gray-500'}>
        Пока нет опубликованных вопросов и ответов.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <details
          key={item.id}
          className={`group rounded-xl border p-4 ${
            isSprintTheme
              ? 'border-slate-700 bg-[#0F172A] open:border-[#3B82F6]/50'
              : 'border-gray-200 bg-white open:border-action-blue/40'
          }`}
        >
          <summary
            className={`cursor-pointer list-none pr-7 font-medium relative ${
              isSprintTheme ? 'text-slate-100' : 'text-text'
            }`}
          >
            {item.question}
            <span
              className={`absolute right-0 top-0 transition-transform group-open:rotate-45 ${
                isSprintTheme ? 'text-slate-500' : 'text-gray-400'
              }`}
            >
              +
            </span>
          </summary>
          <p className={`mt-3 whitespace-pre-line text-sm ${isSprintTheme ? 'text-slate-300' : 'text-gray-700'}`}>
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  )
}
