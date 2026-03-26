'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Drag, Trash } from 'iconoir-react'
import Button from '@/components/ui/button'

type CharacteristicKeyMode = 'preset' | 'custom'

interface CharacteristicRow {
  id: string
  key: string
  value: string
  keyMode: CharacteristicKeyMode
}

interface ProductCharacteristicsEditorProps {
  value: string
  onChange: (nextHtml: string) => void
}

const PRESET_CHARACTERISTICS = [
  'Пищевая ценность (100 г)',
  'кКал',
  'ккал',
  'Состав',
  'Энергетическая ценность',
  'Энергетическая ценность (100 г)',
  'Срок годности',
  'Хранение',
  'Противопоказания',
  'Суточная доза',
] as const

const PRESET_CHARACTERISTICS_SET = new Set<string>(PRESET_CHARACTERISTICS)

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeHtmlText(html: string): string {
  // Упрощенная нормализация для эвристического разбора (fallback).
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|tr|li|ul|ol)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
}

function parseFromOurTableMarkup(html: string): Array<{ key: string; value: string }> {
  if (!html.trim()) return []
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return []
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table =
    doc.querySelector('table[data-product-characteristics="1"]') ??
    doc.querySelector('table.product-characteristics-table')
  if (!table) return []

  const parsed: Array<{ key: string; value: string }> = []
  const rows = Array.from(table.querySelectorAll('tr'))
  for (const tr of rows) {
    const th = tr.querySelector('th')
    const td = tr.querySelector('td')
    const key = (th?.textContent ?? '').trim()
    const value = (td?.textContent ?? '').trim()
    if (!key && !value) continue
    parsed.push({ key, value })
  }
  return parsed
}

function parseCharacteristicsHtml(value: string): Array<{ key: string; value: string }> {
  const fromTable = parseFromOurTableMarkup(value)
  if (fromTable.length > 0) return fromTable

  // Fallback: пытаемся распарсить как пары строк (ключ/значение),
  // если в HTML используются <br> или блочные переносы.
  const normalized = normalizeHtmlText(value).trim()
  if (!normalized) return []

  const lines = normalized
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const paired: Array<{ key: string; value: string }> = []
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const key = lines[i]
    const v = lines[i + 1]
    if (!key || !v) continue
    paired.push({ key, value: v })
  }

  return paired
}

function serializeCharacteristicsHtml(rows: CharacteristicRow[]): string {
  const normalized = rows
    .map((r) => ({
      key: r.key.trim(),
      value: r.value.trim(),
    }))
    .filter((r) => r.key.length > 0 || r.value.length > 0)

  if (normalized.length === 0) return ''

  const body = normalized
    .map(
      (r) =>
        `<tr><th scope="row">${escapeHtml(r.key)}</th><td>${escapeHtml(r.value)}</td></tr>`
    )
    .join('')

  return `<table class="product-characteristics-table" data-product-characteristics="1"><tbody>${body}</tbody></table>`
}

