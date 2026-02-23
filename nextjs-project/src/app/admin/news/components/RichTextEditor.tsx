'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import type { JSONContent } from '@tiptap/core';
import { CustomBulletList, BULLET_MARKERS, type BulletMarkerType } from './editor-extensions/custom-bullet-list';
import { CustomOrderedList, ORDERED_MARKERS, type OrderedMarkerType } from './editor-extensions/custom-ordered-list';

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/gif,image/webp';

interface RichTextEditorProps {
  value: JSONContent | null;
  onChange: (content: JSONContent) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function MenuBar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [bulletOpen, setBulletOpen] = useState(false);
  const [orderedOpen, setOrderedOpen] = useState(false);
  const bulletRef = useRef<HTMLDivElement>(null);
  const orderedRef = useRef<HTMLDivElement>(null);

  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED_IMAGE_TYPES;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.set('file', file);
      formData.set('folder', 'posts');
      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        const data = await res.json();
        if (data?.url) editor?.chain().focus().setImage({ src: data.url }).run();
      } catch {
        // ignore
      }
    };
    input.click();
  }, [editor]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (bulletRef.current && !bulletRef.current.contains(target)) setBulletOpen(false);
      if (orderedRef.current && !orderedRef.current.contains(target)) setOrderedOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editor) return null;

  const currentBulletStyle = editor.getAttributes('bulletList').listStyleType || 'disc';
  const currentOrderedStyle = editor.getAttributes('orderedList').markerStyle || 'decimal';

  return (
    <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-2 py-1 rounded text-sm font-medium ${editor.isActive('bold') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      >
        Ж
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-2 py-1 rounded text-sm ${editor.isActive('italic') ? 'bg-gray-300 italic' : 'hover:bg-gray-200'}`}
      >
        К
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`px-2 py-1 rounded text-sm underline ${editor.isActive('underline') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      >
        Ч
      </button>
      <span className="w-px h-5 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-2 py-1 rounded text-sm ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-2 py-1 rounded text-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`px-2 py-1 rounded text-sm ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      >
        H3
      </button>
      <span className="w-px h-5 bg-gray-300 mx-1" />

      {/* Маркированный список + выбор маркера */}
      <div className="relative flex items-center" ref={bulletRef}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleList('bulletList', 'listItem').run()}
          className={`px-2 py-1 rounded-l text-sm ${editor.isActive('bulletList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
          title="Маркированный список"
        >
          Маркированный
        </button>
        <button
          type="button"
          onClick={() => setBulletOpen((o) => !o)}
          className={`px-1 py-1 rounded-r border-l border-gray-300 text-xs ${editor.isActive('bulletList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
          title="Выбор маркера"
        >
          ▼
        </button>
        {bulletOpen && (
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
            {BULLET_MARKERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  if (editor.isActive('bulletList')) {
                    editor.chain().focus().updateBulletListMarker(value as BulletMarkerType).run();
                  } else {
                    editor.chain().focus().toggleList('bulletList', 'listItem').run();
                    editor.chain().focus().updateBulletListMarker(value as BulletMarkerType).run();
                  }
                  setBulletOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${currentBulletStyle === value ? 'bg-gray-100 font-medium' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Нумерованный список + выбор стиля */}
      <div className="relative flex items-center" ref={orderedRef}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleList('orderedList', 'listItem').run()}
          className={`px-2 py-1 rounded-l text-sm ${editor.isActive('orderedList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
          title="Нумерованный список"
        >
          Нумерованный
        </button>
        <button
          type="button"
          onClick={() => setOrderedOpen((o) => !o)}
          className={`px-1 py-1 rounded-r border-l border-gray-300 text-xs ${editor.isActive('orderedList') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
          title="Стиль нумерации"
        >
          ▼
        </button>
        {orderedOpen && (
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]">
            {ORDERED_MARKERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  if (editor.isActive('orderedList')) {
                    editor.chain().focus().updateOrderedListMarker(value as OrderedMarkerType).run();
                  } else {
                    editor.chain().focus().toggleList('orderedList', 'listItem').run();
                    editor.chain().focus().updateOrderedListMarker(value as OrderedMarkerType).run();
                  }
                  setOrderedOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 ${currentOrderedStyle === value ? 'bg-gray-100 font-medium' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Вложенность: увеличить / уменьшить отступ — mousedown чтобы не терять фокус/выделение */}
      <span className="w-px h-5 bg-gray-300 mx-1" />
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.chain().focus().sinkListItem('listItem').run();
        }}
        className="px-2 py-1 rounded text-sm hover:bg-gray-200 disabled:opacity-50"
        title="Увеличить отступ (уровень вложенности)"
        disabled={!editor.can().sinkListItem('listItem')}
      >
        Вложить
      </button>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.chain().focus().liftListItem('listItem').run();
        }}
        className="px-2 py-1 rounded text-sm hover:bg-gray-200 disabled:opacity-50"
        title="Уменьшить отступ"
        disabled={!editor.can().liftListItem('listItem')}
      >
        Вынести
      </button>

      <span className="w-px h-5 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`px-2 py-1 rounded text-sm ${editor.isActive('blockquote') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
        title="Цитата"
      >
        Цитата
      </button>

      <span className="w-px h-5 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={addImage}
        className="px-2 py-1 rounded text-sm hover:bg-gray-200"
      >
        🖼 Фото
      </button>
    </div>
  );
}

const LIST_STYLES = `
  .rich-text-editor-content ul { padding-left: 1.5rem; margin: 0.5em 0; }
  .rich-text-editor-content ul[data-list-style-type="disc"] { list-style-type: disc; }
  .rich-text-editor-content ul[data-list-style-type="circle"] { list-style-type: circle; }
  .rich-text-editor-content ul[data-list-style-type="square"] { list-style-type: square; }
  .rich-text-editor-content ul[data-list-style-type="check"] { list-style-type: none; }
  .rich-text-editor-content ul[data-list-style-type="check"] li::marker { content: "✓ "; }
  .rich-text-editor-content ul[data-list-style-type="check"] li { padding-left: 0.25rem; }
  .rich-text-editor-content ul[data-list-style-type="star"] { list-style-type: none; }
  .rich-text-editor-content ul[data-list-style-type="star"] li::marker { content: "★ "; }
  .rich-text-editor-content ul[data-list-style-type="star"] li { padding-left: 0.25rem; }
  .rich-text-editor-content ol { padding-left: 1.5rem; margin: 0.5em 0; counter-reset: item; list-style-type: none; }
  .rich-text-editor-content ol li { counter-increment: item; }
  .rich-text-editor-content ol[data-marker-style="decimal"] li::before { content: counters(item, ".") ". "; margin-right: 0.35rem; }
  .rich-text-editor-content ol[data-marker-style="decimal-paren"] li::before { content: counters(item, ".") ") "; margin-right: 0.35rem; }
  .rich-text-editor-content li { margin: 0.2em 0; }
  .rich-text-editor-content li p { margin: 0; }
  .rich-text-editor-content ul ul, .rich-text-editor-content ol ul { margin: 0.2em 0; padding-left: 1.25rem; }
  .rich-text-editor-content ol ol, .rich-text-editor-content ul ol { margin: 0.2em 0; padding-left: 1.25rem; }
  .rich-text-editor-content blockquote { border-left: 4px solid #d1d5db; padding-left: 1rem; margin: 0.75em 0; color: #374151; font-style: italic; }
`;

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Введите текст...',
  disabled,
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
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
    ],
    content: value ?? undefined,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor-content prose prose-sm max-w-none min-h-[240px] px-4 py-3 focus:outline-none',
      },
    },
  });

  const prevValueRef = useRef<string | null>(null);
  useEffect(() => {
    const str = JSON.stringify(value ?? null);
    if (editor && str !== prevValueRef.current) {
      prevValueRef.current = str;
      const current = JSON.stringify(editor.getJSON());
      if (current !== str) {
        editor.commands.setContent(value ?? undefined);
      }
    }
  }, [value, editor]);

  return (
    <div className={`flex flex-col border border-gray-200 rounded-lg bg-white min-h-[280px] max-h-[min(70vh,800px)] ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        .rich-text-editor-content h1 { font-size: 1.875rem; font-weight: 700; line-height: 1.3; margin-top: 0.75em; margin-bottom: 0.25em; }
        .rich-text-editor-content h2 { font-size: 1.5rem; font-weight: 700; line-height: 1.35; margin-top: 0.75em; margin-bottom: 0.25em; }
        .rich-text-editor-content h3 { font-size: 1.25rem; font-weight: 600; line-height: 1.4; margin-top: 0.5em; margin-bottom: 0.25em; }
        .rich-text-editor-content ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.5em 0; }
        ${LIST_STYLES}
      `}} />
      <MenuBar editor={editor} />
      <div className="flex-1 min-h-0 overflow-auto rounded-b-lg">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
