import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * API endpoint для очистки поврежденных сессионных токенов NextAuth.
 * 
 * Вызывается клиентом при обнаружении ошибки декодирования сессии.
 * Устанавливает cookies с истекшим сроком для гарантированного удаления.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestUrl = new URL(request.url)
  const referer = request.headers.get('referer') || ''
  const origin = request.headers.get('origin') || ''
  
  // Логирование вызова для мониторинга
  console.log('[clear-invalid-cookies] Request received', {
    url: requestUrl.pathname,
    referer: referer ? 'present' : 'missing',
    origin: origin ? 'present' : 'missing',
    timestamp: new Date().toISOString()
  })
  
  // Проверка referer/origin для базовой защиты от CSRF
  const allowedOrigins = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    'http://localhost:3000'
  ].filter(Boolean)
  
  const requestOrigin = origin || referer
  const isAllowedOrigin = allowedOrigins.some(allowed => 
    requestOrigin.startsWith(allowed || '')
  )
  
  if (!isAllowedOrigin && process.env.NODE_ENV === 'production') {
    console.warn('[clear-invalid-cookies] Blocked request from unauthorized origin', {
      origin: requestOrigin,
      allowedOrigins
    })
    return NextResponse.json(
      { error: 'Unauthorized origin' },
      { status: 403 }
    )
  }
  
  try {
    const cookieStore = await cookies()
    
    // Список всех возможных сессионных cookies NextAuth
    const cookiesToClear = [
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.csrf-token',
      '__Secure-next-auth.callback-url',
      '__Host-next-auth.csrf-token'
    ]
    
    const clearedCookies: string[] = []
    const alreadyCleared: string[] = []
    
    for (const cookieName of cookiesToClear) {
      const existingCookie = cookieStore.get(cookieName)
      
      if (existingCookie) {
        // Устанавливаем cookie с истекшим сроком для гарантированного удаления
        cookieStore.set(cookieName, '', {
          value: '',
          maxAge: 0,
          expires: new Date(0),
          path: '/',
          httpOnly: true,
          secure: cookieName.startsWith('__Secure-') || cookieName.startsWith('__Host-'),
          sameSite: 'lax'
        })
        clearedCookies.push(cookieName)
        console.log(`[clear-invalid-cookies] Cleared cookie: ${cookieName}`)
      } else {
        alreadyCleared.push(cookieName)
      }
    }
    
    const duration = Date.now() - startTime
    
    console.log('[clear-invalid-cookies] Cleanup completed', {
      clearedCount: clearedCookies.length,
      clearedCookies,
      duration: `${duration}ms`
    })
    
    const response = NextResponse.json({
      success: true,
      message: 'Invalid session cookies cleared',
      clearedCookies,
      timestamp: new Date().toISOString(),
      duration
    })
    
    // Добавляем CORS заголовки для кросс-доменных запросов
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    
    return response
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('[clear-invalid-cookies] Error clearing cookies:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to clear cookies',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Обработка OPTIONS запросов для CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '*'
  
  const response = new NextResponse(null, { status: 204 })
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  response.headers.set('Access-Control-Max-Age', '86400')
  
  return response
}
