import 'client-only'
import { resolveClientSiteBrandFromWindow } from '@/lib/brand/client-site-brand'
import { METRIKA_COUNTER_ID_BY_BRAND } from '@/lib/analytics/metrika-config'

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void
  }
}

export function reachMetrikaGoal(goal: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (typeof window.ym !== 'function') return
  const brand = resolveClientSiteBrandFromWindow()
  const counterId = METRIKA_COUNTER_ID_BY_BRAND[brand]
  if (!counterId) return
  try {
    window.ym(counterId, 'reachGoal', goal, params)
  } catch {
    // ignore
  }
}

