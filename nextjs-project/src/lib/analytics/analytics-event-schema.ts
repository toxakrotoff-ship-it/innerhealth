import { z } from 'zod'

export const analyticsEventTypeSchema = z.enum([
  'PAGE_VIEW',
  'CLICK',
  'CART_ADD',
  'CHECKOUT_START',
  'ORDER_CREATED',
])

export const analyticsEventInputSchema = z.object({
  type: analyticsEventTypeSchema,
  path: z.string().min(1).max(1024),
  occurredAt: z.coerce.date(),
  sessionId: z.string().min(1).max(255).optional(),
  anonId: z.string().min(1).max(255).optional(),
  userId: z.string().min(1).max(255).optional(),
  pageTitle: z.string().min(1).max(512).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
})

export const analyticsEventInputArraySchema = z
  .array(analyticsEventInputSchema)
  .min(1)
  .max(500)

export interface AnalyticsEventInput extends z.infer<typeof analyticsEventInputSchema> {}

