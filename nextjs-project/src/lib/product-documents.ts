import type { ProductDocumentType } from '@prisma/client'

export const PRODUCT_DOCUMENT_TYPE_META: Record<
  ProductDocumentType,
  { label: string; order: number }
> = {
  CERTIFICATE: { label: 'Сертификат', order: 10 },
  DECLARATION: { label: 'Декларация соответствия', order: 20 },
  TEST_REPORT: { label: 'Протокол испытаний', order: 30 },
  INSTRUCTION: { label: 'Инструкция', order: 40 },
  LABEL: { label: 'Маркировка', order: 50 },
  OTHER: { label: 'Другой документ', order: 60 },
}

export const PRODUCT_DOCUMENT_TYPE_OPTIONS = Object.entries(PRODUCT_DOCUMENT_TYPE_META).map(
  ([value, meta]) => ({
    value: value as ProductDocumentType,
    label: meta.label,
  })
)

export function getProductDocumentTypeLabel(type: ProductDocumentType): string {
  return PRODUCT_DOCUMENT_TYPE_META[type].label
}

export function getProductDocumentTypeOrder(type: ProductDocumentType): number {
  return PRODUCT_DOCUMENT_TYPE_META[type].order
}

export function isLegacyDocumentSectionTitle(title: string | null | undefined): boolean {
  const normalized = (title ?? '').trim().toLocaleLowerCase('ru')
  if (!normalized) return false
  return normalized.includes('документ')
}

export function formatDocumentFileSize(fileSize: number | null | undefined): string | null {
  if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || fileSize <= 0) return null
  if (fileSize < 1024) return `${fileSize} Б`
  if (fileSize < 1024 * 1024) return `${(fileSize / 1024).toFixed(1)} КБ`
  return `${(fileSize / (1024 * 1024)).toFixed(1)} МБ`
}

export function formatDocumentDate(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('ru-RU').format(date)
}
