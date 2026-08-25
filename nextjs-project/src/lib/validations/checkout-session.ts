import { z } from 'zod'

const MAX_STRING_LENGTH = 500
const EMAIL_MAX = 254
const PHONE_MAX = 30
const MAX_ITEMS = 50

export const checkoutContactBodySchema = z.object({
  fullName: z.string().trim().min(1).max(MAX_STRING_LENGTH).optional(),
  phone: z.string().trim().min(1).max(PHONE_MAX).optional(),
  email: z.string().trim().min(1).max(EMAIL_MAX).optional(),
})

const checkoutCartItemSnapshotSchema = z.object({
  productId: z.string().min(1).max(100),
  title: z.string().max(MAX_STRING_LENGTH).optional(),
  quantity: z.number().int().min(1).max(999),
  price: z.number().min(0),
})

export const checkoutCartBodySchema = z.object({
  items: z.array(checkoutCartItemSnapshotSchema).max(MAX_ITEMS),
  cartTotal: z.number().min(0).optional(),
  deliveryMethod: z.string().max(50).optional(),
  deliverySum: z.number().min(0).optional(),
  promoCode: z.string().trim().max(50).optional(),
})

export const checkoutDeliveryBodySchema = z.object({
  deliveryMethod: z.string().min(1).max(50),
  deliverySum: z.number().min(0).optional(),
})

export const checkoutPromoBodySchema = z.object({
  promoCode: z.string().trim().min(1).max(50),
})
