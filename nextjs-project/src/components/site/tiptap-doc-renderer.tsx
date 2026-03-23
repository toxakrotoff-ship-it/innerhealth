import Image from 'next/image'
import { Fragment } from 'react'

/** TipTap JSON node (minimal typing for rendering) */
interface TipTapNode {
  type?: string
  content?: TipTapNode[]
  text?: string
  attrs?: {
    level?: number
    src?: string
    alt?: string
    /** TipTap Image extension may store dimensions as number or string */
    width?: number | string | null
    height?: number | string | null
    listStyleType?: string
    markerStyle?: string
    start?: number
  }
  marks?: {
    type: string
    attrs?: {
      href?: string
      target?: string
      rel?: string
    }
  }[]
}

/** Fits column width and caps extreme height (tall portraits) while keeping aspect ratio */
const articleBodyImageClassName =
  'mx-auto block h-auto w-auto max-w-full max-h-[min(85vh,56rem)] rounded-lg bg-gray-100 align-middle'

function parsePositiveInt(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined
  const n = typeof value === 'number' ? value : parseInt(String(value).replace(/px$/i, ''), 10)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.round(n)
}

function renderMarks(
  children: React.ReactNode,
  marks:
    | {
        type: string
        attrs?: {
          href?: string
          target?: string
          rel?: string
        }
      }[]
    | undefined
) {
  if (!marks?.length) return children
  let node: React.ReactNode = children
  for (const mark of marks) {
    if (mark.type === 'bold') node = <strong>{node}</strong>
    else if (mark.type === 'italic') node = <em>{node}</em>
    else if (mark.type === 'underline') node = <u>{node}</u>
    else if (mark.type === 'link' && mark.attrs?.href) {
      const href = mark.attrs.href
      const isExternal = /^https?:\/\//i.test(href)
      node = (
        <a
          href={href}
          target={mark.attrs.target ?? (isExternal ? '_blank' : undefined)}
          rel={mark.attrs.rel ?? (isExternal ? 'noopener noreferrer' : undefined)}
          className="text-blue-700 underline decoration-blue-300 hover:text-blue-800"
        >
          {node}
        </a>
      )
    }
  }
  return node
}

function renderNode(node: TipTapNode, key: number): React.ReactNode {
  if (!node) return null

  const stableKey = `node-${key}-${node.type || 'unknown'}`

  if (node.type === 'text') {
    return <span key={stableKey}>{renderMarks(node.text ?? '', node.marks)}</span>
  }

  const children = node.content?.map((n, i) => renderNode(n, i))

  switch (node.type) {
    case 'paragraph':
      return (
        <p key={stableKey} className="mb-4">
          {children}
        </p>
      )
    case 'heading': {
      const level = node.attrs?.level ?? 1
      const Tag = `h${Math.min(3, Math.max(1, level))}` as 'h1' | 'h2' | 'h3'
      const classMap = {
        h1: 'text-2xl font-bold mt-8 mb-4',
        h2: 'text-xl font-bold mt-6 mb-3',
        h3: 'text-lg font-semibold mt-4 mb-2',
      }
      return (
        <Tag key={stableKey} className={classMap[Tag]}>
          {children}
        </Tag>
      )
    }
    case 'bulletList': {
      const styleType = node.attrs?.listStyleType || 'disc'
      return (
        <ul
          key={stableKey}
          className="mb-4 space-y-1 pl-6 tiptap-list-bullet"
          data-list-style-type={styleType}
        >
          {children}
        </ul>
      )
    }
    case 'orderedList': {
      const markerStyle = node.attrs?.markerStyle || 'decimal'
      const start = node.attrs?.start
      return (
        <ol
          key={stableKey}
          className="mb-4 space-y-1 pl-6 tiptap-list-ordered"
          data-marker-style={markerStyle}
          {...(start !== undefined && start !== 1 ? { start } : {})}
        >
          {children}
        </ol>
      )
    }
    case 'listItem':
      return (
        <li key={stableKey} className="ml-2">
          {children}
        </li>
      )
    case 'image': {
      const src = node.attrs?.src
      if (!src) return null
      const isLocal = typeof src === 'string' && src.startsWith('/')
      const intrinsicW = parsePositiveInt(node.attrs?.width)
      const intrinsicH = parsePositiveInt(node.attrs?.height)
      const hasIntrinsicSize = intrinsicW !== undefined && intrinsicH !== undefined

      return (
        <figure key={stableKey} className="my-6 min-w-0">
          {hasIntrinsicSize ? (
            <Image
              src={src}
              alt={node.attrs?.alt ?? ''}
              width={intrinsicW}
              height={intrinsicH}
              className={articleBodyImageClassName}
              sizes="(max-width: 768px) 100vw, 672px"
              unoptimized={isLocal}
            />
          ) : (
            // Natural aspect ratio; max-w-full + max-h scale down oversized assets inside the article column.
            // Dimensions unknown in stored JSON; native img preserves ratio.
            <img
              src={src}
              alt={node.attrs?.alt ?? ''}
              className={articleBodyImageClassName}
              loading="lazy"
              decoding="async"
            />
          )}
        </figure>
      )
    }
    case 'blockquote':
      return (
        <blockquote
          key={stableKey}
          className="border-l-4 border-gray-300 pl-4 my-4 italic text-gray-700"
        >
          {children}
        </blockquote>
      )
    default:
      return <Fragment key={stableKey}>{children}</Fragment>
  }
}

