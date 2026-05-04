import type { Prisma } from '@prisma/client'

interface TipTapDocLike {
  type?: string
  content?: unknown[]
}

function isEmptyParagraphNode(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false
  const n = node as { type?: string; content?: unknown[] }
  if (n.type !== 'paragraph') return false
  return !Array.isArray(n.content) || n.content.length === 0
}

/**
 * Есть ли в TipTap JSON достаточно содержимого, чтобы показывать его вместо кодового fallback юрстраницы.
 * Пустой doc и doc из одного пустого paragraph считаются «пустыми».
 */
export function hasRenderableLegalRichBody(value: Prisma.JsonValue | null | undefined): boolean {
  if (value == null || typeof value !== 'object') return false
  const doc = value as TipTapDocLike
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return false
  if (doc.content.length === 0) return false
  if (doc.content.length === 1 && isEmptyParagraphNode(doc.content[0])) return false
  return true
}
