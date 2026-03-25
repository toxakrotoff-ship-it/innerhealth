'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

function characteristicTableClasses(isSprintTheme: boolean): string {
  return cn(
    '[&_table.product-characteristics-table]:w-full',
    '[&_table.product-characteristics-table]:table-auto',
    '[&_table.product-characteristics-table th]:font-semibold',
    '[&_table.product-characteristics-table th]:w-[42%]',
    'sm:[&_table.product-characteristics-table th]:w-[38%]',
    'lg:[&_table.product-characteristics-table th]:w-[34%]',
    '[&_table.product-characteristics-table th]:px-4',
    '[&_table.product-characteristics-table th]:py-2',
    '[&_table.product-characteristics-table th]:align-middle',
    '[&_table.product-characteristics-table th]:whitespace-normal',
    '[&_table.product-characteristics-table th]:break-words',
    '[&_table.product-characteristics-table td]:align-middle',
    '[&_table.product-characteristics-table td]:whitespace-normal',
    '[&_table.product-characteristics-table td]:break-words',
    '[&_table.product-characteristics-table td]:min-w-0',
    '[&_table.product-characteristics-table td]:px-4',
    '[&_table.product-characteristics-table td]:py-3',
    isSprintTheme
      ? [
          '[&_table.product-characteristics-table th]:text-slate-100',
          '[&_table.product-characteristics-table td]:text-slate-300',
          '[&_table.product-characteristics-table>tbody>tr:last-child]:border-b!',
          '[&_table.product-characteristics-table>tbody>tr:last-child]:border-slate-700!',
        ]
      : [
          '[&_table.product-characteristics-table th]:text-gray-900',
          '[&_table.product-characteristics-table td]:text-text',
          '[&_table.product-characteristics-table>tbody>tr:last-child]:border-b!',
          '[&_table.product-characteristics-table>tbody>tr:last-child]:border-gray-200!',
          'dark:[&_table.product-characteristics-table th]:text-gray-100',
          'dark:[&_table.product-characteristics-table td]:text-gray-200',
          'dark:[&_table.product-characteristics-table>tbody>tr:last-child]:border-gray-700!',
        ],
    '[&_table[data-product-characteristics="1"]]:w-full',
    '[&_table[data-product-characteristics="1"]]:table-auto',
    '[&_table[data-product-characteristics="1"] th]:font-semibold',
    '[&_table[data-product-characteristics="1"] th]:w-[42%]',
    'sm:[&_table[data-product-characteristics="1"] th]:w-[38%]',
    'lg:[&_table[data-product-characteristics="1"] th]:w-[34%]',
    '[&_table[data-product-characteristics="1"] th]:px-4',
    '[&_table[data-product-characteristics="1"] th]:py-2',
    '[&_table[data-product-characteristics="1"] th]:align-middle',
    '[&_table[data-product-characteristics="1"] th]:whitespace-normal',
    '[&_table[data-product-characteristics="1"] th]:break-words',
    '[&_table[data-product-characteristics="1"] td]:px-4',
    '[&_table[data-product-characteristics="1"] td]:py-3',
    '[&_table[data-product-characteristics="1"] td]:align-middle',
    '[&_table[data-product-characteristics="1"] td]:whitespace-normal',
    '[&_table[data-product-characteristics="1"] td]:break-words',
    '[&_table[data-product-characteristics="1"] td]:min-w-0',
    isSprintTheme
      ? [
          '[&_table[data-product-characteristics="1"] th]:text-slate-100',
          '[&_table[data-product-characteristics="1"] td]:text-slate-300',
          '[&_table[data-product-characteristics="1"]>tbody>tr:last-child]:border-b!',
          '[&_table[data-product-characteristics="1"]>tbody>tr:last-child]:border-slate-700!',
        ]
      : [
          '[&_table[data-product-characteristics="1"] th]:text-gray-900',
          '[&_table[data-product-characteristics="1"] td]:text-text',
          '[&_table[data-product-characteristics="1"]>tbody>tr:last-child]:border-b!',
          '[&_table[data-product-characteristics="1"]>tbody>tr:last-child]:border-gray-200!',
          'dark:[&_table[data-product-characteristics="1"] th]:text-gray-100',
          'dark:[&_table[data-product-characteristics="1"] td]:text-gray-200',
          'dark:[&_table[data-product-characteristics="1"]>tbody>tr:last-child]:border-gray-700!',
        ]
  )
}

