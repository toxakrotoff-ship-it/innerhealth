import { z } from 'zod'

export const productRelationTypeSchema = z.enum([
  'RELATED',
  'RECOMMENDED',
  'CROSS_SELL',
  'UPSELL',
  'ALTERNATIVE',
  'BUNDLE',
])

export const createProductRelationSchema = z.object({
  sourceProductId: z.string().trim().min(1, 'Source product is required'),
  targetProductId: z.string().trim().min(1, 'Target product is required'),
  relationType: productRelationTypeSchema,
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
})

export const updateProductRelationSchema = z.object({
  id: z.string().trim().min(1, 'Relation ID is required'),
  relationType: productRelationTypeSchema.optional(),
  sortOrder: z.number().int().optional(),
  isPublished: z.boolean().optional(),
})

export const deleteProductRelationSchema = z.object({
  id: z.string().trim().min(1, 'Relation ID is required'),
})

export const reorderProductRelationsSchema = z.object({
  sourceProductId: z.string().trim().min(1, 'Source product is required'),
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1, 'Relation ID is required'),
        sortOrder: z.number().int(),
      })
    )
    .min(1, 'At least one relation is required'),
})
