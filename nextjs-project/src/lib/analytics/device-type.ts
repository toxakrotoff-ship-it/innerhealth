/**
 * Классификация устройства для аналитики: UA + touch + запасной вариант по ширине viewport.
 * Не полагается только на innerWidth — иначе планшеты и десктоп в узком окне искажают статистику.
 */

export type AnalyticsDeviceType = 'desktop' | 'mobile' | 'tablet'

export interface DeviceDetectionInput {
  readonly userAgent: string
  readonly maxTouchPoints: number
  readonly innerWidth: number
}

function isIpadFamily(ua: string, maxTouchPoints: number): boolean {
  if (/\biPad\b/i.test(ua)) return true
  // iPadOS 13+: Safari сообщает Macintosh + touch
  if (ua.includes('Macintosh') && maxTouchPoints > 1) return true
  return false
}

function isTabletUserAgent(ua: string, maxTouchPoints: number): boolean {
  if (isIpadFamily(ua, maxTouchPoints)) return true
  if (/Tablet|PlayBook|Silk|Kindle|Nexus 7|Nexus 10|SM-T\d|\bTab\b/i.test(ua)) return true
  // Частый паттерн Android-планшетов: Android без подстроки Mobile
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return true
  return false
}

function isMobileUserAgent(ua: string): boolean {
  return /iPhone|iPod|BlackBerry|IEMobile|Opera Mini|webOS|Android.*Mobile|Mobile.*Safari/i.test(
    ua
  )
}

/**
 * Определяет тип устройства для поля meta.deviceType в событиях PAGE_VIEW.
 */
export function detectAnalyticsDeviceType(
  input: DeviceDetectionInput
): AnalyticsDeviceType {
  if (isTabletUserAgent(input.userAgent, input.maxTouchPoints)) return 'tablet'
  if (isMobileUserAgent(input.userAgent)) return 'mobile'
  if (input.innerWidth >= 1024) return 'desktop'
  return 'mobile'
}
