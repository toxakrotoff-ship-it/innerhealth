import { mergeAttributes, Node, wrappingInputRule } from '@tiptap/core';

const ListItemName = 'listItem';
const TextStyleName = 'textStyle';

export const BULLET_MARKERS = [
  { value: 'disc', label: 'Диск •' },
  { value: 'circle', label: 'Круг ○' },
  { value: 'square', label: 'Квадрат ■' },
  { value: 'check', label: 'Галочка ✓' },
  { value: 'star', label: 'Звезда ★' },
] as const;

export type BulletMarkerType = (typeof BULLET_MARKERS)[number]['value'];

export interface CustomBulletListOptions {
  itemTypeName: string;
  HTMLAttributes: Record<string, unknown>;
  keepMarks: boolean;
  keepAttributes: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bulletList: {
      toggleBulletList: () => ReturnType;
      updateBulletListMarker: (marker: BulletMarkerType) => ReturnType;
    };
  }
}

export const bulletListInputRegex = /^\s*([-+*])\s$/;

export const CustomBulletList = Node.create<CustomBulletListOptions>({
  name: 'bulletList',

  addOptions() {
    return {
      itemTypeName: 'listItem',
      HTMLAttributes: {},
      keepMarks: false,
      keepAttributes: false,
    };
  },

  addAttributes() {
    return {
      listStyleType: {
        default: 'disc',
        parseHTML: (el) => el.getAttribute('data-list-style-type') || 'disc',
        renderHTML: (attrs) => ({ 'data-list-style-type': attrs.listStyleType || 'disc' }),
      },
    };
  },

  group: 'block list',

  content() {
    return `${this.options.itemTypeName}+`;
  },

  parseHTML() {
    return [{ tag: 'ul' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['ul', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleBulletList:
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
      updateBulletListMarker:
        (marker: BulletMarkerType) =>
        ({ commands }: { commands: { updateAttributes: (name: string, attrs: { listStyleType: string }) => unknown } }) => {
          return Boolean(commands.updateAttributes(this.name, { listStyleType: marker }));
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-8': () => this.editor.commands.toggleBulletList(),
    };
  },

  addInputRules() {
    const inputRule = wrappingInputRule({
      find: bulletListInputRegex,
      type: this.type,
    });
    return [inputRule];
  },
});
