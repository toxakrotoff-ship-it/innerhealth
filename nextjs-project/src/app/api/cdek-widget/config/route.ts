import { NextResponse } from 'next/server'
import { z } from 'zod'
import * as productService from '@/services/product.service'
import * as settingsService from '@/services/settings.service'
import { resolveBrandOrDefaultFromRequest } from '@/lib/brand/brand-request'
import { mergeCdekPackages, productToCdekPackage, type CdekLocation } from '@/lib/cdek'

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

export async function POST(request: Request) {
  try {
    const brandId = resolveBrandOrDefaultFromRequest(request)
    const raw = await request.json()
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const cdekSettings = await settingsService.getSettingsMap(
      ['cdek_from_city_code', 'cdek_sender_address'],
      { brandId }
    )

    const senderAddress = cdekSettings.cdek_sender_address?.trim() ?? ''
    const fromPostalCode = senderAddress.match(/\b\d{6}\b/)?.[0]
    const fromCodeRaw = cdekSettings.cdek_from_city_code?.trim()
    const fromCodeParsed = fromCodeRaw ? Number.parseInt(fromCodeRaw, 10) : NaN
    const fromCode = Number.isFinite(fromCodeParsed) && fromCodeParsed > 0 ? fromCodeParsed : undefined

    const from: CdekLocation = {
      ...(fromCode != null ? { code: fromCode } : undefined),
      ...(fromPostalCode ? { postal_code: fromPostalCode } : undefined),
      ...(senderAddress ? { address: senderAddress } : undefined),
      country_code: 'RU',
    }

    const productIds = Array.from(new Set(parsed.data.items.map((i) => i.productId)))
    const products = await productService.getProductsForCdek(productIds)
    const productMap = new Map(products.map((p) => [p.id, p]))

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
        // Widget expects dimensions in centimeters and weight in grams.
        // В проекте исторически габариты часто вводились в см, поэтому передаём как есть.
        width: p?.width ?? 10,
        height: p?.height ?? 10,
        length: p?.length ?? 10,
        weight: p?.weight ?? 100,
      },
    ]

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
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

