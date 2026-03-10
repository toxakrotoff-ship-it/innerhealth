'use client'

import { useEffect, useRef } from 'react'

interface ClearInvalidSessionProps {
  /** Флаг, указывающий на наличие поврежденной сессии */
  hasInvalidSession: boolean
}

/**
 * Клиентский компонент для очистки поврежденных сессионных токенов.
 * 
 * При обнаружении флага hasInvalidSession вызывает API endpoint
 * для удаления поврежденных cookies NextAuth.
 */
export function ClearInvalidSession({ hasInvalidSession }: ClearInvalidSessionProps) {
  const hasClearedRef = useRef(false)
  
  useEffect(() => {
    // Предотвращаем повторные вызовы
    if (!hasInvalidSession || hasClearedRef.current) {
      return
    }
    
    const clearInvalidCookies = async () => {
      try {
        console.log('[ClearInvalidSession] Starting cookie cleanup...')
        
        const response = await fetch('/api/auth/clear-invalid-cookies', {
          method: 'GET',
          credentials: 'include', // Важно для отправки cookies
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('[ClearInvalidSession] Cookies cleared successfully:', data.clearedCookies)
          hasClearedRef.current = true
          
          // Если были очищены cookies, перезагружаем страницу для применения изменений
          if (data.clearedCookies?.length > 0) {
            console.log('[ClearInvalidSession] Reloading page to apply changes...')
            // Используем replace вместо reload для очистки истории
            window.location.replace(window.location.pathname)
          }
        } else {
          console.error('[ClearInvalidSession] Failed to clear cookies:', response.status)
        }
      } catch (error) {
        console.error('[ClearInvalidSession] Error calling clear endpoint:', error)
      }
    }
    
    clearInvalidCookies()
  }, [hasInvalidSession])
  
  // Компонент не рендерит ничего видимого
  return null
}
