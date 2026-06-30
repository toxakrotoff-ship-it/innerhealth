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

function clampSelectionRange(doc: Parameters<typeof TextSelection.create>[0], from: number, to: number): { from: number; to: number } {
  const docSize = doc.content.size;
  const safeFrom = Math.min(Math.max(from, 0), docSize);
  const safeTo = Math.min(Math.max(to, safeFrom), docSize);
  return { from: safeFrom, to: safeTo };
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
        ({ state, chain }) => {
          const { doc } = state;
          const headingType = state.schema.nodes.heading;
          const paragraphType = state.schema.nodes.paragraph;

          if (!headingType || !paragraphType) {
            return false;
          }

          if (!isPartialTextblockSelection({ from, to, doc })) {
            return chain().setTextSelection({ from, to }).toggleHeading({ level }).focus().run();
          }

          return chain()
            .command(({ tr, state: commandState }) => {
              const $from = commandState.doc.resolve(from);
              const blockEnd = $from.end();

              if (to < blockEnd && canSplit(tr.doc, to)) {
                tr.split(to);
              }

              const mappedFrom = tr.mapping.map(from);
              const $mappedFrom = tr.doc.resolve(mappedFrom);

              if (mappedFrom > $mappedFrom.start() && canSplit(tr.doc, mappedFrom)) {
                tr.split(mappedFrom);
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

              tr.setNodeMarkup(
                blockPos,
                isAlreadyHeading ? paragraphType : headingType,
                isAlreadyHeading ? {} : { level },
              );

              const mappedHead = tr.mapping.map(selectionHead);
              const { from: selFrom, to: selTo } = clampSelectionRange(tr.doc, selectionAnchor, mappedHead + 1);
              tr.setSelection(TextSelection.create(tr.doc, selFrom, selTo));
              return true;
            })
            .focus()
            .run();
        },
    };
  },
});
