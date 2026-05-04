import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { TableKit } from '@tiptap/extension-table';
import type { Extensions } from '@tiptap/core';
import { CustomBulletList } from './editor-extensions/custom-bullet-list';
import { CustomOrderedList } from './editor-extensions/custom-ordered-list';
import { ProductLink } from './editor-extensions/product-link-suggestion';

/**
 * Один набор расширений для редактора и для generateHTML / generateJSON в обёртках,
 * чтобы контент (таблицы, ссылки, изображения, @-товары) не терялся при round-trip HTML.
 */
export function buildRichTextEditorExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      bulletList: false,
      orderedList: false,
    }),
    CustomBulletList.configure({ keepMarks: true, keepAttributes: true }),
    CustomOrderedList.configure({ keepMarks: true, keepAttributes: true }),
    Underline,
    Image.configure({ inline: false }),
    Placeholder.configure({ placeholder }),
    Link.configure({
      openOnClick: false,
      autolink: false,
      linkOnPaste: false,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
    ProductLink.configure({
      HTMLAttributes: {
        class: 'text-blue-700 underline decoration-blue-300 hover:text-blue-800',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      suggestion: {
        char: '@',
        items: async ({ query }) => {
          const trimmed = query.trim();
          if (!trimmed) return [];
          try {
            const res = await fetch(`/api/catalog/suggest?q=${encodeURIComponent(trimmed)}&limit=8`, {
              credentials: 'include',
            });
            if (!res.ok) return [];
            const data = (await res.json()) as {
              id: string;
              title: string;
              slug: string | null;
              sku: string | null;
            }[];
            return data;
          } catch {
            return [];
          }
        },
      },
    }),
    TableKit.configure({
      table: { resizable: false },
    }),
  ];
}
