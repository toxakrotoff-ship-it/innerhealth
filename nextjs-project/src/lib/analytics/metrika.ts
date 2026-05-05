import 'client-only'

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void
  }
}

const INNER_METRIKA_COUNTER_ID = 92621260 as const

export function reachMetrikaGoal(goal: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (typeof window.ym !== 'function') return
  try {
    window.ym(INNER_METRIKA_COUNTER_ID, 'reachGoal', goal, params)
  } catch {
    // ignore
  }
}

