import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/require-admin'
import { resolveAdminBrandFromRequest } from '@/lib/brand/brand-request'
import * as settingsService from '@/services/settings.service'
import {
  calculateCdekTariffList,
  CDEK_TARIFF_CODES_ADDRESS,
  CDEK_TARIFF_CODES_PVZ,
  type CdekLocation,
  type CdekPackage,
  getDefaultCdekPackage,
  resolveCdekSenderSettings,
} from '@/lib/cdek'
import { CDEK_TARIFF_CODE_TO_DESCRIPTION } from '@/lib/cdek-tariff-codes'

type TariffMap = Record<number, string>

function parsePositiveIntOrNull(value: string | null): number | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export async function GET(request: Request) {
  const session = await requireAdminSession()
  if (session instanceof NextResponse) return session

  const brandId = resolveAdminBrandFromRequest(request)
  const creds = await settingsService.getCdekCredentials({ brandId })
  if (!creds) {
    return NextResponse.json(
      { source: 'fallback', pvz: CDEK_TARIFF_CODE_TO_DESCRIPTION, address: CDEK_TARIFF_CODE_TO_DESCRIPTION },
      { status: 400 }
    )
  }

  const url = new URL(request.url)
  const toCityCodeParam = parsePositiveIntOrNull(url.searchParams.get('toCityCode'))

  const [senderSettingsResult, packageSettings] = await Promise.all([
    resolveCdekSenderSettings({
      brandId,
      overrideCredentials: creds,
      validatePvzCity: true,
    }),
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
  const senderSettings = senderSettingsResult.ok ? senderSettingsResult.settings : null

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

  const toCode = toCityCodeParam ?? senderSettings?.fromCityCode ?? null
  if (!toCode) {
    let errorMessage = 'toCityCode not provided and senderCityCode not resolved'
    if ('error' in senderSettingsResult) {
      errorMessage = senderSettingsResult.error
    }
    return NextResponse.json(
      {
        source: 'fallback',
        pvz: CDEK_TARIFF_CODE_TO_DESCRIPTION,
        address: CDEK_TARIFF_CODE_TO_DESCRIPTION,
        error: errorMessage,
      },
      { status: 200 }
    )
  }

  // sender location
  const fromLocation: CdekLocation = {
    ...(senderSettings ? { code: senderSettings.fromCityCode } : {}),
    country_code: 'RU',
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
