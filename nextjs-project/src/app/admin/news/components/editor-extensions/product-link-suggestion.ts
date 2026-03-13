import { Mark, mergeAttributes } from '@tiptap/core'
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion'

interface ProductSuggestionItem {
  id: string
  title: string
  slug: string | null
  sku: string | null
}

export interface ProductLinkOptions {
  HTMLAttributes: Record<string, unknown>
  suggestion: Omit<SuggestionOptions<ProductSuggestionItem>, 'editor'>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    productLink: {
      setProductLink: (attrs: { href: string }) => ReturnType
      unsetProductLink: () => ReturnType
    }
  }
}

export const ProductLink = Mark.create<ProductLinkOptions>({
  name: 'productLink',

  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      suggestion: {
        char: '@',
        startOfLine: false,
        allowSpaces: false,
        render: () => {
          let element: HTMLDivElement | null = null
          let listElement: HTMLUListElement | null = null
          let items: ProductSuggestionItem[] = []
          let selectedIndex = 0

          const selectItem = (index: number) => {
            const item = items[index]
            if (!item) return
            ;(props as any).command(item)
          }

          const updateSelected = () => {
            if (!listElement) return
            const children = Array.from(listElement.querySelectorAll('li'))
            children.forEach((child, idx) => {
              child.classList.toggle('bg-gray-100', idx === selectedIndex)
            })
          }

          let props: { command: (item: ProductSuggestionItem) => void } | null = null

          return {
            onStart(startProps) {
              props = { command: startProps.command }
              items = startProps.items
              selectedIndex = 0

              element = document.createElement('div')
              element.className =
                'z-50 rounded-md border border-gray-200 bg-white shadow-lg text-sm overflow-hidden'

              listElement = document.createElement('ul')
              listElement.className = 'max-h-64 overflow-auto'
              element.appendChild(listElement)

              this.update(startProps)

              document.body.appendChild(element)
            },
            onUpdate(updateProps) {
              if (!element || !listElement) return

              items = updateProps.items
              if (selectedIndex >= items.length) selectedIndex = 0

              const { clientRect } = updateProps.clientRect ?? {}
              if (clientRect) {
                element.style.position = 'absolute'
                element.style.left = `${clientRect.left + window.scrollX}px`
                element.style.top = `${clientRect.bottom + window.scrollY + 4}px`
              }

              listElement.innerHTML = ''

              if (items.length === 0) {
                const emptyItem = document.createElement('div')
                emptyItem.className = 'px-3 py-2 text-gray-400'
                emptyItem.textContent = 'Ничего не найдено'
                listElement.appendChild(emptyItem)
                return
              }

              items.forEach((item, index) => {
                const li = document.createElement('li')
                li.className =
                  'px-3 py-1.5 cursor-pointer hover:bg-gray-100 flex flex-col'
                const titleSpan = document.createElement('span')
                titleSpan.textContent = item.title
                titleSpan.className = 'text-gray-900'
                li.appendChild(titleSpan)

                if (item.sku || item.slug) {
                  const meta = document.createElement('span')
                  meta.className = 'text-xs text-gray-500'
                  meta.textContent = [item.sku, item.slug ? `/catalog/${item.slug}` : null]
                    .filter(Boolean)
                    .join(' · ')
                  li.appendChild(meta)
                }

                li.addEventListener('mousedown', (event) => {
                  event.preventDefault()
                  selectedIndex = index
                  updateSelected()
                  selectItem(index)
                })

                listElement.appendChild(li)
              })

              updateSelected()
            },
            onKeyDown(keyProps) {
              if (keyProps.event.key === 'ArrowDown') {
                selectedIndex = (selectedIndex + 1) % (items.length || 1)
                updateSelected()
                return true
              }
              if (keyProps.event.key === 'ArrowUp') {
                selectedIndex = (selectedIndex - 1 + (items.length || 1)) % (items.length || 1)
                updateSelected()
                return true
              }
              if (keyProps.event.key === 'Enter') {
                selectItem(selectedIndex)
                return true
              }
              if (keyProps.event.key === 'Escape') {
                keyProps.command({ exit: true })
                return true
              }
              return false
            },
            onExit() {
              if (element && element.parentNode) {
                element.parentNode.removeChild(element)
              }
              element = null
              listElement = null
              items = []
              selectedIndex = 0
              props = null
            },
          }
        },
      },
    }
  },

  addAttributes() {
    return {
      href: {
        default: null,
      },
      target: {
        default: '_blank',
      },
      rel: {
        default: 'noopener noreferrer',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-product-link]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-product-link': 'true',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setProductLink:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetProductLink:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },

  addProseMirrorPlugins() {
    const self = this

    return [
      Suggestion<ProductSuggestionItem>({
        editor: this.editor,
        ...this.options.suggestion,
        command: ({ editor, range, props }) => {
          const slug = props.slug
          if (!slug) {
            editor
              .chain()
              .focus()
              .insertContentAt(range, props.title)
              .run()
            return
          }

          const href = `/catalog/${slug}`

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: 'text',
                text: props.title,
                marks: [
                  {
                    type: self.name,
                    attrs: {
                      href,
                      target: '_blank',
                      rel: 'noopener noreferrer',
                    },
                  },
                ],
              },
              { type: 'text', text: ' ' },
            ])
            .run()
        },
      }),
    ]
  },
})

