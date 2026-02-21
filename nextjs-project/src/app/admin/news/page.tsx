'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/button';

type PostType = 'news' | 'article';

interface Post {
  id: string;
  title: string;
  slug: string;
  type: string;
  excerpt?: string | null;
  previewImage?: string | null;
  published: boolean;
  createdAt: string;
}

export default function NewsPage() {
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get('type');
  const initialTab: PostType = typeFromUrl === 'article' ? 'article' : 'news';

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PostType>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/posts', { credentials: 'include' });
      if (!response.ok) throw new Error('Ошибка загрузки');
      const data = await response.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Удалить эту запись?')) return;
    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Ошибка удаления');
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const filtered = posts.filter((p) => (p.type || 'news') === activeTab);

  return (
    <div className="admin-container">
      <div className="admin-content">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Новости и статьи</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin/news/new?type=news">
              <Button variant="primary">Создать новость</Button>
            </Link>
            <Link href="/admin/news/new?type=article">
              <Button variant="secondary">Создать статью</Button>
            </Link>
          </div>
        </div>

        {/* Два раздела: Новости | Статьи */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('news')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'news'
                  ? 'border-action-blue text-action-blue'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Новости
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('article')}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'article'
                  ? 'border-action-blue text-action-blue'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Статьи
            </button>
          </nav>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-gray-500">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">
            {activeTab === 'news' ? 'Новостей пока нет' : 'Статей пока нет'}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="table-responsive">
              <table className="table table-horizontal">
                <thead>
                  <tr>
                    <th>Заголовок</th>
                    <th>Дата</th>
                    <th>Статус</th>
                    <th className="w-[200px]">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td>
                        <span className="font-medium text-gray-900">{post.title}</span>
                      </td>
                      <td className="text-gray-600 text-sm">
                        {new Date(post.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            post.published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {post.published ? 'Опубликовано' : 'Черновик'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link href={`/admin/news/edit/${post.id}`}>
                            <Button variant="secondary" size="sm">
                              Редактировать
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            Удалить
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
