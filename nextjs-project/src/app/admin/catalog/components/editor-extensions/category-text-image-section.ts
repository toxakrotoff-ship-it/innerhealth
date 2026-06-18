import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CategoryTextImageSectionView } from './category-text-image-section-view';

export type CategoryTextImagePosition = 'left' | 'right';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    categoryTextImageSection: {
      insertCategoryTextImageSection: () => ReturnType;
    };
  }
}

export interface CategoryTextImageSectionOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const CategoryTextImageSection = Node.create<CategoryTextImageSectionOptions>({
  name: 'categoryTextImageSection',

  group: 'block',

  content: 'block+',

  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      imageSrc: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-image-src'),
        renderHTML: (attributes) =>
          attributes.imageSrc ? { 'data-image-src': attributes.imageSrc } : {},
      },
      imageAlt: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-image-alt') ?? '',
        renderHTML: (attributes) =>
          attributes.imageAlt ? { 'data-image-alt': attributes.imageAlt } : {},
      },
      imageCaption: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-image-caption') ?? '',
        renderHTML: (attributes) =>
          attributes.imageCaption ? { 'data-image-caption': attributes.imageCaption } : {},
      },
      imagePosition: {
        default: 'right',
        parseHTML: (element) =>
          element.getAttribute('data-image-position') === 'left' ? 'left' : 'right',
        renderHTML: (attributes) => ({
          'data-image-position': attributes.imagePosition === 'left' ? 'left' : 'right',
        }),
      },
      imageObjectPosition: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-image-object-position') ?? 'center',
        renderHTML: (attributes) => ({
          'data-image-object-position': attributes.imageObjectPosition ?? 'center',
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="category-text-image-section"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'category-text-image-section',
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CategoryTextImageSectionView);
  },

  addCommands() {
    return {
      insertCategoryTextImageSection:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { imagePosition: 'right' },
              content: [{ type: 'paragraph' }],
            })
            .run(),
    };
  },
});
