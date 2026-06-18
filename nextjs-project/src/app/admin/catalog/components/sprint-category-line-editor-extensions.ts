import type { Extensions } from '@tiptap/core';
import { buildRichTextEditorExtensions } from '@/app/admin/news/components/rich-text-editor-extensions';
import { CategoryTextImageSection } from './editor-extensions/category-text-image-section';

/**
 * Расширения редактора описания линейки Sprint: базовый набор + блок «текст + фото».
 */
export function buildSprintCategoryLineEditorExtensions(placeholder: string): Extensions {
  return [...buildRichTextEditorExtensions(placeholder), CategoryTextImageSection];
}
