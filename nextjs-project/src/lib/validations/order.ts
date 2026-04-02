import { z } from 'zod'
import { validatePhoneRu } from '@/lib/phone-mask'
import { validateEmailReality } from '@/lib/security/email-reality'

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

const doorAddressSchema = z
  .object({
    street: z.string().max(200).trim().optional(),
    house: z.string().max(50).trim().optional(),
    apartment: z.string().max(50).trim().optional(),
    entrance: z.string().max(50).trim().optional(),
    floor: z.string().max(20).trim().optional(),
    intercom: z.string().max(50).trim().optional(),
  })
  .optional()

export const shippingSchema = z.object({
  fullName: z.string().min(1, 'Укажите имя').max(MAX_STRING_LENGTH).trim(),
  phone: z.string().min(1, 'Укажите телефон').max(PHONE_MAX).trim(),
  email: z.string().min(1, 'Укажите email').max(EMAIL_MAX).trim(),
  address: z.string().min(1, 'Укажите адрес').max(MAX_STRING_LENGTH).trim(),
  city: z.string().min(1, 'Укажите город').max(100).trim(),
  zipCode: z.string().max(20).trim(),
  country: z.string().max(100).trim().optional(),
  deliveryMethod: z.enum(['pickup', 'cdek_pvz', 'cdek_door']).nullable().optional(),
  cdekCityCode: z.number().int().positive().nullable().optional(),
  cdekCityUuid: z.string().uuid().nullable().optional(),
  cdekPvzCode: z.string().max(50).nullable().optional(),
  cdekTariffCode: z.number().int().positive().nullable().optional(),
  doorAddress: doorAddressSchema,
})
  .superRefine(async (shipping, ctx) => {
    // Телефон: проверяем не только маску/длину, но и реальную корректность для РФ.
    const phoneRes = validatePhoneRu(shipping.phone)
    if (phoneRes.valid === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: phoneRes.message,
      })
    }

    // Email: синтаксис + запрет disposable + проверка домена по DNS.
    const emailRes = await validateEmailReality(shipping.email)
    if (emailRes.valid === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: emailRes.message,
      })
    }

    if (shipping.deliveryMethod === 'cdek_pvz') {
      if (shipping.cdekCityCode == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cdekCityCode'],
          message: 'Укажите код города СДЭК',
        })
      }
      if (shipping.cdekTariffCode == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cdekTariffCode'],
          message: 'Укажите тариф СДЭК',
        })
      }
      if (!shipping.cdekPvzCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cdekPvzCode'],
          message: 'Выберите пункт выдачи СДЭК',
        })
      }
    }

    if (shipping.deliveryMethod === 'cdek_door') {
      if (shipping.cdekCityCode == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cdekCityCode'],
          message: 'Укажите код города СДЭК',
        })
      }
      if (shipping.cdekTariffCode == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cdekTariffCode'],
          message: 'Укажите тариф СДЭК',
        })
      }
      if (!shipping.address.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['address'],
          message: 'Укажите адрес доставки',
        })
      }
      if (!shipping.doorAddress?.street?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['doorAddress', 'street'],
          message: 'Укажите улицу для доставки СДЭК',
        })
      }
      if (!shipping.doorAddress?.house?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['doorAddress', 'house'],
          message: 'Укажите дом для доставки СДЭК',
        })
      }
    }
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
