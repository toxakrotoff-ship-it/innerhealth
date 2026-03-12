'use client';

import { useCallback, useState } from 'react';

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

interface CoverImageDropzoneProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  className?: string;
  /** Папка в public/uploads (posts | content | products). По умолчанию posts. */
  folder?: string;
}

export function CoverImageDropzone({
  value,
  onChange,
  disabled,
  className = '',
  folder = 'posts',
}: CoverImageDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setUploadError('Выберите изображение (JPG, PNG, GIF, WebP)');
        return;
      }
      setUploadError(null);
      setUploading(true);
      try {
        const formData = new FormData();
        formData.set('file', file);
        formData.set('folder', folder);
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
        onChange(data.url ?? '');
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

  return (
    <div className={className}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled || uploading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}
          min-h-[180px] flex flex-col items-center justify-center p-6 text-center
        `}
      >
        <input
          type="file"
          accept={ACCEPT}
          onChange={handleInputChange}
          disabled={disabled || uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {value ? (
          <div className="relative w-full max-w-[280px] aspect-video mx-auto rounded-lg overflow-hidden bg-gray-100">
            <img
              src={value}
              alt="Обложка"
              className="w-full h-full object-cover"
            />
            {!disabled && !uploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange('');
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
                  Перетащите изображение сюда или нажмите для выбора
                </p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WebP</p>
              </>
            )}
          </>
        )}
      </div>
      {uploadError && (
        <p className="mt-2 text-sm text-red-600">{uploadError}</p>
      )}
    </div>
  );
}
