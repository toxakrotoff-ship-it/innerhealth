'use client'

import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

export function AdminStatsRefreshButton() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function handleRefresh() {
    startTransition(() => {
      void (async () => {
        const from = searchParams.get('from')
        const to = searchParams.get('to')
        const period = searchParams.get('period')

        await fetch('/api/admin/analytics/aggregate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: from ?? undefined,
            to: to ?? undefined,
            period: period ?? undefined,
          }),
        }).catch(() => {})

        router.refresh()
      })()
    })
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isPending}
      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? 'Обновление...' : 'Обновить'}
    </button>
  )
}
