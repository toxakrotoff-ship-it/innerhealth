import { z } from 'zod'

const MAX_ITEMS = 50
const MAX_QUANTITY_PER_ITEM = 99
const MAX_STRING_LENGTH = 500
const EMAIL_MAX = 254
const PHONE_MAX = 30

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'productId обязателен').max(100),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
  price: z.number().min(0).optional(), // server recalculates; client can send for display
})

export const shippingSchema = z.object({
  fullName: z.string().min(1, 'Укажите имя').max(MAX_STRING_LENGTH).trim(),
  phone: z.string().min(1, 'Укажите телефон').max(PHONE_MAX).trim(),
  email: z.string().email('Некорректный email').max(EMAIL_MAX).trim(),
  address: z.string().min(1, 'Укажите адрес').max(MAX_STRING_LENGTH).trim(),
  city: z.string().min(1, 'Укажите город').max(100).trim(),
  zipCode: z.string().max(20).trim(),
  country: z.string().max(100).trim().optional(),
})

export const createOrderBodySchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Корзина пуста').max(MAX_ITEMS),
  total: z.number().min(0),
  promoCodeId: z.string().nullable().optional(),
  /** Стоимость доставки СДЭК (добавляется к сумме заказа) */
  deliverySum: z.number().min(0).optional(),
  shipping: shippingSchema,
})

export type CreateOrderBody = z.infer<typeof createOrderBodySchema>
