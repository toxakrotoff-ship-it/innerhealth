import { NextResponse } from 'next/server'
import * as productService from '@/services/product.service'
import * as settingsService from '@/services/settings.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import {
  calculateCdekTariffList,
  productToCdekPackage,
  mergeCdekPackages,
  filterTariffsByDeliveryKind,
  searchCdekDeliveryPoints,
  getCdekCities,
  CDEK_TARIFF_CODES_ADDRESS,
  CDEK_TARIFF_CODES_PVZ,
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
        'cdek_from_pvz_code',
        'cdek_from_city_code',
        'cdek_sender_address',
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

    const fromPvzCode = cdekSettings.cdek_from_pvz_code?.trim().toUpperCase()
    let fromAdmin = cdekSettings.cdek_from_city_code?.trim()
    let senderAddress = cdekSettings.cdek_sender_address?.trim()
    const fromEnv = process.env.CDEK_FROM_CITY_CODE?.trim()
    if (!fromAdmin || !senderAddress) {
      // Fallback на global scope, если в текущем brand не заполнено.
      // Это особенно важно, когда PVZ-код не резолвится в city_code.
      const globalSettings = await settingsService.getSettingsMap(
        ['cdek_from_city_code', 'cdek_sender_address'],
        {}
      )
      if (!fromAdmin) fromAdmin = globalSettings.cdek_from_city_code?.trim()
      if (!senderAddress) senderAddress = globalSettings.cdek_sender_address?.trim()
    }
    const fromPostalCode = senderAddress?.match(/\b\d{6}\b/)?.[0]
    let fromCode: number | undefined
    if (fromPvzCode && !fromAdmin && !fromEnv) {
      const points =
        (await (async () => {
          const first = await searchCdekDeliveryPoints(
            { filter: { code: fromPvzCode }, size: 1 },
            cdekCredentials
          )
          if (first.length > 0) return first
          const second = await searchCdekDeliveryPoints(
            { filter: { code: fromPvzCode, type: 'PVZ' }, size: 1 },
            cdekCredentials
          )
          if (second.length > 0) return second
          return searchCdekDeliveryPoints(
            { filter: { code: fromPvzCode, type: 'ALL' }, size: 1 },
            cdekCredentials
          )
        })())
      const cityCode = points[0]?.city_code
      if (cityCode != null && !Number.isNaN(cityCode) && cityCode > 0) {
        fromCode = cityCode
      } else {
        // CDEK не всегда возвращает `city_code` при поиске по коду ПВЗ.
        // Тогда пробуем резолвить город через API /location/cities по city/postal_code из найденного ПВЗ.
        const point = points[0]
        const resolvedFromPoint = await (async (): Promise<number | null> => {
          const cityName = point?.city?.trim()
          if (cityName) {
            const cities = await getCdekCities(
              {
                country_codes: ['RU'],
                city: cityName,
                size: 1,
              },
              cdekCredentials
            )
            const code = cities[0]?.code
            return typeof code === 'number' && code > 0 ? code : null
          }
          const postalCode = point?.postal_code?.trim()
          if (postalCode) {
            const cities = await getCdekCities(
              {
                country_codes: ['RU'],
                postal_code: postalCode,
                size: 1,
              },
              cdekCredentials
            )
            const code = cities[0]?.code
            return typeof code === 'number' && code > 0 ? code : null
          }
          return null
        })()

        if (resolvedFromPoint != null) {
          fromCode = resolvedFromPoint
          // Продолжаем расчет с выведенным city_code из ПВЗ.
          console.warn(
            '[cdek/calculator] resolved from_pvz_code via point.city/postal_code:',
            fromPvzCode,
            '->',
            resolvedFromPoint
          )
        } else {
        const fallbackFromCodeRaw = fromAdmin || fromEnv
        if (!fallbackFromCodeRaw) {
            console.warn('[cdek/calculator] cannot resolve from_pvz_code city_code (no fallback)', {
              brandId,
              fromPvzCode,
              fromAdmin,
              fromEnv,
              cityCode,
              pointsCount: points.length,
              pvzSearchInput: { code: fromPvzCode },
              point: {
                city: point?.city,
                postal_code: point?.postal_code,
                city_code: point?.city_code,
                code: point?.code,
                keys: point ? Object.keys(point) : [],
              },
            })
          fromCode = undefined
        }
        const fallbackFromCode = parseInt(fallbackFromCodeRaw, 10)
        if (Number.isNaN(fallbackFromCode) || fallbackFromCode <= 0) {
            console.warn('[cdek/calculator] cannot resolve from_pvz_code city_code (invalid fallbackFromCode)', {
              brandId,
              fromPvzCode,
              fromAdmin,
              fromEnv,
              cityCode,
              fallbackFromCodeRaw,
              fallbackFromCode,
            })
          fromCode = undefined
        }
        console.warn(
          '[cdek/calculator] from_pvz_code is set but city_code was not resolved, fallback to from_city_code:',
          fromPvzCode,
          fallbackFromCode
        )
        fromCode = fallbackFromCode
        }
      }
    } else {
      const fromCodeRaw = fromAdmin || fromEnv
      if (!fromCodeRaw) {
        fromCode = undefined
      }
      const parsedFromCode = parseInt(fromCodeRaw, 10)
      if (Number.isNaN(parsedFromCode) || parsedFromCode <= 0) {
        fromCode = undefined
      }
      fromCode = parsedFromCode
    }

    // Если city_code не удалось получить (например PVZ code не резолвится),
    // попробуем получить city_code через postal_code отправителя.
    if (fromCode == null && fromPostalCode) {
      try {
        const cities = await getCdekCities(
          {
            country_codes: ['RU'],
            postal_code: fromPostalCode,
            size: 1,
          },
          cdekCredentials
        )
        const resolved = cities[0]?.code
        if (resolved != null && Number.isFinite(resolved) && resolved > 0) {
          fromCode = resolved
          console.warn(
            '[cdek/calculator] resolved from city_code via postal_code:',
            fromPostalCode,
            '->',
            resolved
          )
        }
      } catch (err) {
        console.warn('[cdek/calculator] failed to resolve city_code via postal_code:', fromPostalCode)
      }
    }

    const fromLocationBase: CdekLocation =
      fromCode != null && Number.isFinite(fromCode) && fromCode > 0
        ? { code: fromCode }
        : fromPostalCode
          ? { postal_code: fromPostalCode }
          : {}

    // ВАЖНО: для калькулятора НЕ передаём sender delivery_point.
    // На практике это делает расчёт слишком специфичным (привязывает отправление к конкретному ПВЗ)
    // и часто приводит к пустому списку тарифов или internal errors. Для создания отгрузки
    // delivery_point передаётся отдельно в createCdekOrder.
    const fromLocation: CdekLocation = fromLocationBase

    console.warn('[cdek/calculator] sender location resolved for calculation', {
      brandId,
      fromPvzCode,
      fromAdmin,
      fromEnv,
      senderAddress,
      fromPostalCode,
      fromCode,
      fromLocation,
    })

    const toBase: CdekLocation =
      toLocation.cityCode != null
        ? { code: toLocation.cityCode }
        : { postal_code: String(toLocation.postalCode ?? '').trim() }

    // Важно для расчёта "до ПВЗ": передаём код выбранного ПВЗ получателя.
    // Это ближе к тому, как работает Тильда (pickupPointId) и часто критично для наличия тарифов.
    const to: CdekLocation =
      deliveryKind === 'pvz' && toLocation.pvzCode
        ? { ...toBase, delivery_point: toLocation.pvzCode.trim().toUpperCase() }
        : toBase

    if (fromLocation.code == null && fromLocation.postal_code == null) {
      return NextResponse.json(
        {
          error:
            'Не удалось определить город отправки СДЭК. Заполните "Код города отправления СДЭК" или "Адрес отправителя" с почтовым индексом.',
        },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      )
    }

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
