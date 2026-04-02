import { z } from 'zod'

const DELIVERY_METHOD_VALUES = ['cdek_pvz', 'cdek_door'] as const
const DELIVERY_METHOD_SCHEMA = z.enum(DELIVERY_METHOD_VALUES)

const baseAddressSchema = z.object({
  label: z.string().min(1, 'Address label is required').max(100).trim(),
  city: z.string().min(1, 'City is required').max(120).trim(),
  postalCode: z.string().max(20).trim().optional(),
  addressLine: z.string().min(1, 'Address line is required').max(300).trim(),
  deliveryMethod: DELIVERY_METHOD_SCHEMA,
  cdekCityCode: z.number().int().positive('CDEK city code is required'),
  cdekCityUuid: z.string().uuid().optional(),
  cdekPvzCode: z.string().max(60).trim().optional(),
  street: z.string().max(120).trim().optional(),
  house: z.string().max(40).trim().optional(),
  apartment: z.string().max(40).trim().optional(),
  entrance: z.string().max(40).trim().optional(),
  floor: z.string().max(20).trim().optional(),
  intercom: z.string().max(40).trim().optional(),
})

function addDeliveryMethodChecks<
  T extends z.ZodType<{
    deliveryMethod?: 'cdek_pvz' | 'cdek_door'
    cdekPvzCode?: string
    street?: string
    house?: string
    addressLine?: string
  }>
>(schema: T) {
  return schema.superRefine((value, context) => {
    if (value.deliveryMethod === 'cdek_pvz') {
      if (!value.cdekPvzCode) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cdekPvzCode'],
          message: 'PVZ code is required for cdek_pvz delivery',
        })
      }
      if (!value.addressLine) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['addressLine'],
          message: 'Address line is required for cdek_pvz delivery',
        })
      }
    }

    if (value.deliveryMethod === 'cdek_door') {
      if (!value.street) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['street'],
          message: 'Street is required for cdek_door delivery',
        })
      }
      if (!value.house) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['house'],
          message: 'House is required for cdek_door delivery',
        })
      }
    }
  })
}

export const createUserAddressBodySchema = addDeliveryMethodChecks(baseAddressSchema)

export const updateUserAddressBodySchema = addDeliveryMethodChecks(
  baseAddressSchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field should be provided for update',
  })
)

export const userAddressParamsSchema = z.object({
  id: z.string().min(1, 'Address id is required'),
})

export type CreateUserAddressBody = z.infer<typeof createUserAddressBodySchema>
export type UpdateUserAddressBody = z.infer<typeof updateUserAddressBodySchema>
export type UserAddressParams = z.infer<typeof userAddressParamsSchema>
