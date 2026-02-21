import { z } from 'zod'

/** Тип доставки: до ПВЗ или до адреса */
export const cdekDeliveryKindSchema = z.enum(['pvz', 'address'])

/** Тело запроса расчёта доставки СДЭК по товарам в корзине */
export const cdekCalculatorBodySchema = z.object({
  /** Тип доставки: До ПВЗ или До адреса */
  deliveryKind: cdekDeliveryKindSchema.optional().default('pvz'),
  /** Товары: productId и количество */
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, 'Укажите хотя бы один товар')
    .max(50),
  /** Куда везём: код города СДЭК или индекс */
  toLocation: z.object({
    /** Код города СДЭК (из справочника) */
    cityCode: z.number().int().positive().optional(),
    /** Почтовый индекс (если нет cityCode) */
    postalCode: z.string().min(1).max(20).optional(),
  }).refine((data) => data.cityCode != null || (data.postalCode != null && data.postalCode.trim() !== ''), {
    message: 'Укажите код города (cityCode) или почтовый индекс (postalCode)',
  }),
})

export type CdekCalculatorBody = z.infer<typeof cdekCalculatorBodySchema>
