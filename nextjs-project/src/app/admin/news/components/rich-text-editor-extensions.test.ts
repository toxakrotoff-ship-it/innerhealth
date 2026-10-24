/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import { Editor, generateHTML, generateJSON } from '@tiptap/core'
import { buildRichTextEditorExtensions } from './rich-text-editor-extensions'

let editor: Editor | undefined
afterEach(() => {
  editor?.destroy()
  editor = undefined
})

describe('rich text compatibility', () => {
  it('preserves saved headings, marks, links, images and tables through HTML round trip', () => {
    const extensions = buildRichTextEditorExtensions('Текст')
    const content = '<h2>Состав</h2><p><strong>Витамины</strong> <u>ежедневно</u> <a href="https://example.test">Подробнее</a></p><img src="/images/product.png" alt="Товар"><table><tbody><tr><th><p>Название</p></th><th><p>Доза</p></th></tr><tr><td><p>Магний</p></td><td><p>100 мг</p></td></tr></tbody></table>'
    const json = generateJSON(content, extensions)
    const html = generateHTML(json, extensions)
    const container = document.createElement('div')
    container.innerHTML = html
    expect(container.querySelector('h2')?.textContent).toBe('Состав')
    expect(container.querySelector('strong')?.textContent).toBe('Витамины')
    expect(container.querySelector('u')?.textContent).toBe('ежедневно')
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.test')
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/images/product.png')
    expect(container.querySelectorAll('th')).toHaveLength(2)
    expect(container.querySelectorAll('td')).toHaveLength(2)
    expect(container.querySelector('table')?.textContent).toContain('100 мг')
    expect(generateJSON(html, extensions)).toEqual(json)
  })

  it('mounts the actual editor and supports editing, undo and table insertion', () => {
    editor = new Editor({
      element: document.createElement('div'),
      extensions: buildRichTextEditorExtensions('Текст'),
      content: '<p>Состав</p>',
    })
    expect(editor.commands.insertContentAt(7, ' товара')).toBe(true)
    expect(editor.getText()).toBe('Состав товара')
    expect(editor.commands.undo()).toBe(true)
    expect(editor.getText()).toBe('Состав')
    expect(editor.commands.insertTable({ rows: 2, cols: 2, withHeaderRow: true })).toBe(true)
    expect(editor.getHTML()).toContain('<table')
    expect(editor.getJSON().content?.some((node) => node.type === 'table')).toBe(true)
  })
})
