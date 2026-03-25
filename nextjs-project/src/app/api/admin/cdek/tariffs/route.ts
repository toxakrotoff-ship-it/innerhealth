import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { resolveBrandFromRequest } from '@/lib/brand/brand-request'
import * as settingsService from '@/services/settings.service'
import {
  calculateCdekTariffList,
  searchCdekDeliveryPoints,
  getCdekCities,
  CDEK_TARIFF_CODES_ADDRESS,
  CDEK_TARIFF_CODES_PVZ,
  type CdekCredentials,
  type CdekLocation,
  type CdekPackage,
  getDefaultCdekPackage,
} from '@/lib/cdek'
import { CDEK_TARIFF_CODE_TO_DESCRIPTION } from '@/lib/cdek-tariff-codes'

type TariffMap = Record<number, string>

function parsePositiveIntOrNull(value: string | null): number | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

async function resolveSenderCityCode(params: {
  creds: CdekCredentials
  cdekFromPvzCode: string
  cdekFromCityCode: string
  senderAddress: string
}): Promise<number | null> {
  const { creds, cdekFromPvzCode, cdekFromCityCode, senderAddress } = params
  const fromPostalCode = senderAddress.match(/\b\d{6}\b/)?.[0] ?? null

  if (cdekFromCityCode) {
    const fromCode = Number.parseInt(cdekFromCityCode, 10)
    if (!Number.isNaN(fromCode) && fromCode > 0) return fromCode
  }

  if (!cdekFromPvzCode) return null

  const points =
    (await (async (): Promise<Array<{ city_code?: number }>> => {
      const first = await searchCdekDeliveryPoints({ filter: { code: cdekFromPvzCode }, size: 1 }, creds)
      if (first.length > 0) return first
      const second = await searchCdekDeliveryPoints(
        { filter: { code: cdekFromPvzCode, type: 'PVZ' }, size: 1 },
        creds
      )
      if (second.length > 0) return second
      const third = await searchCdekDeliveryPoints({ filter: { code: cdekFromPvzCode, type: 'ALL' }, size: 1 }, creds)
      return third
    })()) ?? []

  const cityCode = points[0]?.city_code
  if (cityCode != null && !Number.isNaN(cityCode) && cityCode > 0) return cityCode

  // Если city_code не отдался — можно пробовать резолв через postal_code/город из ПВЗ,
  // но для admin достаточно fallback на null.
  if (!fromPostalCode) return null
  try {
    const cities = await getCdekCities({ country_codes: ['RU'], postal_code: fromPostalCode, size: 1 }, creds)
    const resolved = cities[0]?.code
    if (resolved != null && !Number.isNaN(resolved) && resolved > 0) return resolved
  } catch {
    // ignore and fallback
  }
  return null
}

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveBrandFromRequest(request)
  const creds = await settingsService.getCdekCredentials({ brandId })
  if (!creds) {
    return NextResponse.json(
      { source: 'fallback', pvz: CDEK_TARIFF_CODE_TO_DESCRIPTION, address: CDEK_TARIFF_CODE_TO_DESCRIPTION },
      { status: 400 }
    )
  }

  const url = new URL(request.url)
  const toCityCodeParam = parsePositiveIntOrNull(url.searchParams.get('toCityCode'))

  const [cdekSenderSettings, packageSettings] = await Promise.all([
    settingsService.getSettingsMap(['cdek_from_pvz_code', 'cdek_from_city_code', 'cdek_sender_address'], { brandId }),
    settingsService.getSettingsMap(
      [
        'cdek_default_package_weight_g',
        'cdek_default_package_length_mm',
        'cdek_default_package_width_mm',
        'cdek_default_package_height_mm',
      ],
      { brandId }
    ),
  ])

  const cdekFromPvzCode = cdekSenderSettings.cdek_from_pvz_code?.trim().toUpperCase() ?? ''
  let cdekFromCityCode = cdekSenderSettings.cdek_from_city_code?.trim() ?? ''
  let senderAddress = cdekSenderSettings.cdek_sender_address?.trim() ?? ''

  // Global fallback if brand-scoped sender config missing.
  if (!cdekFromCityCode || !senderAddress) {
    const globalSettings = await settingsService.getSettingsMap(
      ['cdek_from_city_code', 'cdek_sender_address'],
      {}
    )
    cdekFromCityCode = cdekFromCityCode || globalSettings.cdek_from_city_code?.trim() || ''
    senderAddress = senderAddress || globalSettings.cdek_sender_address?.trim() || ''
  }

  const senderCityCode = await resolveSenderCityCode({
    creds,
    cdekFromPvzCode,
    cdekFromCityCode,
    senderAddress,
  })

  const fallbackPackage = getDefaultCdekPackage()
  const packageDefaults = {
    weightG: parsePositiveIntOrNull(packageSettings.cdek_default_package_weight_g) ?? fallbackPackage.weight,
    lengthMm: parsePositiveIntOrNull(packageSettings.cdek_default_package_length_mm) ?? fallbackPackage.length,
    widthMm: parsePositiveIntOrNull(packageSettings.cdek_default_package_width_mm) ?? fallbackPackage.width,
    heightMm: parsePositiveIntOrNull(packageSettings.cdek_default_package_height_mm) ?? fallbackPackage.height,
  }
  const testPackage: CdekPackage = {
    weight: packageDefaults.weightG,
    length: packageDefaults.lengthMm,
    width: packageDefaults.widthMm,
    height: packageDefaults.heightMm,
  }

  const toCode = toCityCodeParam ?? senderCityCode
  if (!toCode) {
    return NextResponse.json(
      {
        source: 'fallback',
        pvz: CDEK_TARIFF_CODE_TO_DESCRIPTION,
        address: CDEK_TARIFF_CODE_TO_DESCRIPTION,
        error: 'toCityCode not provided and senderCityCode not resolved',
      },
      { status: 200 }
    )
  }

  // sender location
  const fromLocation: CdekLocation = {
    ...(senderCityCode ? { code: senderCityCode } : {}),
    country_code: 'RU',
    ...(cdekFromPvzCode ? { delivery_point: cdekFromPvzCode } : {}),
  }

  const toLocation: CdekLocation = { country_code: 'RU', code: toCode }

  // Helper to build code->description mapping.
  const buildMap = (tariffs: Array<{ tariff_code: number; tariff_description?: string; tariff_name?: string }>): TariffMap =>
    tariffs.reduce((acc, t) => {
      const label = t.tariff_description?.trim() || t.tariff_name?.trim() || String(t.tariff_code)
      acc[t.tariff_code] = label
      return acc
    }, {} as TariffMap)

  try {
    const [pvzTariffs, addressTariffs] = await Promise.all([
      calculateCdekTariffList(
        {
          from_location: fromLocation,
          to_location: toLocation,
          packages: [testPackage],
          type: 1,
          currency: 1,
          lang: 'rus',
          services: [],
          tariff_codes: CDEK_TARIFF_CODES_PVZ,
        },
        creds
      ),
      calculateCdekTariffList(
        {
          from_location: fromLocation,
          to_location: toLocation,
          packages: [testPackage],
          type: 1,
          currency: 1,
          lang: 'rus',
          services: [],
          tariff_codes: CDEK_TARIFF_CODES_ADDRESS,
        },
        creds
      ),
    ])

    return NextResponse.json({
      source: 'api',
      pvz: buildMap(pvzTariffs as Array<{ tariff_code: number; tariff_description?: string; tariff_name?: string }>),
      address: buildMap(
        addressTariffs as Array<{ tariff_code: number; tariff_description?: string; tariff_name?: string }>
      ),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    // Even if API is failing right now, admin should still have meaningful labels.
    console.warn('[cdek/admin/tariffs] fallback due to error', { message })
    return NextResponse.json(
      {
        source: 'fallback',
        pvz: CDEK_TARIFF_CODE_TO_DESCRIPTION,
        address: CDEK_TARIFF_CODE_TO_DESCRIPTION,
        error: message,
      },
      { status: 200 }
    )
  }
}

