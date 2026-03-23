'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

function TabContent({ text }: { text: string }) {
  const isHtml = /<[a-z][\s\S]*>/i.test(text.trim());
  if (isHtml) {
    return (
      <div
        className="prose prose-sm max-w-none
        [&_img]:max-w-full
        [&_ul]:list-disc [&_ol]:list-decimal
        /* Product characteristics table (admin “Характеристика -> Значение”) */
        [&_table.product-characteristics-table]:w-full
        [&_table.product-characteristics-table]:table-auto
        [&_table.product-characteristics-table th]:font-semibold
        [&_table.product-characteristics-table th]:text-gray-900
        [&_table.product-characteristics-table th]:w-[42%]
        sm:[&_table.product-characteristics-table th]:w-[38%]
        lg:[&_table.product-characteristics-table th]:w-[34%]
        [&_table.product-characteristics-table th]:px-4
        [&_table.product-characteristics-table th]:py-2
        [&_table.product-characteristics-table th]:align-middle
        [&_table.product-characteristics-table th]:whitespace-normal
        [&_table.product-characteristics-table th]:break-words
        [&_table.product-characteristics-table td]:align-middle
        [&_table.product-characteristics-table td]:whitespace-normal
        [&_table.product-characteristics-table td]:break-words
        [&_table.product-characteristics-table td]:min-w-0
        [&_table.product-characteristics-table td]:text-gray-700
        [&_table.product-characteristics-table td]:px-4
        [&_table.product-characteristics-table td]:py-3
        [&_table.product-characteristics-table>tbody>tr:last-child]:border-b!
        [&_table.product-characteristics-table>tbody>tr:last-child]:border-gray-200!
        [&_table[data-product-characteristics='1']]:w-full
        [&_table[data-product-characteristics='1']]:table-auto
        [&_table[data-product-characteristics='1'] th]:font-semibold
        [&_table[data-product-characteristics='1'] th]:text-gray-900
        [&_table[data-product-characteristics='1'] th]:w-[42%]
        sm:[&_table[data-product-characteristics='1'] th]:w-[38%]
        lg:[&_table[data-product-characteristics='1'] th]:w-[34%]
        [&_table[data-product-characteristics='1'] th]:px-4
        [&_table[data-product-characteristics='1'] th]:py-2
        [&_table[data-product-characteristics='1'] th]:align-middle
        [&_table[data-product-characteristics='1'] th]:whitespace-normal
        [&_table[data-product-characteristics='1'] th]:break-words
        [&_table[data-product-characteristics='1'] td]:text-gray-700
        [&_table[data-product-characteristics='1'] td]:px-4
        [&_table[data-product-characteristics='1'] td]:py-3
        [&_table[data-product-characteristics='1'] td]:align-middle
        [&_table[data-product-characteristics='1'] td]:whitespace-normal
        [&_table[data-product-characteristics='1'] td]:break-words
        [&_table[data-product-characteristics='1'] td]:min-w-0
        [&_table[data-product-characteristics='1']>tbody>tr:last-child]:border-b!
        [&_table[data-product-characteristics='1']>tbody>tr:last-child]:border-gray-200!
        dark:[&_table.product-characteristics-table th]:text-gray-100
        dark:[&_table.product-characteristics-table td]:text-gray-200
        dark:[&_table.product-characteristics-table>tbody>tr:last-child]:border-gray-700!
        dark:[&_table[data-product-characteristics='1'] th]:text-gray-100
        dark:[&_table[data-product-characteristics='1'] td]:text-gray-200
        dark:[&_table[data-product-characteristics='1']>tbody>tr:last-child]:border-gray-700!"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }
  const lines = text.split(/\r?\n/).filter(Boolean);
  const asList = lines.some((l) => /^[-•*]\s*/.test(l.trim()));
  if (asList) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        {lines.map((line, i) => (
          <li key={i}>{line.replace(/^[-•*]\s*/, '').trim() || line}</li>
        ))}
      </ul>
    );
  }
  return <div className="whitespace-pre-line">{text}</div>;
}

export interface ProductTabItem {
  title: string;
  content: string;
}

interface ProductTabsProps {
  tabs: ProductTabItem[];
  className?: string;
}

export function ProductTabs({ tabs, className }: ProductTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <section className={cn('mt-12 pt-8 border-t border-gray-200 dark:border-gray-700', className)}>
      <Tabs defaultValue="tab-0" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-transparent bg-transparent p-0 h-auto gap-x-1 [&>button]:rounded-none [&>button]:border-b-2 [&>button]:border-transparent [&>button]:bg-transparent [&>button]:shadow-none data-[state=active]:border-action-blue data-[state=active]:text-action-blue data-[state=active]:bg-transparent">
          {tabs.map((tab, index) => (
            <TabsTrigger
              key={tab.title}
              value={`tab-${index}`}
              className="rounded-none border-b-2 border-transparent -mb-px px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 data-[state=active]:border-action-blue data-[state=active]:text-action-blue data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {tab.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab, index) => (
          <TabsContent
            key={tab.title}
            value={`tab-${index}`}
            className="mt-4 focus-visible:outline-none"
          >
            <div className="prose prose-sm max-w-none text-gray-600 dark:text-gray-300 prose-ul:my-2 prose-li:my-0">
              <TabContent text={tab.content} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
