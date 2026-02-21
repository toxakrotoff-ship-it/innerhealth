import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  calculateCdekTariffList,
  productToCdekPackage,
  mergeCdekPackages,
  filterTariffsByDeliveryKind,
  type CdekLocation,
} from '@/lib/cdek'
import { cdekCalculatorBodySchema } from '@/lib/validations/cdek'

/**
 * POST /api/cdek/calculator
 * Калькулятор СДЭК (https://apidoc.cdek.ru/#tag/calculator).
 * Тело: { deliveryKind?, items, toLocation: { cityCode?, postalCode } }
 * Возвращает список тарифов с ценой и сроками доставки.
 */
export async function POST(request: Request) {
  try {
    const raw = await request.json()
    const parsed = cdekCalculatorBodySchema.safeParse(raw)
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors
      const message = Object.values(first)[0]?.[0] ?? parsed.error.message
      return NextResponse.json({ error: message }, { status: 400 })
    }
    const { items, toLocation, deliveryKind } = parsed.data

    const productIds = [...new Set(items.map((i) => i.productId))]
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        weight: true,
        length: true,
        width: true,
        height: true,
      },
    })
    const productMap = new Map(products.map((p) => [p.id, p]))

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
            item.quantity
          ),
        ]
      })
    )

    if (packages.length === 0) {
      return NextResponse.json(
        { error: 'Не удалось сформировать посылки по выбранным товарам' },
        { status: 400 }
      )
    }

    const fromCode = process.env.CDEK_FROM_CITY_CODE
    const fromLocation: CdekLocation | undefined = fromCode
      ? { code: Number(fromCode), country_code: 'RU' }
      : undefined

    const to: CdekLocation = {
      country_code: 'RU',
      ...(toLocation.cityCode != null
        ? { code: toLocation.cityCode }
        : { postal_code: String(toLocation.postalCode ?? '').trim() }),
    }

    const allTariffs = await calculateCdekTariffList({
      from_location: fromLocation,
      to_location: to,
      packages,
      type: 1,
      currency: 1,
      lang: 'rus',
    })

    const tariffs = filterTariffsByDeliveryKind(allTariffs, deliveryKind)

    return NextResponse.json({
      deliveryKind,
      tariffs: tariffs.map((t) => ({
        tariffCode: t.tariff_code,
        tariffName: t.tariff_name,
        deliverySum: t.delivery_sum,
        periodMin: t.period_min,
        periodMax: t.period_max,
      })),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Ошибка расчёта доставки СДЭК'
    console.error('CDEK calculator error:', e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
