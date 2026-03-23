'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import type { Editor } from '@tiptap/core';

interface ContentLinkSuggestResponse {
  posts: {
    id: string;
    title: string;
    slug: string;
    type: string;
    href: string;
  }[];
  categories: {
    id: string;
    title: string;
    slug: string;
    href: string;
  }[];
}

export interface EditorLinkPopoverProps {
  editor: Editor;
  onClose: () => void;
  /** Saved selection range when opening the panel (ProseMirror positions). */
  savedRangeRef: React.MutableRefObject<{ from: number; to: number } | null>;
  initialHref: string;
}

function postTypeLabel(type: string): string {
  return type === 'article' ? 'Статья' : 'Новость';
}

export function EditorLinkPopover({
  editor,
  onClose,
  savedRangeRef,
  initialHref,
}: EditorLinkPopoverProps) {
  const [url, setUrl] = useState(initialHref);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ContentLinkSuggestResponse | null>(null);
  const inputId = useId();

  useEffect(() => {
    setUrl(initialHref);
  }, [initialHref]);

  const fetchSuggestions = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/content-link-suggest?q=${encodeURIComponent(q)}&limit=10`,
        { credentials: 'include' }
      );
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = (await res.json()) as ContentLinkSuggestResponse;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetchSuggestions(url);
    }, 250);
    return () => window.clearTimeout(t);
  }, [url, fetchSuggestions]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const applyHref = (href: string) => {
    const trimmed = href.trim();
    const range = savedRangeRef.current;
    if (!range) return;

    if (!trimmed) {
      editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).unsetLink().run();
      onClose();
      return;
    }

    editor
      .chain()
      .focus()
      .setTextSelection({ from: range.from, to: range.to })
      .extendMarkRange('link')
      .setLink({ href: trimmed })
      .run();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyHref(url);
  };

  return (
    <div
      className="absolute left-0 top-full z-30 mt-1 w-[min(100vw-2rem,22rem)] rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
      onMouseDown={(e) => e.preventDefault()}
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor={inputId} className="block text-xs font-medium text-gray-600">
          URL или поиск
        </label>
        <input
          id={inputId}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="form-input w-full text-sm"
          placeholder="/news/slug, /catalog/slug или поиск..."
          autoComplete="off"
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
            OK
          </button>
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={() => applyHref('')}
          >
            Убрать ссылку
          </button>
          <button
            type="button"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            onClick={onClose}
          >
            Отмена
          </button>
        </div>
      </form>

      {loading && <p className="mt-2 text-xs text-gray-500">Загрузка…</p>}

      {data && data.posts.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <p className="mb-1 text-xs font-semibold text-gray-500">Новости и статьи</p>
          <ul className="max-h-36 space-y-1 overflow-y-auto">
            {data.posts.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100"
                  onClick={() => {
                    setUrl(p.href);
                    applyHref(p.href);
                  }}
                >
                  <span className="font-medium text-gray-900">{p.title}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    {postTypeLabel(p.type)} · {p.href}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && data.categories.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <p className="mb-1 text-xs font-semibold text-gray-500">Разделы каталога</p>
          <ul className="max-h-36 space-y-1 overflow-y-auto">
            {data.categories.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100"
                  onClick={() => {
                    setUrl(c.href);
                    applyHref(c.href);
                  }}
                >
                  <span className="font-medium text-gray-900">{c.title}</span>
                  <span className="ml-2 text-xs text-gray-500">{c.href}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && !loading && data.posts.length === 0 && data.categories.length === 0 && url.trim().length > 0 && (
        <p className="mt-2 text-xs text-gray-500">Ничего не найдено — введите URL вручную.</p>
      )}
    </div>
  );
}