function renderTipTapDoc(content: TipTapNode | null): React.ReactNode {
  if (!content || content.type !== 'doc' || !Array.isArray(content.content)) {
    return null
  }
  return content.content.map((node, i) => renderNode(node, i))
}

const tiptapListStyles = `
  .tiptap-list-bullet[data-list-style-type="disc"] { list-style-type: disc; }
  .tiptap-list-bullet[data-list-style-type="circle"] { list-style-type: circle; }
  .tiptap-list-bullet[data-list-style-type="square"] { list-style-type: square; }
  .tiptap-list-bullet[data-list-style-type="check"] { list-style-type: none; }
  .tiptap-list-bullet[data-list-style-type="check"] li::before { content: "✓ "; margin-right: 0.25rem; }
  .tiptap-list-bullet[data-list-style-type="star"] { list-style-type: none; }
  .tiptap-list-bullet[data-list-style-type="star"] li::before { content: "★ "; margin-right: 0.25rem; }
  .tiptap-list-ordered { counter-reset: item; list-style-type: none; }
  .tiptap-list-ordered li { counter-increment: item; }
  .tiptap-list-ordered[data-marker-style="decimal"] li::before { content: counters(item, ".") ". "; margin-right: 0.35rem; }
  .tiptap-list-ordered[data-marker-style="decimal-paren"] li::before { content: counters(item, ".") ") "; margin-right: 0.35rem; }
  .tiptap-list-bullet ul, .tiptap-list-bullet ol, .tiptap-list-ordered ul, .tiptap-list-ordered ol { margin-top: 0.25em; padding-left: 1.25rem; }
`

interface TipTapDocRendererProps {
  raw: unknown
}

/**
 * Renders stored TipTap `doc` JSON (or JSON string / plain string fallback).
 */
export function TipTapDocRenderer({ raw }: TipTapDocRendererProps) {
  let normalized: TipTapNode | string | null = raw as TipTapNode | string | null
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object') normalized = parsed as TipTapNode
    } catch {
      normalized = raw
    }
  }

  const doc =
    normalized && typeof normalized === 'object' && (normalized as TipTapNode).type === 'doc'
      ? (normalized as TipTapNode)
      : null
  const tipTapContent = doc ? renderTipTapDoc(doc) : null
  const fallback =
    typeof normalized === 'string' ? (
      <p>{normalized}</p>
    ) : (
      <p className="text-gray-500">Содержимое публикации</p>
    )

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: tiptapListStyles }} />
      <div className="prose prose-gray max-w-none">{tipTapContent ?? fallback}</div>
    </>
  )
}
