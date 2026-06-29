import { NextResponse } from 'next/server'
import { z } from 'zod'
import * as productService from '@/services/product.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import {
  mergeCdekPackages,
  productToCdekPackage,
  resolveCdekSenderSettings,
  type CdekLocation,
} from '@/lib/cdek'

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(50),
})

interface WidgetParcel {
  width: number
  height: number
  length: number
  weight: number
}

const WIDGET_FALLBACK_DIMENSION_CM = 1

export async function POST(request: Request) {
  try {
    const brandId = resolveBrandOrDefaultFromRequest(request)
    const raw = await request.json()
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      console.warn('[cdek/widget][config][invalid_body]', {
        brandId,
        issues: parsed.error.issues.map((issue) => issue.message),
      })
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const senderSettingsResult = await resolveCdekSenderSettings({
      brandId,
      validatePvzCity: false,
    })
    if (!senderSettingsResult.ok) {
      const errorMessage =
        'error' in senderSettingsResult ? senderSettingsResult.error : 'CDEK sender settings error'
      console.warn('[cdek/widget][config][sender_settings_failed]', {
        brandId,
        error: errorMessage,
      })
      return NextResponse.json(
        { error: errorMessage },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const fromCode = senderSettingsResult.settings.fromCityCode
    const from: CdekLocation =
      fromCode != null
        ? { code: fromCode, country_code: 'RU' }
        : { country_code: 'RU' }

    const productIds = Array.from(new Set(parsed.data.items.map((i) => i.productId)))
    const products = await productService.getProductsForCdek(productIds)
    const productMap = new Map(products.map((p) => [p.id, p]))
    const missingProductIds = productIds.filter((id) => !productMap.has(id))

    const packages = mergeCdekPackages(
      parsed.data.items.flatMap((item) => {
        const product = productMap.get(item.productId)
        if (!product) return []
        return [
          productToCdekPackage(
            product.weight,
            product.length,
            product.width,
            product.height,
            item.quantity
          ),
        ]
      })
    )

    const p = packages[0]
    const goods: WidgetParcel[] = [
      {
        // Для виджета используем безопасные габариты 1x1x1:
        // это рекомендация СДЭК для сценариев, где точные Д/Ш/В
        // на этапе предварительного расчёта могут быть неточными.
        width: WIDGET_FALLBACK_DIMENSION_CM,
        height: WIDGET_FALLBACK_DIMENSION_CM,
        length: WIDGET_FALLBACK_DIMENSION_CM,
        weight: p?.weight ?? 100,
      },
    ]

    if (missingProductIds.length > 0) {
      console.warn('[cdek/widget][config][missing_products]', {
        brandId,
        missingProductIds,
        requestedCount: productIds.length,
        resolvedCount: products.length,
      })
    }

    console.info('[cdek/widget][config][success]', {
      brandId,
      itemsCount: parsed.data.items.length,
      goodsWeight: goods[0]?.weight ?? null,
      fromCode: from.code ?? null,
    })

    return NextResponse.json(
      {
        from,
        goods,
        tariffs: {
          // Ограничиваем тарифы только теми, которые вы реально используете.
          // office = "до ПВЗ" (склад-склад), door = "до двери" (склад-дверь)
          office: [136],
          door: [137],
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'CDEK widget config error'
    console.error('[cdek/widget][config][error]', { message, error: e })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
