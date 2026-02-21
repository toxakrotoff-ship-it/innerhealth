import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'

interface PageProps {
  params: Promise<{ slug: string }>
}

/** TipTap JSON node (minimal typing for rendering) */
interface TipTapNode {
  type?: string
  content?: TipTapNode[]
  text?: string
  attrs?: {
    level?: number
    src?: string
    alt?: string
    listStyleType?: string
    markerStyle?: string
    start?: number
  }
  marks?: { type: string }[]
}

function renderMarks(children: React.ReactNode, marks: { type: string }[] | undefined) {
  if (!marks?.length) return children
  let node: React.ReactNode = children
  for (const mark of marks) {
    if (mark.type === 'bold') node = <strong>{node}</strong>
    else if (mark.type === 'italic') node = <em>{node}</em>
    else if (mark.type === 'underline') node = <u>{node}</u>
  }
  return node
}

function renderNode(node: TipTapNode, key: number): React.ReactNode {
  if (!node) return null

  if (node.type === 'text') {
    return <span key={key}>{renderMarks(node.text ?? '', node.marks)}</span>
  }

  const children = node.content?.map((n, i) => renderNode(n, i))

  switch (node.type) {
    case 'paragraph':
      return <p key={key} className="mb-4">{children}</p>
    case 'heading': {
      const level = node.attrs?.level ?? 1
      const Tag = `h${Math.min(3, Math.max(1, level))}` as 'h1' | 'h2' | 'h3'
      const classMap = { h1: 'text-2xl font-bold mt-8 mb-4', h2: 'text-xl font-bold mt-6 mb-3', h3: 'text-lg font-semibold mt-4 mb-2' }
      return <Tag key={key} className={classMap[Tag]}>{children}</Tag>
    }
    case 'bulletList': {
      const styleType = node.attrs?.listStyleType || 'disc'
      return (
        <ul key={key} className="mb-4 space-y-1 pl-6 news-list-bullet" data-list-style-type={styleType}>
          {children}
        </ul>
      )
    }
    case 'orderedList': {
      const markerStyle = node.attrs?.markerStyle || 'decimal'
      const start = node.attrs?.start
      return (
        <ol
          key={key}
          className="mb-4 space-y-1 pl-6 news-list-ordered"
          data-marker-style={markerStyle}
          {...(start !== undefined && start !== 1 ? { start } : {})}
        >
          {children}
        </ol>
      )
    }
    case 'listItem':
      return <li key={key} className="ml-2">{children}</li>
    case 'image': {
      const src = node.attrs?.src
      if (!src) return null
      return (
        <figure key={key} className="my-6">
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
            <Image src={src} alt={node.attrs?.alt ?? ''} fill className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
          </div>
        </figure>
      )
    }
    case 'blockquote':
      return <blockquote key={key} className="border-l-4 border-gray-300 pl-4 my-4 italic text-gray-700">{children}</blockquote>
    default:
      return <span key={key}>{children}</span>
  }
}

function renderTipTapContent(content: TipTapNode | null): React.ReactNode {
  if (!content || content.type !== 'doc' || !Array.isArray(content.content)) {
    return null
  }
  return content.content.map((node, i) => renderNode(node, i))
}

export default async function NewsPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await prisma.post.findUnique({
    where: { slug, published: true },
  })

  if (!post) notFound()

  const raw = post.content as TipTapNode | string | null
  const tipTapContent = raw && typeof raw === 'object' && raw.type === 'doc'
    ? renderTipTapContent(raw)
    : null
  const fallback = typeof raw === 'string' ? <p>{raw}</p> : <p className="text-gray-500">Содержимое публикации</p>

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <style dangerouslySetInnerHTML={{ __html: `
        .news-list-bullet[data-list-style-type="disc"] { list-style-type: disc; }
        .news-list-bullet[data-list-style-type="circle"] { list-style-type: circle; }
        .news-list-bullet[data-list-style-type="square"] { list-style-type: square; }
        .news-list-bullet[data-list-style-type="check"] { list-style-type: none; }
        .news-list-bullet[data-list-style-type="check"] li::before { content: "✓ "; margin-right: 0.25rem; }
        .news-list-bullet[data-list-style-type="star"] { list-style-type: none; }
        .news-list-bullet[data-list-style-type="star"] li::before { content: "★ "; margin-right: 0.25rem; }
        .news-list-ordered { counter-reset: item; list-style-type: none; }
        .news-list-ordered li { counter-increment: item; }
        .news-list-ordered[data-marker-style="decimal"] li::before { content: counters(item, ".") ". "; margin-right: 0.35rem; }
        .news-list-ordered[data-marker-style="decimal-paren"] li::before { content: counters(item, ".") ") "; margin-right: 0.35rem; }
        .news-list-bullet ul, .news-list-bullet ol, .news-list-ordered ul, .news-list-ordered ol { margin-top: 0.25em; padding-left: 1.25rem; }
      `}} />
      <Link href="/" className="text-action-blue hover:underline text-sm mb-6 inline-block">
        ← На главную
      </Link>
      <article className="bg-white rounded-2xl border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-text mb-4">{post.title}</h1>
        {(post as unknown as { excerpt?: string | null }).excerpt && (
          <p className="text-gray-600 mb-4">{(post as unknown as { excerpt: string }).excerpt}</p>
        )}
        {post.previewImage && (
          <div className="aspect-video rounded-lg bg-gray-100 mb-6 overflow-hidden relative">
            <Image src={post.previewImage} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 672px" />
          </div>
        )}
        <div className="prose prose-gray max-w-none">
          {tipTapContent ?? fallback}
        </div>
      </article>
    </div>
  )
}
