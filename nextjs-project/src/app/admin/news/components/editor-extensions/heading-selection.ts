import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { canSplit } from '@tiptap/pm/transform';

type HeadingLevel = 1 | 2 | 3;

interface HeadingSelectionRange {
  from: number;
  to: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    headingSelection: {
      toggleHeadingOnSelection: (attributes: {
        level: HeadingLevel;
        from: number;
        to: number;
      }) => ReturnType;
    };
  }
}

function getTextblockPos(doc: Parameters<typeof TextSelection.create>[0], pos: number): number | null {
  const $pos = doc.resolve(pos);

  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (node.isTextblock) {
      return $pos.before(depth);
    }
  }

  return null;
}

function isPartialTextblockSelection({ from, to, doc }: HeadingSelectionRange & { doc: Parameters<typeof TextSelection.create>[0] }): boolean {
  if (from === to) {
    return false;
  }

  const $from = doc.resolve(from);
  const $to = doc.resolve(to);

  if ($from.parent !== $to.parent || !$from.parent.isTextblock) {
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
        ({ level, from, to }) =>
        ({ editor, state, chain }) => {
          const { doc } = state;
          const headingType = state.schema.nodes.heading;
          const paragraphType = state.schema.nodes.paragraph;

          if (!headingType || !paragraphType) {
            return false;
          }

          if (!isPartialTextblockSelection({ from, to, doc })) {
            return chain().setTextSelection({ from, to }).toggleHeading({ level }).focus().run();
          }

          const $from = doc.resolve(from);
          const blockStart = $from.start();
          const blockEnd = $from.end();

          let tr = state.tr;

          if (to < blockEnd && canSplit(tr.doc, to)) {
            tr = tr.split(to);
          }

          const mappedFrom = tr.mapping.map(from);
          const $mappedFrom = tr.doc.resolve(mappedFrom);

          if (mappedFrom > $mappedFrom.start() && canSplit(tr.doc, mappedFrom)) {
            tr = tr.split(mappedFrom);
          }

          const selectionAnchor = tr.mapping.map(from);
          const selectionHead = tr.mapping.map(to, -1);
          const blockPos = getTextblockPos(tr.doc, selectionAnchor);

          if (blockPos === null) {
            return false;
          }

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

          const mappedHead = tr.mapping.map(selectionHead);
          tr = tr.setSelection(
            TextSelection.create(tr.doc, Math.max(1, selectionAnchor), Math.max(1, mappedHead + 1)),
          );

          editor.view.dispatch(tr.scrollIntoView());
          editor.commands.focus();
          return true;
        },
    };
  },
});
