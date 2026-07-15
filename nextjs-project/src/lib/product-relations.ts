import type { ProductRelationType } from '@prisma/client'

export interface ProductRelationViewConfig {
  title: string
  order: number
}

export const PRODUCT_RELATION_CONFIG: Record<ProductRelationType, ProductRelationViewConfig> = {
  RECOMMENDED: {
    title: 'Рекомендуем также',
    order: 10,
  },
  CROSS_SELL: {
    title: 'С этим товаром покупают',
    order: 20,
  },
  UPSELL: {
    title: 'Можно выбрать больше',
    order: 30,
  },
  ALTERNATIVE: {
    title: 'Альтернативные варианты',
    order: 40,
  },
  BUNDLE: {
    title: 'Дополните набор',
    order: 50,
  },
  RELATED: {
    title: 'Похожие товары',
    order: 60,
  },
}

export const PRODUCT_RELATION_TYPE_OPTIONS = (
  Object.entries(PRODUCT_RELATION_CONFIG) as Array<[ProductRelationType, ProductRelationViewConfig]>
)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([value, config]) => ({ value, label: config.title }))

export function getProductRelationConfig(type: ProductRelationType): ProductRelationViewConfig {
  return PRODUCT_RELATION_CONFIG[type]
}