function TabContent({ text, isSprintTheme }: { text: string; isSprintTheme: boolean }) {
  const isHtml = /<[a-z][\s\S]*>/i.test(text.trim())
  if (isHtml) {
    return (
      <div
        className={cn(
          'prose prose-sm max-w-none',
          '[&_img]:max-w-full',
          '[&_ul]:list-disc [&_ol]:list-decimal',
          characteristicTableClasses(isSprintTheme)
        )}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    )
  }
  const lines = text.split(/\r?\n/).filter(Boolean)
  const asList = lines.some((l) => /^[-•*]\s*/.test(l.trim()))
  if (asList) {
    return (
      <ul
        className={cn(
          'list-disc space-y-1 pl-5',
          isSprintTheme ? 'text-slate-300' : 'text-text'
        )}
      >
        {lines.map((line, i) => (
          <li key={i}>{line.replace(/^[-•*]\s*/, '').trim() || line}</li>
        ))}
      </ul>
    )
  }
  return (
    <div
      className={cn('whitespace-pre-line', isSprintTheme ? 'text-slate-300' : 'text-text')}
    >
      {text}
    </div>
  )
}

export interface ProductTabItem {
  title: string
  content: string
}

interface ProductTabsProps {
  tabs: ProductTabItem[]
  className?: string
  isSprintTheme?: boolean
}

export function ProductTabs({ tabs, className, isSprintTheme = false }: ProductTabsProps) {
  if (tabs.length === 0) return null
  const shouldShowSwipeHint = tabs.length > 2

  return (
    <section
      className={cn(
        'mt-8 border-t pt-6 sm:mt-12 sm:pt-8',
        isSprintTheme ? 'border-slate-700' : 'border-gray-200 dark:border-gray-700',
        className
      )}
    >
      <Tabs defaultValue="tab-0" className="w-full">
        <div className="relative">
          <TabsList
            className={cn(
              'h-auto w-full justify-start gap-x-1 overflow-x-auto rounded-none border-b border-transparent bg-transparent p-0 whitespace-nowrap',
              '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
              '[&>button]:rounded-none [&>button]:border-b-2 [&>button]:border-transparent [&>button]:bg-transparent [&>button]:shadow-none',
              'data-[state=active]:border-action-blue data-[state=active]:bg-transparent data-[state=active]:text-action-blue'
            )}
          >
            {tabs.map((tab, index) => (
              <TabsTrigger
                key={tab.title}
                value={`tab-${index}`}
                className={cn(
                  '-mb-px shrink-0 rounded-none border-b-2 border-transparent px-3 py-3 text-sm font-medium sm:px-4',
                  'data-[state=active]:border-action-blue data-[state=active]:bg-transparent data-[state=active]:text-action-blue data-[state=active]:shadow-none',
                  isSprintTheme
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-gray-600 hover:text-text'
                )}
              >
                {tab.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {shouldShowSwipeHint && (
          <p
            className={cn(
              'mt-1 text-xs sm:hidden',
              isSprintTheme ? 'text-slate-500' : 'text-gray-500'
            )}
          >
            Свайпните вкладки влево/вправо
          </p>
        )}
        {tabs.map((tab, index) => (
          <TabsContent
            key={tab.title}
            value={`tab-${index}`}
            className="mt-4 focus-visible:outline-none"
          >
            <div
              className={cn(
                'prose prose-sm max-w-none prose-ul:my-2 prose-li:my-0 leading-relaxed',
                isSprintTheme ? 'text-slate-300' : 'text-text'
              )}
            >
              <TabContent text={tab.content} isSprintTheme={isSprintTheme} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}
