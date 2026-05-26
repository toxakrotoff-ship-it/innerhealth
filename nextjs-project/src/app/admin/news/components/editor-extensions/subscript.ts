import { Mark, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    subscript: {
      setSubscript: () => ReturnType
      toggleSubscript: () => ReturnType
      unsetSubscript: () => ReturnType
    }
  }
}

export const Subscript = Mark.create({
  name: 'subscript',

  excludes: 'superscript',

  parseHTML() {
    return [{ tag: 'sub' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['sub', mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setSubscript:
        () =>
        ({ commands }) =>
          commands.setMark(this.name),
      toggleSubscript:
        () =>
        ({ chain }) =>
          chain().unsetMark('superscript').toggleMark(this.name).run(),
      unsetSubscript:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },
})
