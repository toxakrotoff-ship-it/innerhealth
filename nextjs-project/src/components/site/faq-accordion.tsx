interface FaqItem {
  id: string
  question: string
  answer: string
}

interface FaqAccordionProps {
  items: FaqItem[]
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  if (items.length === 0) {
    return (
      <p className="text-gray-500">
        Пока нет опубликованных вопросов и ответов.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <details
          key={item.id}
          className="group rounded-xl border border-gray-200 bg-white p-4 open:border-action-blue/40"
        >
          <summary className="cursor-pointer list-none pr-7 font-medium text-text relative">
            {item.question}
            <span className="absolute right-0 top-0 text-gray-400 transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm text-gray-700">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  )
}
