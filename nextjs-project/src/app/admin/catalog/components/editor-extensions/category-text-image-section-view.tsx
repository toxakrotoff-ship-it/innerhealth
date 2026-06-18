'use client';

import { useCallback, useRef, useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import type { CategoryTextImagePosition } from './category-text-image-section';

const UPLOAD_ENDPOINT = '/api/admin/upload';
const FOLDER = 'posts';
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp';

export function CategoryTextImageSectionView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const imageSrc = (node.attrs.imageSrc as string | null) ?? null;
  const imageAlt = (node.attrs.imageAlt as string) ?? '';
  const imageCaption = (node.attrs.imageCaption as string) ?? '';
  const imagePosition = (node.attrs.imagePosition as CategoryTextImagePosition) ?? 'right';
  const imageObjectPosition = (node.attrs.imageObjectPosition as string) ?? 'center';

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      setIsUploading(true);
      setUploadError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', FOLDER);

        const response = await fetch(UPLOAD_ENDPOINT, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? `Ошибка загрузки (${response.status})`);
        }

        const data = (await response.json()) as { url?: string };
        if (!data.url) {
          throw new Error('Сервер не вернул URL изображения');
        }

        updateAttributes({
          imageSrc: data.url,
          imageAlt: imageAlt || file.name.replace(/\.[^.]+$/, ''),
        });
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Не удалось загрузить фото');
      } finally {
        setIsUploading(false);
      }
    },
    [imageAlt, updateAttributes]
  );

  return (
    <NodeViewWrapper className="category-text-image-section my-4 rounded-lg border border-dashed border-blue-200 bg-blue-50/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-blue-100 pb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-blue-800">
          Блок: текст + фото
        </span>
        <button
          type="button"
          onClick={() =>
            updateAttributes({
              imagePosition: imagePosition === 'right' ? 'left' : 'right',
            })
          }
          className="rounded border border-blue-200 bg-white px-2 py-0.5 text-xs text-blue-900 hover:bg-blue-50"
        >
          Фото {imagePosition === 'right' ? 'справа' : 'слева'}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="rounded border border-blue-200 bg-white px-2 py-0.5 text-xs text-blue-900 hover:bg-blue-50 disabled:opacity-50"
        >
          {isUploading ? 'Загрузка…' : imageSrc ? 'Сменить фото' : 'Загрузить фото'}
        </button>
        {imageSrc ? (
          <button
            type="button"
            onClick={() => updateAttributes({ imageSrc: null, imageAlt: '', imageCaption: '' })}
            className="rounded border border-red-200 bg-white px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
          >
            Убрать фото
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => deleteNode()}
          className="ml-auto rounded border border-red-200 bg-white px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
        >
          Удалить блок
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
        />
      </div>

      {uploadError ? <p className="mb-2 text-xs text-red-600">{uploadError}</p> : null}

      <div
        className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${
          imagePosition === 'left' ? 'md:[&>div:first-child]:order-2 md:[&>div:last-child]:order-1' : ''
        }`}
      >
        <div className="min-w-0 rounded border border-white bg-white/80 p-2">
          <NodeViewContent className="category-text-image-section-content min-h-[80px] text-sm" />
        </div>

        <div className="min-w-0 rounded border border-white bg-white/80 p-2">
          {imageSrc ? (
            <figure>
              <img
                src={imageSrc}
                alt={imageAlt}
                className="max-h-56 w-full rounded object-cover"
                style={{ objectPosition: imageObjectPosition }}
              />
              <label className="mt-2 block text-xs text-gray-600">
                Подпись под фото (необязательно)
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(event) => updateAttributes({ imageCaption: event.target.value })}
                  className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900"
                  placeholder="Подпись"
                />
              </label>
              <label className="mt-2 block text-xs text-gray-600">
                Alt для доступности
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(event) => updateAttributes({ imageAlt: event.target.value })}
                  className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-sm text-gray-900"
                  placeholder="Описание изображения"
                />
              </label>
            </figure>
          ) : (
            <div className="flex min-h-[120px] items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500">
              Загрузите фото для этой секции
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
