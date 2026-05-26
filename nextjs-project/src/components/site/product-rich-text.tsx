import type { JSONContent } from '@tiptap/core'
import { generateHTML, generateJSON } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import { CustomBulletList } from '@/app/admin/news/components/editor-extensions/custom-bullet-list'
import { CustomOrderedList } from '@/app/admin/news/components/editor-extensions/custom-ordered-list'
import { Superscript } from '@/app/admin/news/components/editor-extensions/superscript'
import { Subscript } from '@/app/admin/news/components/editor-extensions/subscript'

const EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    bulletList: false,
    orderedList: false,
  }),
  CustomBulletList.configure({ keepMarks: true, keepAttributes: true }),
  CustomOrderedList.configure({ keepMarks: true, keepAttributes: true }),
  Underline,
  Superscript,
  Subscript,
  Image.configure({ inline: false }),
]

interface ProductRichTextProps {
  html: string
}

export function ProductRichText({ html }: ProductRichTextProps) {
  if (!html) return null
  let sanitized = html
  try {
    const json = generateJSON(html, EXTENSIONS) as JSONContent
    sanitized = generateHTML(json, EXTENSIONS)
  } catch {
    // fallback: use original html
  }
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />
}
