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
import { normalizePhotoTransform, type ProductPhotoTransform } from '@/lib/product-photo-transform'
import { applyDragToTransform } from '@/app/admin/products/components/photo-transform-drag'

interface ProductGalleryEditorProps {
  photos: ProductGalleryEditorPhoto[]
  onChange: (photos: ProductGalleryEditorPhoto[]) => void
  disabled?: boolean
}

export interface ProductGalleryEditorPhoto {
  url: string
  blurDataURL?: string
  transform?: ProductPhotoTransform
}

const DEFAULT_TRANSFORM: ProductPhotoTransform = {
  fitMode: 'contain',
  x: 0,
  y: 0,
  zoom: 1,
}

interface DragSession {
  pointerId: number
  startClientX: number
  startClientY: number
  boxWidth: number
  boxHeight: number
  baseTransform: ProductPhotoTransform
}

function SortablePhotoItem({
  id,
  photo,
  onUrlChange,
  onEditTransform,
  onRemove,
  disabled,
}: {
  id: string
  photo: ProductGalleryEditorPhoto
  onUrlChange: (url: string) => void
  onEditTransform: () => void
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
        {photo.url ? (
          <img src={photo.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-xs">URL</span>
        )}
      </div>
      <input
        type="text"
        value={photo.url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="URL или путь к изображению"
        className="form-input flex-1 min-w-0 text-sm"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onEditTransform}
        disabled={disabled || !photo.url}
        className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        Кадр
      </button>
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
  const [localPhotos, setLocalPhotos] = useState<ProductGalleryEditorPhoto[]>(
    photos.length > 0 ? photos : [{ url: '' }]
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [draftTransform, setDraftTransform] = useState<ProductPhotoTransform>(DEFAULT_TRANSFORM)
  const [dragSession, setDragSession] = useState<DragSession | null>(null)

  useEffect(() => {
    setLocalPhotos(photos.length > 0 ? photos : [{ url: '' }])
  }, [JSON.stringify(photos)])

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
    next[index] = { ...next[index], url }
    setLocalPhotos(next)
    onChange(next)
  }

  const remove = (index: number) => {
    const next = localPhotos.filter((_, i) => i !== index)
    const safeNext = next.length > 0 ? next : [{ url: '' }]
    setLocalPhotos(safeNext)
    onChange(safeNext)
  }

  const add = () => {
    const next = [...localPhotos, { url: '' }]
    setLocalPhotos(next)
    onChange(next)
  }

  const addUploadedPhoto = (url: string | null) => {
    if (!url) return
    const hasOnlyEmpty = localPhotos.length === 1 && localPhotos[0]?.url === ''
    const next = hasOnlyEmpty ? [{ url }] : [{ url }, ...localPhotos]
    setLocalPhotos(next)
    onChange(next)
  }

  const openTransformEditor = (index: number) => {
    const transform = normalizePhotoTransform(localPhotos[index]?.transform)
    setDraftTransform(transform)
    setEditingIndex(index)
  }

  const closeTransformEditor = () => {
    setDragSession(null)
    setEditingIndex(null)
  }

  const saveTransform = () => {
    if (editingIndex == null) return
    const next = [...localPhotos]
    next[editingIndex] = { ...next[editingIndex], transform: draftTransform }
    setLocalPhotos(next)
    onChange(next)
    closeTransformEditor()
  }

  const resetTransform = () => {
    setDraftTransform(DEFAULT_TRANSFORM)
  }

  const clearTransform = () => {
    if (editingIndex == null) return
    const next = [...localPhotos]
    const current = next[editingIndex]
    next[editingIndex] = current ? { ...current, transform: undefined } : { url: '' }
    setLocalPhotos(next)
    onChange(next)
    closeTransformEditor()
  }

  const items = localPhotos.length > 0 ? localPhotos : [{ url: '' }]
  const sortableIds = items.map((_, i) => `photo-${i}`)
  const editingPhoto = editingIndex != null ? items[editingIndex] : null

  const handlePreviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editingPhoto?.url) return
    event.preventDefault()
    const box = event.currentTarget.getBoundingClientRect()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragSession({
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      boxWidth: box.width,
      boxHeight: box.height,
      baseTransform: draftTransform,
    })
  }

  const handlePreviewPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragSession) return
    if (event.pointerId !== dragSession.pointerId) return
    const deltaX = event.clientX - dragSession.startClientX
    const deltaY = event.clientY - dragSession.startClientY
    setDraftTransform(
      applyDragToTransform(dragSession.baseTransform, {
        deltaX,
        deltaY,
        boxWidth: dragSession.boxWidth,
        boxHeight: dragSession.boxHeight,
      })
    )
  }

  const handlePreviewPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragSession) return
    if (event.pointerId !== dragSession.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setDragSession(null)
  }

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
        showHelperText
        helperText="Для универсального результата используйте 3:4 (1200×1600 или 1440×1920)"
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((url, index) => (
              <SortablePhotoItem
                key={`photo-${index}`}
                id={`photo-${index}`}
                photo={url}
                onUrlChange={(u) => updateUrl(index, u)}
                onEditTransform={() => openTransformEditor(index)}
                onRemove={() => remove(index)}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {editingPhoto && (
        <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Кадрирование под карточку 3:4</h3>
              <button
                type="button"
                onClick={closeTransformEditor}
                className="rounded-md px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Закрыть
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Режим</label>
                  <select
                    value={draftTransform.fitMode}
                    onChange={(e) =>
                      setDraftTransform((prev) => ({
                        ...prev,
                        fitMode: e.target.value === 'cover' ? 'cover' : 'contain',
                      }))
                    }
                    className="form-input w-full"
                  >
                    <option value="contain">Вписать (contain)</option>
                    <option value="cover">Обрезать (cover)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Масштаб: {draftTransform.zoom.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={2}
                    step={0.01}
                    value={draftTransform.zoom}
                    onChange={(e) =>
                      setDraftTransform((prev) => ({
                        ...prev,
                        zoom: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Смещение X: {draftTransform.x.toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    step={1}
                    value={draftTransform.x}
                    onChange={(e) =>
                      setDraftTransform((prev) => ({
                        ...prev,
                        x: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Смещение Y: {draftTransform.y.toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    step={1}
                    value={draftTransform.y}
                    onChange={(e) =>
                      setDraftTransform((prev) => ({
                        ...prev,
                        y: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div
                  className={`relative aspect-3/4 w-full max-w-[320px] overflow-hidden rounded-2xl border border-gray-200 bg-highlight-blue ${
                    editingPhoto.url ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                  style={{ touchAction: 'none' }}
                  onPointerDown={handlePreviewPointerDown}
                  onPointerMove={handlePreviewPointerMove}
                  onPointerUp={handlePreviewPointerEnd}
                  onPointerCancel={handlePreviewPointerEnd}
                >
                  {editingPhoto.url && (
                    <img
                      src={editingPhoto.url}
                      alt=""
                      draggable={false}
                      onDragStart={(event) => event.preventDefault()}
                      className={`absolute inset-0 h-full w-full ${draftTransform.fitMode === 'cover' ? 'object-cover' : 'object-contain p-3'}`}
                      style={{
                        objectPosition: '50% 50%',
                        transform: `translate(${draftTransform.x}%, ${draftTransform.y}%) scale(${draftTransform.zoom})`,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Подсказка: перетаскивайте изображение мышью прямо в превью или используйте ползунки X/Y.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={clearTransform}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Удалить настройки
              </button>
              <button
                type="button"
                onClick={resetTransform}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={saveTransform}
                className="rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
