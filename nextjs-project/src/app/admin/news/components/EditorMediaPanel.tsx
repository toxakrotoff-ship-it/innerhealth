'use client';

import { useCallback, useRef, useState } from 'react';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp';
const UPLOAD_ENDPOINT = '/api/admin/upload';
const FOLDER = 'posts';

export interface UploadedImage {
  id: string;
  url: string;
  name: string;
}

interface UploadingItem {
  id: string;
  name: string;
  progress: number;
  error: string | null;
}

interface EditorMediaPanelProps {
  /** Список уже загруженных в этой сессии редактора (хранится в родителе, не сбрасывается при закрытии панели). */
  uploaded: UploadedImage[];
  /** Добавить фото в общий список после успешной загрузки. */
  onUploadedAdd: (img: UploadedImage) => void;
  onInsertImage: (url: string) => void;
  onClose?: () => void;
}

function uploadFile(
  file: File,
  onProgress: (percent: number) => void
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.set('file', file);
    formData.set('folder', FOLDER);
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { url?: string };
          if (data?.url) {
            resolve({ url: data.url });
          } else {
            reject(new Error('Сервер не вернул URL изображения'));
          }
        } catch {
          reject(new Error('Неверный ответ сервера'));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(data?.error || `Ошибка ${xhr.status}`));
        } catch {
          reject(new Error(`Ошибка загрузки ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Ошибка сети')));
    xhr.addEventListener('abort', () => reject(new Error('Загрузка отменена')));

    xhr.open('POST', UPLOAD_ENDPOINT);
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}

export function EditorMediaPanel({
  uploaded,
  onUploadedAdd,
  onInsertImage,
  onClose,
}: EditorMediaPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<UploadingItem[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const startUpload = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const allowedTypes = ACCEPTED_IMAGE_TYPES.split(',');
      Array.from(files).forEach((file) => {
        if (!file.type || !allowedTypes.includes(file.type)) return;
        const id = `u-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setUploading((prev) => [...prev, { id, name: file.name, progress: 0, error: null }]);
        uploadFile(file, (progress) => {
          setUploading((prev) => prev.map((u) => (u.id === id ? { ...u, progress } : u)));
        })
          .then(({ url }) => {
            setUploading((prev) => prev.filter((u) => u.id !== id));
            onUploadedAdd({ id: url, url, name: file.name });
          })
          .catch((err) => {
            setUploading((prev) =>
              prev.map((u) =>
                u.id === id ? { ...u, progress: 0, error: err instanceof Error ? err.message : 'Ошибка' } : u
              )
            );
          });
      });
    },
    [onUploadedAdd]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      startUpload(e.dataTransfer.files);
    },
    [startUpload]
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
      startUpload(e.target.files);
      e.target.value = '';
    },
    [startUpload]
  );

  return (
    <div className="border-t border-gray-200 bg-white rounded-b-lg shadow-inner">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-700">Медиа: загрузка и вставка</span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              aria-label="Закрыть"
            >
              ×
            </button>
          )}
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
            ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
          <p className="text-sm text-gray-600">
            Перетащите сюда или нажмите для выбора изображений (JPG, PNG, GIF, WebP)
          </p>
        </div>

        {uploading.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Загрузка</p>
            {uploading.map((u) => (
              <div key={u.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate text-gray-700 max-w-[180px]" title={u.name}>
                    {u.name}
                  </span>
                  {u.error ? (
                    <span className="text-red-600">{u.error}</span>
                  ) : (
                    <span className="text-gray-500">{u.progress}%</span>
                  )}
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-[width] duration-200"
                    style={{ width: u.error ? '0%' : `${u.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {uploaded.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">Загруженные — нажмите, чтобы вставить в текст</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto">
              {uploaded.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onInsertImage(img.url)}
                  className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 hover:ring-2 hover:ring-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {uploaded.length === 0 && uploading.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">
            Загруженные в этой сессии изображения сохраняются здесь до ухода со страницы. Загрузите файлы выше или нажмите для выбора.
          </p>
        )}
      </div>
    </div>
  );
}
