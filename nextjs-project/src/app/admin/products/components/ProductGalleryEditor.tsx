'use client'

import { useState, useEffect } from 'react'
import { ImageDropzone } from '@/app/admin/products/components/ImageDropzone'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ProductGalleryEditorProps {
  photos: string[]
  onChange: (photos: string[]) => void
  disabled?: boolean
}

function SortablePhotoItem({
  id,
  url,
  onUrlChange,
  onRemove,
  disabled,
}: {
  id: string
  url: string
  onUrlChange: (url: string) => void
  onRemove: () => void
  disabled?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-2 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab touch-none p-1 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
        aria-label="Перетащить"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <div className="w-14 h-14 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
        {url ? (
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-xs">URL</span>
        )}
      </div>
      <input
        type="text"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="URL или путь к изображению"
        className="form-input flex-1 min-w-0 text-sm"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="p-2 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-950/30"
        aria-label="Удалить"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

export function ProductGalleryEditor({ photos, onChange, disabled }: ProductGalleryEditorProps) {
  const [localPhotos, setLocalPhotos] = useState<string[]>(photos.length > 0 ? photos : [''])

  useEffect(() => {
    setLocalPhotos(photos.length > 0 ? photos : [''])
  }, [photos.join(',')])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = localPhotos.findIndex((_, i) => `photo-${i}` === active.id)
      const newIndex = localPhotos.findIndex((_, i) => `photo-${i}` === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const next = arrayMove(localPhotos, oldIndex, newIndex)
        setLocalPhotos(next)
        onChange(next)
      }
    }
  }

  const updateUrl = (index: number, url: string) => {
    const next = [...localPhotos]
    next[index] = url
    setLocalPhotos(next)
    onChange(next)
  }

  const remove = (index: number) => {
    const next = localPhotos.filter((_, i) => i !== index)
    setLocalPhotos(next.length > 0 ? next : [''])
    onChange(next)
  }

  const add = () => {
    const next = [...localPhotos, '']
    setLocalPhotos(next)
    onChange(next)
  }

  const addUploadedPhoto = (url: string | null) => {
    if (!url) return
    const hasOnlyEmpty = localPhotos.length === 1 && localPhotos[0] === ''
    const next = hasOnlyEmpty ? [url] : [url, ...localPhotos]
    setLocalPhotos(next)
    onChange(next)
  }

  const items = localPhotos.length > 0 ? localPhotos : ['']
  const sortableIds = items.map((_, i) => `photo-${i}`)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Галерея (первое фото — основное)</p>
        <button
          type="button"
          onClick={add}
          disabled={disabled}
          className="text-sm text-blue-600 hover:underline disabled:opacity-50"
        >
          + Добавить фото
        </button>
      </div>

      <ImageDropzone
        value={null}
        onChange={addUploadedPhoto}
        disabled={disabled}
        className="max-w-xl"
        chooseButtonText="Выбрать файл"
        showHelperText={false}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((url, index) => (
              <SortablePhotoItem
                key={`photo-${index}`}
                id={`photo-${index}`}
                url={url}
                onUrlChange={(u) => updateUrl(index, u)}
                onRemove={() => remove(index)}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
