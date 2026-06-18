'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo } from 'react';
import type { Editor, JSONContent } from '@tiptap/core';
import type { UploadedImage } from '@/app/admin/news/components/EditorMediaPanel';
import { buildSprintCategoryLineEditorExtensions } from './sprint-category-line-editor-extensions';

const RichTextEditor = dynamic(
  () =>
    import('@/app/admin/news/components/RichTextEditor').then((mod) => mod.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded border border-gray-200 bg-gray-50 px-3 py-8 text-center text-sm text-gray-500">
        Загрузка редактора…
      </div>
    ),
  }
);

export interface SprintCategoryLineEditorProps {
  value: JSONContent | null;
  onChange: (content: JSONContent) => void;
  placeholder?: string;
  uploadedMedia?: UploadedImage[];
  onMediaUploaded?: (img: UploadedImage) => void;
}

function SprintCategoryExtraToolbar({ editor }: { editor: Editor }) {
  const insertTextImageSection = useCallback(() => {
    const chain = editor.chain().focus() as unknown as {
      insertCategoryTextImageSection: () => { run: () => boolean };
    };
    chain.insertCategoryTextImageSection().run();
  }, [editor]);

  return (
    <>
      <span className="w-px h-5 bg-gray-300 mx-1" />
      <button
        type="button"
        onClick={insertTextImageSection}
        className="px-2 py-1 rounded text-sm hover:bg-gray-200"
        title="Секция: текст слева или справа + фото"
      >
        Текст + фото
      </button>
    </>
  );
}

export function SprintCategoryLineEditor(props: SprintCategoryLineEditorProps) {
  const placeholder = props.placeholder ?? 'Описание линейки, таблицы, юридические абзацы…';
  const extensions = useMemo(
    () => buildSprintCategoryLineEditorExtensions(placeholder),
    [placeholder]
  );
  const renderExtraToolbar = useCallback(
    (editor: Editor) => <SprintCategoryExtraToolbar editor={editor} />,
    []
  );

  return (
    <RichTextEditor
      value={props.value}
      onChange={props.onChange}
      placeholder={placeholder}
      uploadedMedia={props.uploadedMedia}
      onMediaUploaded={props.onMediaUploaded}
      extensions={extensions}
      renderExtraToolbar={renderExtraToolbar}
    />
  );
}
