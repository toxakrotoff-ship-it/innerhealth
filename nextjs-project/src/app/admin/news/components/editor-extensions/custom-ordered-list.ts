import { mergeAttributes, Node, wrappingInputRule } from '@tiptap/core';

const ListItemName = 'listItem';
const TextStyleName = 'textStyle';

export const ORDERED_MARKERS = [
  { value: 'decimal', label: '1. 2. 3.' },
  { value: 'decimal-paren', label: '1) 2) 3)' },
] as const;

export type OrderedMarkerType = (typeof ORDERED_MARKERS)[number]['value'];

export const orderedListInputRegex = /^(\d+)\.\s$/;

export interface CustomOrderedListOptions {
  itemTypeName: string;
  HTMLAttributes: Record<string, unknown>;
  keepMarks: boolean;
  keepAttributes: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    orderedList: {
      toggleOrderedList: () => ReturnType;
      updateOrderedListMarker: (marker: OrderedMarkerType) => ReturnType;
    };
  }
}

export const CustomOrderedList = Node.create<CustomOrderedListOptions>({
  name: 'orderedList',

  addOptions() {
    return {
      itemTypeName: 'listItem',
      HTMLAttributes: {},
      keepMarks: false,
      keepAttributes: false,
    };
  },

  group: 'block list',

  content() {
    return `${this.options.itemTypeName}+`;
  },

  addAttributes() {
    return {
      start: {
        default: 1,
        parseHTML: (el) => (el.hasAttribute('start') ? parseInt(el.getAttribute('start') || '', 10) : 1),
        renderHTML: (attrs) => (attrs.start !== 1 ? { start: attrs.start } : {}),
      },
      type: {
        default: null,
        parseHTML: (el) => el.getAttribute('type'),
        renderHTML: (attrs) => (attrs.type ? { type: attrs.type } : {}),
      },
      markerStyle: {
        default: 'decimal',
        parseHTML: (el) => el.getAttribute('data-marker-style') || 'decimal',
        renderHTML: (attrs) => ({ 'data-marker-style': attrs.markerStyle || 'decimal' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'ol' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { start, ...rest } = HTMLAttributes as { start?: number; [key: string]: unknown };
    const merged = mergeAttributes(
      this.options.HTMLAttributes as Record<string, unknown>,
      start === 1 ? rest : (HTMLAttributes as Record<string, unknown>)
    );
    return ['ol', merged, 0];
  },

  addCommands() {
    return {
      toggleOrderedList:
        () =>
        ({ commands, chain }) => {
          if (this.options.keepAttributes) {
            return chain()
              .toggleList(this.name, this.options.itemTypeName, this.options.keepMarks)
              .updateAttributes(ListItemName, this.editor.getAttributes(TextStyleName))
              .run();
          }
          return commands.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks);
        },
      updateOrderedListMarker:
        (marker: OrderedMarkerType) =>
        () =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { markerStyle: marker });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-7': () => this.editor.commands.toggleOrderedList(),
    };
  },

  addInputRules() {
    const inputRule = wrappingInputRule({
      find: orderedListInputRegex,
      type: this.type,
      getAttributes: (match) => ({ start: +match[1] }),
      joinPredicate: (match, node) => node.childCount + (node.attrs.start ?? 1) === +match[1],
    });
    return [inputRule];
  },
});
