'use client';

import { useCallback, useId, useState } from 'react';

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

interface ImageDropzoneProps {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  className?: string;
  chooseButtonText?: string;
  showHelperText?: boolean;
  helperText?: string;
}

interface ImageInfo {
  readonly width: number
  readonly height: number
}

async function getImageInfoFromFile(file: File): Promise<ImageInfo | null> {
  const objectUrl = URL.createObjectURL(file)
  try {
    // Prefer createImageBitmap when available (faster, no DOM insert)
    if (typeof createImageBitmap === 'function') {
      const bmp = await createImageBitmap(file)
      const info = { width: bmp.width, height: bmp.height }
      bmp.close()
      return info
    }

    const img = new Image()
    img.decoding = 'async'
    const loaded = new Promise<ImageInfo>((resolve, reject) => {
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('Failed to read image dimensions'))
    })
    img.src = objectUrl
    return await loaded
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function ImageDropzone({
  value,
  onChange,
  disabled,
  className = '',
  chooseButtonText = 'Выбрать файл',
  showHelperText = true,
  helperText = 'Рекомендуем 3:4 — минимум 900×1200, оптимально 1200×1600 или 1440×1920',
}: ImageDropzoneProps) {
  const inputId = useId()
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setUploadError('Выберите изображение (JPG, PNG, GIF, WebP)');
        return;
      }
      setImageInfo(await getImageInfoFromFile(file));
      setUploadError(null);
      setUploading(true);
      try {
        const formData = new FormData();
        formData.set('file', file);
        const res = await fetch('/api/admin/products/upload-image', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Ошибка загрузки');
        }
        onChange(data.photo ?? null);
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (disabled || uploading) return;
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [disabled, uploading, uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || uploading) return;
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      e.target.value = '';
    },
    [disabled, uploading, uploadFile]
  );

  const aspectRatio = imageInfo ? imageInfo.width / imageInfo.height : null
  const isNearSquare =
    aspectRatio != null ? Math.abs(aspectRatio - 1) <= 0.08 : null

  return (
    <div className={className}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl transition-colors
          ${dragActive ? 'border-action-blue bg-action-blue/5' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || uploading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}
          min-h-[180px] flex flex-col items-center justify-center p-6 text-center
        `}
      >
        <input
          id={inputId}
          type="file"
          accept={ACCEPT}
          onChange={handleInputChange}
          disabled={disabled || uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {showHelperText && (
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] text-gray-700 shadow-sm">
            {helperText}
          </div>
        )}

        {value ? (
          <div className="relative w-full max-w-[200px] aspect-square mx-auto rounded-lg overflow-hidden bg-gray-100">
            <img
              src={value}
              alt="Превью"
              className="w-full h-full object-contain"
            />
            {!disabled && !uploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange(null);
                }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm hover:bg-red-600"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <>
            {uploading ? (
              <p className="text-sm text-gray-500">Загрузка...</p>
            ) : (
              <>
                <svg
                  className="w-12 h-12 text-gray-400 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 14m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-gray-600">
                  Перетащите фото сюда или нажмите для выбора
                </p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WebP</p>
                <label
                  htmlFor={inputId}
                  className="mt-3 inline-flex items-center justify-center rounded-lg bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90"
                >
                  {chooseButtonText}
                </label>
              </>
            )}
          </>
        )}
      </div>

      {imageInfo && (
        <div className="mt-2 text-xs text-gray-600">
          Размер: <span className="font-medium">{imageInfo.width}×{imageInfo.height}</span>
          {isNearSquare === false && (
            <span className="ml-2 text-amber-700">
              Лучше 3:4 — так фото без потерь подходит и для каталога, и для карточки товара
            </span>
          )}
        </div>
      )}

      {uploadError && (
        <p className="mt-2 text-sm text-red-600">{uploadError}</p>
      )}
    </div>
  );
}
