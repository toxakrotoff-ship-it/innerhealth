'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

function TabContent({ text }: { text: string }) {
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
