import { z } from 'zod'

const productDocumentTypeSchema = z.enum([
  'CERTIFICATE',
  'DECLARATION',
  'TEST_REPORT',
  'INSTRUCTION',
  'LABEL',
  'OTHER',
])

const optionalTrimmedString = z
  .string()
  .transform((value) => value.trim())
  .nullable()
  .optional()

const optionalDateString = z
  .string()
  .trim()
  .nullable()
  .optional()
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), 'Некорректная дата')

const baseDocumentMutationSchema = z
  .object({
    title: z.string().trim().min(1, 'Название документа обязательно'),
    type: productDocumentTypeSchema,
    documentNumber: optionalTrimmedString,
    issuedAt: optionalDateString,
    expiresAt: optionalDateString,
    sortOrder: z.number().int('Порядок должен быть целым числом').default(0),
    isPublished: z.boolean().default(true),
    fileUrl: z.string().trim().min(1).optional(),
    fileName: optionalTrimmedString,
    originalName: optionalTrimmedString,
    mimeType: optionalTrimmedString,
    fileSize: z.number().int().nonnegative().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.issuedAt && value.expiresAt) {
      const issuedAt = new Date(value.issuedAt)
      const expiresAt = new Date(value.expiresAt)
      if (issuedAt.getTime() > expiresAt.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expiresAt'],
          message: 'Дата окончания не может быть раньше даты выдачи',
        })
      }
    }
  })

export const createProductDocumentSchema = baseDocumentMutationSchema.safeExtend({
  productId: z.string().trim().min(1, 'Товар обязателен'),
  fileUrl: z.string().trim().min(1, 'Сначала загрузите файл'),
  mimeType: z.string().trim().min(1, 'Не удалось определить MIME файла').optional(),
  fileSize: z.number().int().nonnegative(),
})

export const updateProductDocumentSchema = baseDocumentMutationSchema.safeExtend({
  id: z.string().trim().min(1, 'Document ID is required'),
})

export const attachProductDocumentSchema = z.object({
  productId: z.string().trim().min(1, 'Товар обязателен'),
  documentId: z.string().trim().min(1, 'Документ обязателен'),
  sortOrder: z.number().int('Порядок должен быть целым числом').default(0),
})

export const detachProductDocumentSchema = z.object({
  productId: z.string().trim().min(1, 'Товар обязателен'),
  documentId: z.string().trim().min(1, 'Документ обязателен'),
})

export const reorderProductDocumentsSchema = z.object({
  productId: z.string().trim().min(1, 'Товар обязателен'),
  items: z
    .array(
      z.object({
        documentId: z.string().trim().min(1, 'Документ обязателен'),
        sortOrder: z.number().int('Порядок должен быть целым числом'),
      })
    )
    .min(1, 'Нет документов для сортировки'),
})

export const deleteProductDocumentSchema = z.object({
  id: z.string().trim().min(1, 'Document ID is required'),
})

export const adminProductDocumentQuerySchema = z.object({
  productId: z.string().trim().min(1).optional(),
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
})
