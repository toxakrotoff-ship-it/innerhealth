import { ComparePageContent } from '@/components/site/compare-page-content';

export default function ComparePage() {
  return (
    <div className="max-w-[min(90rem,92vw)] mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-text mb-6">Сравнение товаров</h1>
      <ComparePageContent />
    </div>
  );
}
