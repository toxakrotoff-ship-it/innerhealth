import 'server-only'
import { NextResponse } from 'next/server'
import { isBrandId, type BrandId } from '@/lib/brand/brand'
import { OzonSettingsError } from './settings'
import { OzonDeliveryError } from './client'

export function ozonAdminBrand(request: Request): BrandId | null {
  const brand = new URL(request.url).searchParams.get('brand')
  if (!brand) return null
  if (!isBrandId(brand)) throw new OzonSettingsError('Неизвестная витрина')
  return brand
}

export function ozonAdminErrorResponse(error: unknown) {
  let message = 'Не удалось выполнить запрос Ozon. Повторите попытку позже.'
  if (error instanceof OzonSettingsError) message = error.message
  else if (error instanceof OzonDeliveryError) {
    const phase = error.phase === 'oauth' ? 'получение токена' : 'вызов Delivery API'
    if (error.failure === 'antibot') message = `Ozon заблокировал запрос защитой от ботов (${phase}). Обратитесь в поддержку Ozon для проверки IP-адреса сервера.`
    else if (error.failure === 'timeout') message = 'Ozon не ответил за отведённое время. Повторите попытку позже.'
    else if (error.failure === 'network') message = `Не удалось соединиться с Ozon (${phase}). Проверьте DNS и доступ сервера к API Ozon.`
    else if (error.failure === 'invalid_response') message = `Ozon вернул неожиданный формат ответа (${phase}). Требуется проверка совместимости интеграции с API.`
    else if (error.failure === 'redirect') message = `Не удалось завершить перенаправление Ozon (${phase}). Требуется проверка доступа сервера к API Ozon.`
    else if (error.status === 401) message = `Ozon отклонил авторизацию (HTTP 401, ${phase}). Проверьте сохранённые Client ID и Client Secret.`
    else if (error.status === 403) message = `Ozon запретил доступ (HTTP 403, ${phase}). Проверьте права приложения и ограничения доступа для IP-адреса сервера.`
    else if (error.status === 400) message = `Ozon отклонил параметры запроса (HTTP 400, ${phase}). Проверьте настройки приложения и совместимость интеграции с API.`
    else if (error.status === 429) message = 'Превышен лимит запросов Ozon (HTTP 429). Повторите попытку позже.'
    else message = `Ошибка Ozon (HTTP ${error.status}, ${phase}). Повторите попытку позже.`
  }
  return NextResponse.json({ ok: false, error: message }, {
    status: error instanceof OzonSettingsError ? 400 : 502, headers: { 'Cache-Control': 'no-store' },
  })
}
