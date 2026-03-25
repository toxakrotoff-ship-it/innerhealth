import type { CdekTariffSummary } from '@/components/site/delivery-section'

export function getNextTariff({
  currentTariff,
  nextTariffs,
  preserveCurrentOnEmpty,
}: {
  currentTariff: CdekTariffSummary | null
  nextTariffs: CdekTariffSummary[]
  preserveCurrentOnEmpty: boolean
}): CdekTariffSummary | null {
  if (nextTariffs.length > 0) return nextTariffs[0]
  if (preserveCurrentOnEmpty) return currentTariff
  return null
}
