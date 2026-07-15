'use client'

import { type CSSProperties } from 'react'
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
import { ProductCharacteristicsEditor } from './ProductCharacteristicsEditor'
import { ProductRichTextEditor } from './ProductRichTextEditor'
import {
  createEmptyProductTab,
  PRODUCT_SYSTEM_SECTION_META,
  type ProductTabEditorItem,
  type ProductTabEditorType,
} from '@/lib/product-tabs'
import { sanitizeProductTitleInput } from '@/lib/sanitize-text'

interface ProductTabsEditorProps {
  value: ProductTabEditorItem[]
  onChange: (tabs: ProductTabEditorItem[]) => void
  managedMode?: boolean
}

interface SortableTabCardProps {
  tab: ProductTabEditorItem
  index: number
  onTabChange: (nextTab: ProductTabEditorItem) => void
  onDelete: (id: string) => void
}

function SortableTabCard({ tab, index, onTabChange, onDelete }: SortableTabCardProps) {
  const isSystemBlock = typeof tab.key === 'string' && tab.key in PRODUCT_SYSTEM_SECTION_META
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 ${
        isDragging ? 'opacity-70 ring-2 ring-action-blue/30' : ''
      }`}
    >
      <div className="mb-3 flex items-start gap-3">
        <button
          type="button"
          className="mt-2 rounded p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
          aria-label={`Изменить порядок таба ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          <Drag className="h-4 w-4" />
        </button>

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Таб {index + 1}
            </span>
            {isSystemBlock ? (
              <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                Системный блок
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                Пользовательский блок
              </span>
            )}
            <select
              value={tab.editorType}
              onChange={(event) =>
                onTabChange({
                  ...tab,
                  editorType: event.target.value as ProductTabEditorType,
                })
              }
              className="form-input w-auto min-w-[180px]"
              aria-label="Тип содержимого таба"
              disabled={isSystemBlock}
            >
              <option value="richtext">Текст и фото</option>
              <option value="characteristics">Таблица характеристик</option>
            </select>
            {isSystemBlock && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={tab.isVisible !== false}
                  onChange={(event) =>
                    onTabChange({
                      ...tab,
                      isVisible: event.target.checked,
                    })
                  }
                  className="form-input h-4 w-4 rounded"
                />
                Показывать блок
              </label>
            )}
          </div>

          {isSystemBlock ? (
            <div className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
              {tab.title}
            </div>
          ) : (
            <input
              type="text"
              value={tab.title}
              onChange={(event) =>
                onTabChange({
                  ...tab,
                  title: sanitizeProductTitleInput(event.target.value),
                })
              }
              className="form-input w-full max-w-md"
              placeholder="Название таба, например: Состав"
            />
          )}
        </div>

        {!isSystemBlock && (
          <button
            type="button"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
            aria-label="Удалить таб"
            onClick={() => onDelete(tab.id)}
          >
            <Trash className="h-4 w-4" />
          </button>
        )}
      </div>

      {tab.editorType === 'characteristics' ? (
        <ProductCharacteristicsEditor
          value={tab.content}
          onChange={(html) => onTabChange({ ...tab, content: html })}
        />
      ) : (
        <ProductRichTextEditor
          value={tab.content}
          onChange={(html) => onTabChange({ ...tab, content: html })}
          placeholder="Содержимое таба (списки, жирный текст, фото)"
        />
      )}
    </div>
  )
}

export function ProductTabsEditor({ value, onChange, managedMode = false }: ProductTabsEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = value.findIndex((tab) => tab.id === String(active.id))
    const newIndex = value.findIndex((tab) => tab.id === String(over.id))
    if (oldIndex < 0 || newIndex < 0) return

    onChange(arrayMove(value, oldIndex, newIndex))
  }

  const handleTabChange = (nextTab: ProductTabEditorItem) => {
    onChange(value.map((tab) => (tab.id === nextTab.id ? nextTab : tab)))
  }

  const handleDelete = (id: string) => {
    onChange(value.filter((tab) => tab.id !== id))
  }

  const handleAddTab = () => {
    onChange([...value, createEmptyProductTab()])
  }

  return (
    <div className="space-y-4">
      {value.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Табов пока нет. Нажмите «Добавить таб», чтобы создать первый.
        </p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={value.map((tab) => tab.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {value.map((tab, index) => (
                <SortableTabCard
                  key={tab.id}
                  tab={tab}
                  index={index}
                  onTabChange={handleTabChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex">
        <Button type="button" variant="secondary" onClick={handleAddTab}>
          {managedMode ? 'Добавить пользовательский блок' : 'Добавить таб'}
        </Button>
      </div>
    </div>
  )
}
