import { z } from 'zod'
import { sanitizeHumanName, sanitizePhone } from '@/lib/security/input-sanitizers'

const PASSWORD_MIN = 8
const PASSWORD_MAX = 128

export const accountOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
})

export const accountOrderParamsSchema = z.object({
  id: z.string().min(1, 'Order id is required'),
})

export const registerBodySchema = z.object({
  email: z.string().email('Invalid email').trim().toLowerCase(),
  password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
  name: z.string().max(120).trim().optional().transform((v) => (v === undefined ? v : sanitizeHumanName(v))),
  lastName: z.string().max(120).trim().optional().transform((v) => (v === undefined ? v : sanitizeHumanName(v))),
  phone: z.string().max(30).trim().optional().transform((v) => (v === undefined ? v : sanitizePhone(v))),
})

export const verifyEmailRequestBodySchema = z.object({
  email: z.string().email('Invalid email').trim().toLowerCase().optional(),
})

export const verifyEmailConfirmBodySchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
})

export type AccountOrdersQuery = z.infer<typeof accountOrdersQuerySchema>
export type AccountOrderParams = z.infer<typeof accountOrderParamsSchema>
export type RegisterBody = z.infer<typeof registerBodySchema>
export type VerifyEmailRequestBody = z.infer<typeof verifyEmailRequestBodySchema>
export type VerifyEmailConfirmBody = z.infer<typeof verifyEmailConfirmBodySchema>
