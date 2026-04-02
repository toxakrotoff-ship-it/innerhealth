import { NextResponse } from 'next/server'
import * as productService from '@/services/product.service'
import * as settingsService from '@/services/settings.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import {
  calculateCdekTariffList,
  productToCdekPackage,
  mergeCdekPackages,
  filterTariffsByDeliveryKind,
  getCdekCities,
  CDEK_TARIFF_CODES_ADDRESS,
  CDEK_TARIFF_CODES_PVZ,
  resolveCdekSenderSettings,
  type CdekLocation,
} from '@/lib/cdek'
import { cdekCalculatorBodySchema } from '@/lib/validations/cdek'

/**
 * POST /api/cdek/calculator
 * Калькулятор СДЭК (https://apidoc.cdek.ru/#tag/calculator).
 * Тело: { deliveryKind?, items, toLocation: { cityCode?, postalCode } }
 * Возвращает список тарифов с ценой и сроками доставки.
 *
 * Промокод не влияет на расчёт СДЭК: в запрос передаются только состав корзины (productId, quantity)
 * и направление доставки. Стоимость доставки считается по весу и габаритам товаров, без учёта суммы заказа и скидок.
 */
export async function POST(request: Request) {
  try {
    const brandId = resolveBrandOrDefaultFromRequest(request)
    const cdekCredentials = await settingsService.getCdekCredentials({ brandId })
    const raw = await request.json()
    const parsed = cdekCalculatorBodySchema.safeParse(raw)
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors
      const message = Object.values(first)[0]?.[0] ?? parsed.error.message
      return NextResponse.json(
        { error: message },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }
    const { items, toLocation, deliveryKind } = parsed.data

    const productIds = Array.from(new Set(items.map((i) => i.productId)))
    const products = await productService.getProductsForCdek(productIds)
    const productMap = new Map(products.map((p) => [p.id, p]))

    const parsePositiveIntOrNull = (raw: string | undefined): number | null => {
      const trimmed = raw?.trim()
      if (!trimmed) return null
      const parsed = Number.parseInt(trimmed, 10)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null
    }

    const packageSettings = await settingsService.getSettingsMap(
      [
        'cdek_default_package_weight_g',
        'cdek_default_package_length_mm',
        'cdek_default_package_width_mm',
        'cdek_default_package_height_mm',
      ],
      { brandId }
    )

    const brandDefaults = {
      weightG: parsePositiveIntOrNull(packageSettings.cdek_default_package_weight_g),
      lengthMm: parsePositiveIntOrNull(packageSettings.cdek_default_package_length_mm),
      widthMm: parsePositiveIntOrNull(packageSettings.cdek_default_package_width_mm),
      heightMm: parsePositiveIntOrNull(packageSettings.cdek_default_package_height_mm),
    }

    const needsGlobalDefaults =
      brandDefaults.weightG == null ||
      brandDefaults.lengthMm == null ||
      brandDefaults.widthMm == null ||
      brandDefaults.heightMm == null

    const globalDefaultsSettings = needsGlobalDefaults
      ? await settingsService.getSettingsMap(
          [
            'cdek_default_package_weight_g',
            'cdek_default_package_length_mm',
            'cdek_default_package_width_mm',
            'cdek_default_package_height_mm',
          ],
          {}
        )
      : null

    const globalDefaults = globalDefaultsSettings
      ? {
          weightG: parsePositiveIntOrNull(globalDefaultsSettings.cdek_default_package_weight_g),
          lengthMm: parsePositiveIntOrNull(globalDefaultsSettings.cdek_default_package_length_mm),
          widthMm: parsePositiveIntOrNull(globalDefaultsSettings.cdek_default_package_width_mm),
          heightMm: parsePositiveIntOrNull(globalDefaultsSettings.cdek_default_package_height_mm),
        }
      : null

    const packageDefaults = {
      weightG: brandDefaults.weightG ?? globalDefaults?.weightG ?? 100,
      lengthMm: brandDefaults.lengthMm ?? globalDefaults?.lengthMm ?? 33,
      widthMm: brandDefaults.widthMm ?? globalDefaults?.widthMm ?? 25,
      heightMm: brandDefaults.heightMm ?? globalDefaults?.heightMm ?? 15,
    }

    const packages = mergeCdekPackages(
      items.flatMap((item) => {
        const product = productMap.get(item.productId)
        if (!product) return []
        return [
          productToCdekPackage(
            product.weight,
            product.length,
            product.width,
            product.height,
            item.quantity,
            packageDefaults
          ),
        ]
      })
    )

    if (packages.length === 0) {
      return NextResponse.json(
        { error: 'Не удалось сформировать посылки по выбранным товарам' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    const cdekSettings = await settingsService.getSettingsMap(
      [
        'cdek_preferred_tariff_code_pvz',
        'cdek_preferred_tariff_code_address',
      ],
      { brandId }
    )

    const preferredTariffRaw =
      deliveryKind === 'pvz'
        ? cdekSettings.cdek_preferred_tariff_code_pvz
        : cdekSettings.cdek_preferred_tariff_code_address

    const preferredTariffParsed = (() => {
      const trimmed = preferredTariffRaw?.trim()
      if (!trimmed) return null
      const parsed = Number.parseInt(trimmed, 10)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null
    })()

    const tariffCodesForRequest =
      (() => {
        const baseCodes = deliveryKind === 'pvz' ? CDEK_TARIFF_CODES_PVZ : CDEK_TARIFF_CODES_ADDRESS
        if (preferredTariffParsed == null) return baseCodes
        return [preferredTariffParsed, ...baseCodes.filter((c) => c !== preferredTariffParsed)]
      })()

    const senderSettingsResult = await resolveCdekSenderSettings({
      brandId,
      overrideCredentials: cdekCredentials,
      validatePvzCity: true,
    })
    if (!senderSettingsResult.ok) {
      const errorMessage =
        'error' in senderSettingsResult ? senderSettingsResult.error : 'CDEK sender settings error'
      return NextResponse.json(
        { error: errorMessage },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    const senderSettings = senderSettingsResult.settings
    const fromPostalCode = senderSettings.fromPostalCode
    const fromLocationBase: CdekLocation = senderSettings.calculatorFromLocation
    const fromLocation: CdekLocation = fromLocationBase

    console.warn('[cdek/calculator] sender location resolved for calculation', {
      brandId,
      scopeUsed: senderSettings.scopeUsed,
      fromPvzCode: senderSettings.fromPvzCode,
      fromCityCode: senderSettings.fromCityCode,
      senderAddress: senderSettings.senderAddress,
      fromPostalCode,
      fromLocation,
    })

    const toBase: CdekLocation =
      toLocation.cityCode != null
        ? { code: toLocation.cityCode }
        : { postal_code: String(toLocation.postalCode ?? '').trim() }
    const to: CdekLocation = toBase

    let allTariffs: Awaited<ReturnType<typeof calculateCdekTariffList>>
    try {
      allTariffs = await calculateCdekTariffList(
        {
          from_location: fromLocation,
          to_location: to,
          packages,
          type: 2,
          currency: 1,
          lang: 'rus',
          tariff_codes: tariffCodesForRequest,
        },
        cdekCredentials
      )

      // Иногда СДЭК возвращает 200 OK, но пустой список тарифов, если location задан через `code`.
      // В таких случаях более надёжно работает `postal_code`.
      if (allTariffs.length === 0 && toLocation.cityCode != null) {
        const cities = await getCdekCities(
          { country_codes: ['RU'], code: toLocation.cityCode, size: 20, page: 0 },
          cdekCredentials
        )
        const postalCodeCandidates: string[] = cities.flatMap((city) => {
          const postalCodesArray = city.postal_codes
          const rawPostalCodeField = (city as unknown as { postal_code?: unknown; postalCode?: unknown })
          const postalCodeFromField =
            typeof rawPostalCodeField.postal_code === 'string'
              ? rawPostalCodeField.postal_code
              : typeof rawPostalCodeField.postalCode === 'string'
                ? rawPostalCodeField.postalCode
                : undefined

          return [...(Array.isArray(postalCodesArray) ? postalCodesArray : []), postalCodeFromField]
        })

        const postalCode = postalCodeCandidates
          .filter((p): p is string => typeof p === 'string')
          .map((p) => p.trim())
          .find((p) => p.length > 0)

        if (postalCode) {
          console.warn('[cdek/calculator] empty tariffs; retry with to_location.postal_code', {
            cityCode: toLocation.cityCode,
            postalCode,
          })
          allTariffs = await calculateCdekTariffList(
            {
              from_location: fromLocation,
              to_location: { postal_code: String(postalCode) },
              packages,
              type: 2,
              currency: 1,
              lang: 'rus',
              tariff_codes: tariffCodesForRequest,
            },
            cdekCredentials
          )
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (fromPostalCode && msg.includes('v2_sender_location_not_recognized')) {
        console.warn('[cdek/calculator] retry with from_location.postal_code due to unrecognized sender location')
        allTariffs = await calculateCdekTariffList(
          {
            from_location: { postal_code: fromPostalCode, country_code: 'RU' },
            to_location: to,
            packages,
            type: 1,
            currency: 1,
            lang: 'rus',
            tariff_codes: tariffCodesForRequest,
          },
          cdekCredentials
        )
      } else if (msg.includes('v2_internal_error')) {
        // В тестовом контуре "internal error" может быть из-за несоответствия контракта
        // (ключи полей / casing / формат location).
        // Делаем несколько мягких попыток, логируя каждую.
        const attempts: Array<() => Promise<typeof allTariffs>> = []
        attempts.push(async () => {
          console.warn('[cdek/calculator] retry v2_internal_error: simplified from_location (code)')
          return calculateCdekTariffList(
            {
              from_location: fromLocationBase,
              to_location: to,
              packages,
              type: 1,
              currency: 1,
              lang: 'rus',
              tariff_codes: tariffCodesForRequest,
            },
            cdekCredentials
          )
        })

        attempts.unshift(async () => {
          console.warn('[cdek/calculator] retry v2_internal_error: tariff_codes omitted (keep from_location)')
          return calculateCdekTariffList(
            {
              from_location: fromLocation,
              to_location: to,
              packages,
              type: 1,
              currency: 1,
              lang: 'rus',
            },
            cdekCredentials
          )
        })

        attempts.push(async () => {
          if (toLocation.cityCode == null) throw new Error('toLocation.cityCode is missing')
          console.warn('[cdek/calculator] retry v2_internal_error: to_location via postal_code resolved from city_code', {
            cityCode: toLocation.cityCode,
          })

          const cities = await getCdekCities(
            // Берем побольше элементов: иногда для `code` поле с почтовыми индексами
            // возвращается только в части результатов.
            { country_codes: ['RU'], code: toLocation.cityCode, size: 20, page: 0 },
            cdekCredentials
          )

          const postalCodeCandidates: string[] = cities.flatMap((city) => {
            const postalCodesArray = city.postal_codes
            const rawPostalCodeField = (city as unknown as { postal_code?: unknown; postalCode?: unknown })
            const postalCodeFromField =
              typeof rawPostalCodeField.postal_code === 'string'
                ? rawPostalCodeField.postal_code
                : typeof rawPostalCodeField.postalCode === 'string'
                  ? rawPostalCodeField.postalCode
                  : undefined

            return [
              ...(Array.isArray(postalCodesArray) ? postalCodesArray : []),
              postalCodeFromField,
            ]
          })

          const postalCode = postalCodeCandidates
            .filter((p): p is string => typeof p === 'string')
            .map((p) => p.trim())
            .find((p) => p.length > 0)
          if (!postalCode) throw new Error('postalCode not resolved for toLocation.cityCode')

          return calculateCdekTariffList(
            {
              from_location: fromLocationBase,
              to_location: { postal_code: String(postalCode), country_code: 'RU' },
              packages,
              type: 1,
              currency: 1,
              lang: 'rus',
              tariff_codes: tariffCodesForRequest,
            },
            cdekCredentials
          )
        })

        attempts.push(async () => {
          console.warn('[cdek/calculator] retry v2_internal_error: from/to without country_code')
          return calculateCdekTariffList(
            {
              from_location: fromLocationBase.code != null ? { code: fromLocationBase.code } : fromLocationBase.postal_code
                ? { postal_code: fromPostalCode }
                : {},
              to_location: (toLocation.cityCode != null
                ? { code: toLocation.cityCode }
                : { postal_code: String(toLocation.postalCode ?? '').trim() }) as CdekLocation,
              packages,
              type: 1,
              currency: 1,
              lang: 'rus',
              tariff_codes: tariffCodesForRequest,
            },
            cdekCredentials
          )
        })

        attempts.push(async () => {
          if (!fromPostalCode) throw new Error('fromPostalCode is missing for retry')
          console.warn('[cdek/calculator] retry v2_internal_error: from_location.postal_code')
          return calculateCdekTariffList(
            {
              from_location: { postal_code: fromPostalCode, country_code: 'RU' },
              to_location: to,
              packages,
              type: 1,
              currency: 1,
              lang: 'rus',
              tariff_codes: tariffCodesForRequest,
            },
            cdekCredentials
          )
        })

        let lastErr: unknown = err
        for (const attempt of attempts) {
          try {
            allTariffs = await attempt()
            lastErr = null
            break
          } catch (e2) {
            lastErr = e2
            const msg2 = e2 instanceof Error ? e2.message : String(e2)
            console.warn('[cdek/calculator] v2_internal_error retry attempt failed', { msg2 })
          }
        }
        if (lastErr) throw lastErr
      } else {
        throw err
      }
    }

    const tariffs = filterTariffsByDeliveryKind(allTariffs, deliveryKind)

    const preferredRaw =
      deliveryKind === 'pvz'
        ? cdekSettings.cdek_preferred_tariff_code_pvz
        : cdekSettings.cdek_preferred_tariff_code_address

    const preferredParsed = (() => {
      const trimmed = preferredRaw?.trim()
      if (!trimmed) return null
      const parsed = Number.parseInt(trimmed, 10)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null
    })()

    const tariffsWithPreference =
      preferredParsed != null && tariffs.some((t) => t.tariff_code === preferredParsed)
        ? [
            ...tariffs.filter((t) => t.tariff_code === preferredParsed),
            ...tariffs.filter((t) => t.tariff_code !== preferredParsed),
          ]
        : tariffs

    return NextResponse.json(
      {
        deliveryKind,
        ...(process.env.NODE_ENV !== 'production'
          ? {
              debug: {
                from_location: fromLocation,
                to_location: to,
                packages,
                tariff_codes: tariffCodesForRequest,
              },
            }
          : {}),
        tariffs: tariffsWithPreference.map((t) => ({
          tariffCode: t.tariff_code,
          tariffName: t.tariff_name,
          deliverySum: t.delivery_sum,
          periodMin: t.period_min,
          periodMax: t.period_max,
        })),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ошибка расчёта доставки СДЭК'
    console.error('CDEK calculator error:', e)
    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}
