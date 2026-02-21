import { z } from 'zod'

const CODE_MAX_LENGTH = 50

export const validatePromoBodySchema = z.object({
  code: z
    .string()
    .min(1, 'Введите промокод')
    .max(CODE_MAX_LENGTH)
    .transform((s) => s.trim().toUpperCase()),
})

export type ValidatePromoBody = z.infer<typeof validatePromoBodySchema>
