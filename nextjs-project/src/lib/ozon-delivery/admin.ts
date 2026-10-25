import 'server-only'
import { NextResponse } from 'next/server'
import { isBrandId, type BrandId } from '@/lib/brand/brand'
import { OzonSettingsError } from './settings'

export function ozonAdminBrand(request: Request): BrandId | null {
  const brand = new URL(request.url).searchParams.get('brand')
  if (!brand) return null
  if (!isBrandId(brand)) throw new OzonSettingsError('Неизвестная витрина')
  return brand
}

export function ozonAdminErrorResponse(error: unknown) {
  return NextResponse.json({ ok: false, error: error instanceof OzonSettingsError ? error.message : 'Не удалось выполнить запрос Ozon. Проверьте сохранённые ключи и доступы приложения.' }, {
    status: error instanceof OzonSettingsError ? 400 : 502, headers: { 'Cache-Control': 'no-store' },
  })
}
