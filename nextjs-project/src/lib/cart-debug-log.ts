'use client'

type CartDebugLevel = 'debug' | 'info' | 'warn' | 'error'

export type CartDebugScope = 'cart' | 'cdek-widget' | 'cdek-api'

export interface CartDebugPayload {
  readonly scope: CartDebugScope
  readonly event: string
  readonly level?: CartDebugLevel
  readonly data?: Record<string, unknown>
  readonly error?: unknown
}

const CLIENT_LOG_ENDPOINT = '/api/debug/client-log'
const SESSION_STORAGE_KEY = 'ih_cart_debug_session_id'

let queue: CartDebugPayload[] = []
let flushTimer: number | null = null

function isCartDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CART_DEBUG === 'true'
}

function shouldLogToConsole(level: CartDebugLevel): boolean {
  if (process.env.NODE_ENV === 'development') return true
  if (!isCartDebugEnabled()) return level === 'warn' || level === 'error'
  return true
}

function shouldSendToServer(level: CartDebugLevel): boolean {
  if (level === 'warn' || level === 'error') return true
  return isCartDebugEnabled()
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (existing) return existing
    const created =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(16).slice(2)
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, created)
    return created
  } catch {
    return 'unknown'
  }
}

function serializeError(error: unknown): Record<string, unknown> | undefined {
  if (error == null) return undefined
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }
  return { value: String(error) }
}

function sanitizeData(data: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!data) return undefined

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'email' && typeof value === 'string') {
      const [local, domain] = value.split('@')
      sanitized[key] = domain ? `${local.slice(0, 2)}***@${domain}` : '***'
      continue
    }
    if (key === 'phone' && typeof value === 'string') {
      sanitized[key] = value.length > 4 ? `***${value.slice(-4)}` : '***'
      continue
    }
    sanitized[key] = value
  }
  return sanitized
}

function writeToConsole(payload: CartDebugPayload, level: CartDebugLevel): void {
  const prefix = `[${payload.scope}][${payload.event}]`
  const details = {
    ...sanitizeData(payload.data),
    error: serializeError(payload.error),
  }

  switch (level) {
    case 'error':
      console.error(prefix, details)
      break
    case 'warn':
      console.warn(prefix, details)
      break
    case 'info':
      console.info(prefix, details)
      break
    default:
      console.debug(prefix, details)
  }
}

function scheduleFlush(): void {
  if (flushTimer != null) return
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    void flushQueue()
  }, 1500)
}

async function flushQueue(): Promise<void> {
  if (queue.length === 0 || typeof window === 'undefined') return

  const toSend = queue
  queue = []

  try {
    await fetch(CLIENT_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getOrCreateSessionId(),
        path: window.location.pathname,
        userAgent: navigator.userAgent,
        events: toSend.map((event) => ({
          ...event,
          level: event.level ?? 'info',
          data: sanitizeData(event.data),
          error: serializeError(event.error),
          occurredAt: new Date().toISOString(),
        })),
      }),
      keepalive: true,
    })
  } catch {
    // Avoid recursive logging noise in production.
  }
}

export function logCartDebug(payload: CartDebugPayload): void {
  const level = payload.level ?? 'info'

  if (shouldLogToConsole(level)) {
    writeToConsole(payload, level)
  }

  if (typeof window === 'undefined' || !shouldSendToServer(level)) return

  queue.push({ ...payload, level })
  scheduleFlush()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (queue.length === 0) return
    const toSend = queue
    queue = []
    try {
      navigator.sendBeacon(
        CLIENT_LOG_ENDPOINT,
        JSON.stringify({
          sessionId: getOrCreateSessionId(),
          path: window.location.pathname,
          userAgent: navigator.userAgent,
          events: toSend.map((event) => ({
            ...event,
            level: event.level ?? 'info',
            data: sanitizeData(event.data),
            error: serializeError(event.error),
            occurredAt: new Date().toISOString(),
          })),
        })
      )
    } catch {
      // ignore
    }
  })
}