export function ProductCharacteristicsEditor({ value, onChange }: ProductCharacteristicsEditorProps) {
  const lastEmittedHtmlRef = useRef<string>('')
  const initialRows = useMemo(() => {
    const parsed = parseCharacteristicsHtml(value)
    const mapped: CharacteristicRow[] =
      parsed.length > 0
        ? parsed.map((p) => ({
            id: createId(),
            key: p.key,
            value: p.value,
            keyMode: PRESET_CHARACTERISTICS_SET.has(p.key) ? 'preset' : 'custom',
          }))
        : [
            {
              id: createId(),
              key: '',
              value: '',
              keyMode: 'custom',
            },
          ]
    return mapped
  }, []) // only for first mount

  const [rows, setRows] = useState<CharacteristicRow[]>(initialRows)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  useEffect(() => {
    // Если parent обновил HTML извне (например, сменили товар) — пересобираем строки.
    if (value === lastEmittedHtmlRef.current) return
    const parsed = parseCharacteristicsHtml(value)
    setRows(
      parsed.length > 0
        ? parsed.map((p) => ({
            id: createId(),
            key: p.key,
            value: p.value,
            keyMode: PRESET_CHARACTERISTICS_SET.has(p.key) ? 'preset' : 'custom',
          }))
        : [
            {
              id: createId(),
              key: '',
              value: '',
              keyMode: 'custom',
            },
          ]
    )
  }, [value])

  const availableKeys = useMemo(() => {
    const fromRows = rows.map((r) => r.key.trim()).filter(Boolean)
    return Array.from(new Set([...PRESET_CHARACTERISTICS, ...fromRows]))
  }, [rows])

  const availableKeysSet = useMemo(() => new Set<string>(availableKeys), [availableKeys])

  const serializedHtml = useMemo(() => serializeCharacteristicsHtml(rows), [rows])

  useEffect(() => {
    if (serializedHtml === lastEmittedHtmlRef.current) return
    lastEmittedHtmlRef.current = serializedHtml
    onChange(serializedHtml)
  }, [serializedHtml, onChange])

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: createId(),
        key: '',
        value: '',
        keyMode: 'custom',
      },
    ])
  }

  const deleteRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id)
      if (next.length > 0) return next
      return [
        {
          id: createId(),
          key: '',
          value: '',
          keyMode: 'custom',
        },
      ]
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setRows((prev) => {
      const oldIndex = prev.findIndex((row) => row.id === String(active.id))
      const newIndex = prev.findIndex((row) => row.id === String(over.id))
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
          {rows.map((row) => (
            <SortableCharacteristicRow
              key={row.id}
              row={row}
              availableKeys={availableKeys}
              availableKeysSet={availableKeysSet}
              onRowChange={(nextRow) =>
                setRows((prev) => prev.map((item) => (item.id === nextRow.id ? nextRow : item)))
              }
              onDelete={deleteRow}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div className="flex">
        <Button type="button" variant="secondary" onClick={addRow}>
          Добавить характеристику
        </Button>
      </div>
    </div>
  )
}

interface SortableCharacteristicRowProps {
  row: CharacteristicRow
  availableKeys: readonly string[]
  availableKeysSet: ReadonlySet<string>
  onRowChange: (nextRow: CharacteristicRow) => void
  onDelete: (id: string) => void
}

function SortableCharacteristicRow({
  row,
  availableKeys,
  availableKeysSet,
  onRowChange,
  onDelete,
}: SortableCharacteristicRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isKeyInOptions = availableKeysSet.has(row.key.trim())
  const selectValue = row.keyMode === 'preset' && isKeyInOptions ? row.key : '__new__'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 rounded ${isDragging ? 'opacity-70 ring-2 ring-action-blue/30' : ''}`}
    >
      <button
        type="button"
        className="mt-2 rounded p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Изменить порядок характеристики"
        {...attributes}
        {...listeners}
      >
        <Drag className="h-4 w-4" />
      </button>

      <div className="w-full max-w-md">
        <select
          value={selectValue}
          onChange={(e) => {
            const next = e.target.value
            if (next === '__new__') {
              onRowChange({ ...row, keyMode: 'custom' })
              return
            }
            onRowChange({ ...row, key: next, keyMode: 'preset' })
          }}
          className="form-input w-full"
          aria-label="Выбор характеристики"
        >
          {availableKeys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
          <option value="__new__">Новая характеристика</option>
        </select>

        {row.keyMode === 'custom' && (
          <input
            type="text"
            value={row.key}
            onChange={(e) => onRowChange({ ...row, key: e.target.value })}
            placeholder="Название характеристики"
            className="form-input w-full mt-2"
          />
        )}
      </div>

      <div className="flex-1">
        <textarea
          value={row.value}
          onChange={(e) => onRowChange({ ...row, value: e.target.value })}
          placeholder="Значение"
          className="form-input w-full min-h-[44px] resize-y"
          rows={2}
        />
      </div>

      <div className="pt-1">
        <button
          type="button"
          data-prevent-row-nav
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
          aria-label="Удалить характеристику"
          onClick={() => onDelete(row.id)}
        >
          <Trash className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

