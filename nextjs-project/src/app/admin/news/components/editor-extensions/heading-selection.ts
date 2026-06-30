import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { canSplit } from '@tiptap/pm/transform';

type HeadingLevel = 1 | 2 | 3;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    headingSelection: {
      toggleHeadingOnSelection: (attributes: { level: HeadingLevel }) => ReturnType;
    };
  }
}

function isPartialTextblockSelection(state: {
  selection: {
    empty: boolean;
    from: number;
    to: number;
    $from: { parent: { isTextblock: boolean }; start: () => number; end: () => number };
    $to: { parent: unknown };
  };
}): boolean {
  const { selection } = state;
  const { $from, $to, empty, from, to } = selection;

  if (empty || $from.parent !== $to.parent || !$from.parent.isTextblock) {
    return false;
  }

  const blockStart = $from.start();
  const blockEnd = $from.end();

  return from > blockStart || to < blockEnd;
}

/**
 * Applies heading to the selected text block. For partial selections inside a paragraph,
 * splits the block first so only the selected fragment becomes a heading.
 */
export const HeadingSelection = Extension.create({
  name: 'headingSelection',

  addCommands() {
    return {
      toggleHeadingOnSelection:
        ({ level }) =>
        ({ editor, state, chain }) => {
          if (!isPartialTextblockSelection(state)) {
            return chain().toggleHeading({ level }).run();
          }

          const { from, to } = state.selection;
          const headingType = state.schema.nodes.heading;
          const paragraphType = state.schema.nodes.paragraph;

          if (!headingType || !paragraphType) {
            return false;
          }

          let tr = state.tr;

          if (canSplit(tr.doc, to)) {
            tr = tr.split(to);
          }

          const mappedFrom = tr.mapping.map(from);

          if (canSplit(tr.doc, mappedFrom)) {
            tr = tr.split(mappedFrom);
          }

          const $pos = tr.doc.resolve(mappedFrom);
          const blockPos = $pos.before($pos.depth);
          const blockNode = tr.doc.nodeAt(blockPos);

          if (!blockNode?.isTextblock) {
            return false;
          }

          const isAlreadyHeading =
            blockNode.type === headingType && blockNode.attrs.level === level;

          tr = tr.setNodeMarkup(
            blockPos,
            isAlreadyHeading ? paragraphType : headingType,
            isAlreadyHeading ? undefined : { level },
          );

          const resolvedBlock = tr.doc.resolve(blockPos);
          const cursorPos = Math.min(resolvedBlock.end() - 1, tr.doc.content.size - 1);
          tr = tr.setSelection(TextSelection.near(tr.doc.resolve(Math.max(1, cursorPos))));

          editor.view.dispatch(tr.scrollIntoView());
          return true;
        },
    };
  },
});
