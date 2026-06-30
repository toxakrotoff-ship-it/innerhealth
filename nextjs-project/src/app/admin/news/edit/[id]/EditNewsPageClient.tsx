'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import { useAdminBasePath } from '@/app/admin/context/admin-base-path';
import { RichTextEditor } from '../../components/RichTextEditor';
import { CoverImageDropzone } from '../../components/CoverImageDropzone';
import type { UploadedImage } from '../../components/EditorMediaPanel';
import type { JSONContent } from '@tiptap/core';
import { sanitizeTipTapJsonForStorage } from '@/lib/sanitize-tiptap-json';

type PostType = 'news' | 'article';

interface Post {
  id: string;
  title: string;
  slug: string;
  type: string;
  excerpt?: string | null;
  content: unknown;
  previewImage?: string | null;
  published: boolean;
  createdAt: string;
}

function normalizeContent(raw: unknown): JSONContent {
  if (raw && typeof raw === 'object' && 'type' in raw && (raw as { type: string }).type === 'doc') {
    return raw as JSONContent;
  }
  if (typeof raw === 'string') {
    return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: raw }] }] };
  }
  return { type: 'doc', content: [] };
}

interface EditNewsPageClientProps {
  postId: string;
}

export function EditNewsPageClient({ postId }: EditNewsPageClientProps) {
  const router = useRouter();
  const base = useAdminBasePath();
  const id = postId;

  const [, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    slug: string;
    excerpt: string;
    type: PostType;
    content: JSONContent;
    previewImage: string;
    published: boolean;
  } | null>(null);
  const [editorUploadedMedia, setEditorUploadedMedia] = useState<UploadedImage[]>([]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/posts/${id}`, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Не удалось загрузить пост');
        return res.json();
      })
      .then((data: Post) => {
        setPost(data);
        setFormData({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt ?? '',
          type: (data.type === 'article' ? 'article' : 'news') as PostType,
          content: normalizeContent(data.content),
          previewImage: data.previewImage ?? '',
          published: data.published,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => (!prev ? prev : { ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !formData) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          excerpt: formData.excerpt || undefined,
          type: formData.type,
          content: sanitizeTipTapJsonForStorage(formData.content),
          previewImage: formData.previewImage || undefined,
          published: formData.published,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка сохранения');
      router.push(`/${base}/news`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  if (!id) {
    return (
      <div className="p-8 text-sm text-red-600">Неверный или отсутствующий ID.</div>
    );
  }

  if (loading || !formData) {
    return <div className="p-8">Загрузка...</div>;
  }

  const isArticle = formData.type === 'article';

  return (
    <div className="admin-container">
      <div className="admin-content">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-text">
            {isArticle ? 'Редактирование статьи' : 'Редактирование новости'}
          </h1>
          <Button type="button" variant="secondary" onClick={() => router.push(`/${base}/news`)}>
            Назад к списку
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-4 items-center">
            <span className="text-sm font-medium text-gray-700">Тип</span>
            <div className="flex gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  checked={formData.type === 'news'}
                  onChange={() => setFormData((p) => (!p ? p : { ...p, type: 'news' }))}
                  className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Новость</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  checked={formData.type === 'article'}
                  onChange={() => setFormData((p) => (!p ? p : { ...p, type: 'article' }))}
                  className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Статья</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="form-input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Краткое описание (необязательно)
            </label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              rows={3}
              className="form-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL (slug)</label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="form-input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Изображение обложки
            </label>
            <CoverImageDropzone
              value={formData.previewImage}
              onChange={(url) => setFormData((p) => (!p ? p : { ...p, previewImage: url }))}
            />
            <p className="mt-2 text-xs text-gray-500">или вставьте URL:</p>
            <input
              type="text"
              name="previewImage"
              value={formData.previewImage}
              onChange={handleChange}
              className="form-input w-full mt-1"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="published"
                checked={formData.published}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Опубликовано</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Содержание</label>
            <RichTextEditor
              value={formData.content}
              onChange={(content) => setFormData((p) => (!p ? p : { ...p, content }))}
              placeholder="Введите текст..."
              uploadedMedia={editorUploadedMedia}
              onMediaUploaded={(img) => setEditorUploadedMedia((prev) => [...prev, img])}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit">Сохранить изменения</Button>
            <Button type="button" variant="secondary" onClick={() => router.push(`/${base}/news`)}>
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
