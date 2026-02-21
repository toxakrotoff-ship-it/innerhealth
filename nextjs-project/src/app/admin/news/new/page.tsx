'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/button';
import { RichTextEditor } from '../components/RichTextEditor';
import { CoverImageDropzone } from '../components/CoverImageDropzone';
import { usePreventLeaveWhenDirty } from '@/hooks/use-prevent-leave-when-dirty';
import type { JSONContent } from '@tiptap/core';

type PostType = 'news' | 'article';

const defaultContent: JSONContent = { type: 'doc', content: [] };

function hasContent(content: JSONContent | null): boolean {
  if (!content?.content) return false;
  return content.content.some(
    (node) =>
      (node.type === 'paragraph' && (node.content?.length ?? 0) > 0) ||
      node.type !== 'paragraph'
  );
}

export default function NewNewsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get('type');
  const initialType: PostType = typeFromUrl === 'article' ? 'article' : 'news';

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    type: initialType,
    content: defaultContent as JSONContent,
    previewImage: '',
    published: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = useMemo(
    () =>
      Boolean(
        formData.title.trim() ||
          formData.excerpt.trim() ||
          formData.slug.trim() ||
          formData.previewImage.trim() ||
          formData.published ||
          hasContent(formData.content)
      ),
    [formData]
  );

  usePreventLeaveWhenDirty(isDirty);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, type: initialType }));
  }, [initialType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement | HTMLTextAreaElement;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const response = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug || undefined,
          excerpt: formData.excerpt || undefined,
          type: formData.type,
          content: formData.content,
          previewImage: formData.previewImage || undefined,
          published: formData.published,
        }),
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Ошибка создания');
      router.push('/admin/news');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const isArticle = formData.type === 'article';

  return (
    <div className="admin-container">
      <div className="admin-content">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-text">
            {isArticle ? 'Создание статьи' : 'Создание новости'}
          </h1>
          <Button type="button" variant="secondary" onClick={() => router.push('/admin/news')}>
            Назад к списку
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-4 items-center">
            <label className="block text-sm font-medium text-gray-700">Тип</label>
            <div className="flex gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  checked={formData.type === 'news'}
                  onChange={() => setFormData((p) => ({ ...p, type: 'news' }))}
                  className="rounded-full border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Новость</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  checked={formData.type === 'article'}
                  onChange={() => setFormData((p) => ({ ...p, type: 'article' }))}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL (slug, необязательно — подставится из заголовка)
            </label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="form-input w-full"
              placeholder="например: moya-novost"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Изображение обложки
            </label>
            <CoverImageDropzone
              value={formData.previewImage}
              onChange={(url) => setFormData((p) => ({ ...p, previewImage: url }))}
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
              onChange={(content) => setFormData((p) => ({ ...p, content }))}
              placeholder="Введите текст..."
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Создание...' : isArticle ? 'Создать статью' : 'Создать новость'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push('/admin/news')}>
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
