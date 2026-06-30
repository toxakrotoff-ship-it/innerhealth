'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor, Extensions, JSONContent } from '@tiptap/core';
import { BULLET_MARKERS, type BulletMarkerType } from './editor-extensions/custom-bullet-list';
import { ORDERED_MARKERS, type OrderedMarkerType } from './editor-extensions/custom-ordered-list';
import { buildRichTextEditorExtensions } from './rich-text-editor-extensions';
import { EditorMediaPanel, type UploadedImage } from './EditorMediaPanel';
import { EditorLinkPopover } from './editor-link-popover';

interface RichTextEditorProps {
  value: JSONContent | null;
  onChange: (content: JSONContent) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Список загрузок редактора (хранится на странице — не сбрасывается при ремаунте редактора). */
  uploadedMedia?: UploadedImage[];
  /** Колбэк при новой загрузке (передайте с страницы, чтобы фото не пропадали). */
  onMediaUploaded?: (img: UploadedImage) => void;
  /** Переопределение набора расширений TipTap (например, редактор категории Sprint). */
  extensions?: Extensions;
  /** Дополнительные кнопки в тулбаре. */
  renderExtraToolbar?: (editor: Editor) => ReactNode;
}

interface MenuBarProps {
  editor: ReturnType<typeof useEditor>;
  uploadedMedia: UploadedImage[];
  onMediaUploaded: (img: UploadedImage) => void;
  renderExtraToolbar?: (editor: Editor) => ReactNode;
}

/**
 * CustomBulletList / CustomOrderedList register these on the editor at runtime.
 * StarterKit's `ChainedCommands` typings only expose `toggleBulletList` / `toggleOrderedList`, so
 * `next build` tsc fails on `.updateBulletListMarker` unless we narrow here.
 */
function runUpdateBulletListMarker(editor: Editor, marker: BulletMarkerType): void {
  const chain = editor.chain().focus() as unknown as {
    updateBulletListMarker: (m: BulletMarkerType) => { run: () => boolean };
  };
  chain.updateBulletListMarker(marker).run();
}

function runUpdateOrderedListMarker(editor: Editor, marker: OrderedMarkerType): void {
  const chain = editor.chain().focus() as unknown as {
    updateOrderedListMarker: (m: OrderedMarkerType) => { run: () => boolean };
  };
  chain.updateOrderedListMarker(marker).run();
}

