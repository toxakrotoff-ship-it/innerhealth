'use client'

import { useId, useState } from 'react'

import { cn } from '@/lib/utils'

interface FaqItem {
  id: string
  question: string
  answer: string
}

interface FaqAccordionProps {
  items: ReadonlyArray<FaqItem>
  isSprintTheme?: boolean
  variant?: 'default' | 'compact'
  defaultOpenItemId?: string | null
}

export function FaqAccordion({
  items,
  isSprintTheme = false,
  variant = 'default',
  defaultOpenItemId = null,
}: FaqAccordionProps) {
  const fallbackOpenId = variant === 'compact' ? items[0]?.id ?? null : null
  const [openItemId, setOpenItemId] = useState<string | null>(defaultOpenItemId ?? fallbackOpenId)
  const accordionId = useId()

  if (items.length === 0) {
    return (
      <p className={isSprintTheme ? 'text-slate-400' : 'text-gray-500'}>
        Пока нет опубликованных вопросов и ответов.
      </p>
    )
  }

  return (
    <div className={cn(variant === 'compact' ? 'space-y-2' : 'space-y-3')}>
      {items.map((item) => {
        const isOpen = item.id === openItemId
        const panelId = `${accordionId}-${item.id}-panel`
        const buttonId = `${accordionId}-${item.id}-button`

        return (
          <div
            key={item.id}
            className={cn(
              'overflow-hidden rounded-xl border transition-colors duration-200',
              isSprintTheme
                ? isOpen
                  ? 'border-[#3B82F6]/50 bg-[#0F172A]'
                  : 'border-slate-700 bg-[#0F172A]'
                : variant === 'compact'
                  ? isOpen
                    ? 'border-action-blue/40 bg-white'
                    : 'border-transparent bg-slate-50'
                  : isOpen
                    ? 'border-action-blue/40 bg-white'
                    : 'border-gray-200 bg-white'
            )}
          >
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenItemId((currentId) => (currentId === item.id ? null : item.id))}
              className={cn(
                'flex w-full items-center justify-between gap-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-blue/50 focus-visible:ring-offset-2',
                isSprintTheme ? 'focus-visible:ring-offset-[#0F172A]' : 'focus-visible:ring-offset-white',
                variant === 'compact'
                  ? 'px-4 py-3'
                  : 'px-4 py-4 md:px-5',
                isSprintTheme ? 'text-slate-100' : 'text-text'
              )}
            >
              <span className={cn('font-medium', variant === 'compact' ? 'text-sm font-semibold text-slate-800' : '')}>
                {item.question}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'shrink-0 text-xl leading-none transition-transform duration-300 ease-out',
                  isOpen ? 'rotate-45' : 'rotate-0',
                  isSprintTheme ? 'text-slate-500' : 'text-slate-400'
                )}
              >
                +
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={cn(
                'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="overflow-hidden">
                <div
                  className={cn(
                    'whitespace-pre-line text-sm',
                    variant === 'compact' ? 'px-4 pb-4 pt-0' : 'px-4 pb-4 pt-0 md:px-5 md:pb-5',
                    isSprintTheme ? 'text-slate-300' : 'text-gray-700'
                  )}
                >
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
