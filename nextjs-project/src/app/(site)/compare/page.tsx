import { ComparePageContent } from '@/components/site/compare-page-content'
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { Heading1 } from '@/components/ui/responsive-text'

export default function ComparePage() {
  return (
    <AdaptiveContainer maxWidth="default" className="py-10">
      <Heading1 className="text-text mb-6">Сравнение товаров</Heading1>
      <ComparePageContent />
    </AdaptiveContainer>
  )
}