function MenuBar({ editor, uploadedMedia, onMediaUploaded, renderExtraToolbar }: MenuBarProps) {
  const [bulletOpen, setBulletOpen] = useState(false);
  const [orderedOpen, setOrderedOpen] = useState(false);
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false);
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [linkPanelKey, setLinkPanelKey] = useState(0);
  const [linkInitialHref, setLinkInitialHref] = useState('');
  const bulletRef = useRef<HTMLDivElement>(null);
  const orderedRef = useRef<HTMLDivElement>(null);
  const mediaPanelRef = useRef<HTMLDivElement>(null);
  const linkWrapRef = useRef<HTMLDivElement>(null);
  const linkSavedRangeRef = useRef<{ from: number; to: number } | null>(null);

  const insertImage = useCallback(
    (url: string) => {
      if (!url) return;
      editor?.chain().focus().setImage({ src: url }).run();
      setMediaPanelOpen(false);
    },
    [editor]
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (mediaPanelRef.current && !mediaPanelRef.current.contains(target)) {
        setMediaPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (bulletRef.current && !bulletRef.current.contains(target)) setBulletOpen(false);
      if (orderedRef.current && !orderedRef.current.contains(target)) setOrderedOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!linkPanelOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (linkWrapRef.current && !linkWrapRef.current.contains(target)) {
        setLinkPanelOpen(false);
        linkSavedRangeRef.current = null;
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [linkPanelOpen]);

  if (!editor) return null;

  const currentBulletStyle = editor.getAttributes('bulletList').listStyleType || 'disc';
  const currentOrderedStyle = editor.getAttributes('orderedList').markerStyle || 'decimal';

  const handleLinkButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (linkPanelOpen) {
      setLinkPanelOpen(false);
      linkSavedRangeRef.current = null;
      return;
    }
    let { from, to } = editor.state.selection;
    if (from === to) {
      if (!editor.isActive('link')) {
        window.alert('Сначала выделите слово или фразу для ссылки.');
        return;
      }
      editor.chain().focus().extendMarkRange('link').run();
      ({ from, to } = editor.state.selection);
    }
    linkSavedRangeRef.current = { from, to };
    const href = editor.getAttributes('link').href as string | undefined;
    setLinkInitialHref(href ?? '');
    setLinkPanelKey((k) => k + 1);
    setLinkPanelOpen(true);
  };

  const handleUnlinkMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const { from, to } = editor.state.selection;
    if (from === to) return;
    editor.chain().focus().setTextSelection({ from, to }).extendMarkRange('link').unsetLink().run();
  };

  const handleHeadingMouseDown = (e: React.MouseEvent, level: 1 | 2 | 3) => {
    e.preventDefault();
    const { from, to } = editor.state.selection;
    editor.chain().toggleHeadingOnSelection({ level, from, to }).run();
  };

  return (
    <>
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
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        className={`px-2 py-1 rounded text-sm ${editor.isActive('superscript') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
        title="Надстрочный текст"
      >
        x²
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        className={`px-2 py-1 rounded text-sm ${editor.isActive('subscript') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
        title="Подстрочный текст"
      >
        x₂
      </button>
      <div className="relative flex items-center" ref={linkWrapRef}>
        <button
          type="button"
          onMouseDown={handleLinkButtonMouseDown}
          className={`px-2 py-1 rounded text-sm ${editor.isActive('link') ? 'bg-gray-300 text-blue-700' : 'hover:bg-gray-200'}`}
          title="Добавить или изменить ссылку"
        >
          Ссылка
        </button>
        {linkPanelOpen && (
          <EditorLinkPopover
            key={linkPanelKey}
            editor={editor}
            onClose={() => {
              setLinkPanelOpen(false);
              linkSavedRangeRef.current = null;
            }}
            savedRangeRef={linkSavedRangeRef}
            initialHref={linkInitialHref}
          />
        )}
      </div>
      <button
        type="button"
        onMouseDown={handleUnlinkMouseDown}
        className="px-2 py-1 rounded text-sm hover:bg-gray-200"
        title="Убрать ссылку"
      >
        Без ссылки
      </button>
      <span className="w-px h-5 bg-gray-300 mx-1" />
      <button
        type="button"
        onMouseDown={(e) => handleHeadingMouseDown(e, 1)}
        className={`px-2 py-1 rounded text-sm ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      >
        H1
      </button>
      <button
        type="button"
        onMouseDown={(e) => handleHeadingMouseDown(e, 2)}
        className={`px-2 py-1 rounded text-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
      >
        H2
      </button>
      <button
        type="button"
        onMouseDown={(e) => handleHeadingMouseDown(e, 3)}
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
                    runUpdateBulletListMarker(editor, value as BulletMarkerType);
                  } else {
                    editor.chain().focus().toggleList('bulletList', 'listItem').run();
                    runUpdateBulletListMarker(editor, value as BulletMarkerType);
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
                    runUpdateOrderedListMarker(editor, value as OrderedMarkerType);
                  } else {
                    editor.chain().focus().toggleList('orderedList', 'listItem').run();
                    runUpdateOrderedListMarker(editor, value as OrderedMarkerType);
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
        onMouseDown={(e) => e.preventDefault()}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        className={`px-2 py-1 rounded text-sm ${editor.isActive('table') ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
        title="Вставить таблицу 3×3 с шапкой (удобно для состава)"
      >
        Таблица
      </button>
      {editor.isActive('table') ? (
        <>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="px-2 py-1 rounded text-sm hover:bg-gray-200 disabled:opacity-40"
            disabled={!editor.can().addColumnAfter()}
            title="Колонка справа"
          >
            +кол
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="px-2 py-1 rounded text-sm hover:bg-gray-200 disabled:opacity-40"
            disabled={!editor.can().addRowAfter()}
            title="Строка ниже"
          >
            +стр
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="px-2 py-1 rounded text-sm hover:bg-gray-200 disabled:opacity-40"
            disabled={!editor.can().deleteColumn()}
            title="Удалить колонку"
          >
            −кол
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="px-2 py-1 rounded text-sm hover:bg-gray-200 disabled:opacity-40"
            disabled={!editor.can().deleteRow()}
            title="Удалить строку"
          >
            −стр
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            className="px-2 py-1 rounded text-sm hover:bg-gray-200"
            title="Переключить строку шапки"
          >
            Шапка
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="px-2 py-1 rounded text-sm text-red-700 hover:bg-red-50"
            title="Удалить таблицу"
          >
            Удалить табл.
          </button>
        </>
      ) : null}

      <span className="w-px h-5 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={() => setMediaPanelOpen((o) => !o)}
        className={`px-2 py-1 rounded text-sm ${mediaPanelOpen ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
        title="Вставить изображение"
      >
        🖼 Фото
      </button>
      {renderExtraToolbar?.(editor)}
    </div>
        {mediaPanelOpen && (
      <div ref={mediaPanelRef}>
        <EditorMediaPanel
          uploaded={uploadedMedia}
          onUploadedAdd={onMediaUploaded}
          onInsertImage={insertImage}
          onClose={() => setMediaPanelOpen(false)}
        />
      </div>
    )}
    </>
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
  .rich-text-editor-content sup { vertical-align: super; font-size: 0.75em; line-height: 0; }
  .rich-text-editor-content sub { vertical-align: sub; font-size: 0.75em; line-height: 0; }
  .rich-text-editor-content .tableWrapper { margin: 0.75rem 0; overflow-x: auto; }
  .rich-text-editor-content table { border-collapse: collapse; width: 100%; table-layout: auto; }
  .rich-text-editor-content th, .rich-text-editor-content td { border: 1px solid #d1d5db; padding: 0.4rem 0.6rem; vertical-align: top; min-width: 4rem; }
  .rich-text-editor-content th { background: #f3f4f6; font-weight: 600; }
  .rich-text-editor-content td p, .rich-text-editor-content th p { margin: 0; }
`;

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Введите текст...',
  disabled,
  className = '',
  uploadedMedia: uploadedMediaProp,
  onMediaUploaded: onMediaUploadedProp,
  extensions: extensionsProp,
  renderExtraToolbar,
}: RichTextEditorProps) {
  const [uploadedMediaInternal, setUploadedMediaInternal] = useState<UploadedImage[]>([]);
  const uploadedMedia = uploadedMediaProp ?? uploadedMediaInternal;
  const onMediaUploaded =
    onMediaUploadedProp ?? ((img: UploadedImage) => setUploadedMediaInternal((prev) => [...prev, img]));

  const extensions = useMemo(
    () => extensionsProp ?? buildRichTextEditorExtensions(placeholder),
    [extensionsProp, placeholder]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
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
        .rich-text-editor-content a {
          color: #1d4ed8;
          text-decoration: underline;
          text-decoration-color: #93c5fd;
          text-decoration-thickness: 2px;
          text-underline-offset: 2px;
        }
        .rich-text-editor-content a:hover {
          color: #1e40af;
        }
        .rich-text-editor-content .tableWrapper { margin: 0.75rem 0; overflow-x: auto; }
        .rich-text-editor-content table { border-collapse: collapse; width: 100%; }
        .rich-text-editor-content th, .rich-text-editor-content td { border: 1px solid #d1d5db; padding: 0.4rem 0.6rem; vertical-align: top; }
        .rich-text-editor-content th { background: #f3f4f6; font-weight: 600; }
        .rich-text-editor-content td p, .rich-text-editor-content th p { margin: 0; }
        ${LIST_STYLES}
      `}} />
      <MenuBar
        editor={editor}
        uploadedMedia={uploadedMedia}
        onMediaUploaded={onMediaUploaded}
        renderExtraToolbar={renderExtraToolbar}
      />
      <div className="flex-1 min-h-0 overflow-auto rounded-b-lg">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
