'use client';

import dynamic from 'next/dynamic';
import type { JSONContent } from '@tiptap/core';
import type { UploadedImage } from '@/app/admin/news/components/EditorMediaPanel';

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

export function SprintCategoryLineEditor(props: SprintCategoryLineEditorProps) {
  return (
    <RichTextEditor
      value={props.value}
      onChange={props.onChange}
      placeholder={props.placeholder}
      uploadedMedia={props.uploadedMedia}
      onMediaUploaded={props.onMediaUploaded}
    />
  );
}
