'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { generateJSON, generateHTML, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { CustomBulletList } from '@/app/admin/news/components/editor-extensions/custom-bullet-list'
import { CustomOrderedList } from '@/app/admin/news/components/editor-extensions/custom-ordered-list'
import { RichTextEditor } from '@/app/admin/news/components/RichTextEditor'

const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    bulletList: false,
    orderedList: false,
  }),
  CustomBulletList.configure({ keepMarks: true, keepAttributes: true }),
  CustomOrderedList.configure({ keepMarks: true, keepAttributes: true }),
  Underline,
  Image.configure({ inline: false }),
  Placeholder.configure({ placeholder: 'Введите текст...' }),
]

interface ProductRichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Обёртка над RichTextEditor для полей товара (описание, текст, табы).
 * Принимает и отдаёт HTML-строку; внутри конвертирует в/из TipTap JSON.
 */
export function ProductRichTextEditor({
  value,
  onChange,
  placeholder = 'Введите текст...',
  disabled,
  className,
}: ProductRichTextEditorProps) {
  const extensions = useMemo(() => EDITOR_EXTENSIONS, [])
  const lastEmittedRef = useRef<string | null>(null)
  const [localJson, setLocalJson] = useState<JSONContent | null>(() => {
    if (typeof value !== 'string' || !value.trim()) return null
    try {
      return generateJSON(value, extensions) as JSONContent
    } catch {
      return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] }
    }
  })

  useEffect(() => {
    if (value === lastEmittedRef.current) return
    lastEmittedRef.current = null
    if (!value?.trim()) {
      setLocalJson(null)
      return
    }
    try {
      setLocalJson(generateJSON(value, extensions) as JSONContent)
    } catch {
      setLocalJson({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] })
    }
  }, [value, extensions])

  const handleChange = (json: JSONContent) => {
    const html = generateHTML(json, extensions)
    lastEmittedRef.current = html
    setLocalJson(json)
    onChange(html)
  }

  return (
    <RichTextEditor
      value={localJson}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  )
}
