'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/store/cart-store'

interface SessionResponse {
  user?: {
    id?: string
  } | null
}

export function CartOwnerSync() {
  useEffect(() => {
    let isCancelled = false

    const syncOwner = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })
        if (!response.ok) return
        const payload = (await response.json()) as SessionResponse | null
        if (isCancelled) return
        const ownerId = payload?.user?.id ?? null
        useCartStore.getState().syncOwner(ownerId)
      } catch {
        // Keep current cart state if session endpoint is temporarily unavailable.
      }
    }

    void syncOwner()

    const handleFocus = () => {
      void syncOwner()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      void syncOwner()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isCancelled = true
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return null
}
