// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TipTapDocRenderer } from './tiptap-doc-renderer'

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

describe('TipTapDocRenderer', () => {
  it('renders text with link mark as anchor', () => {
    const raw = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Читать раздел',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: '/news',
                  },
                },
              ],
            },
          ],
        },
      ],
    }

    const { container } = render(<TipTapDocRenderer raw={raw} />)
    const anchor = container.querySelector('a')

    expect(anchor).not.toBeNull()
    expect(anchor).toHaveAttribute('href', '/news')
  })

  it('renders images at natural aspect ratio without a fixed 16:9 crop', () => {
    const raw = {
      type: 'doc',
      content: [
        {
          type: 'image',
          attrs: {
            src: '/uploads/test.jpg',
            alt: 'Test',
          },
        },
      ],
    }

    const { container } = render(<TipTapDocRenderer raw={raw} />)
    const img = container.querySelector('img')

    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('src', '/uploads/test.jpg')
    expect(img?.className).toMatch(/max-w-full/)
    expect(img?.className).toMatch(/max-h-\[min\(85vh,56rem\)\]/)
    expect(img?.className).toMatch(/h-auto/)
  })

  it('renders TipTap table nodes', () => {
    const raw = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Компонент' }],
                    },
                  ],
                },
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: '100%' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const { container } = render(<TipTapDocRenderer raw={raw} />)
    expect(container.querySelector('table')).not.toBeNull()
    expect(container.querySelector('th')?.textContent).toContain('Компонент')
    expect(container.querySelector('td')?.textContent).toContain('100%')
  })

  it('uses high-contrast table cells when tone is dark', () => {
    const raw = {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'A' }],
                    },
                  ],
                },
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'B' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }

    const { container } = render(<TipTapDocRenderer raw={raw} tone="dark" />)
    expect(container.querySelector('td')?.className).toMatch(/text-slate-200/)
    expect(container.querySelector('th')?.className).toMatch(/text-slate-50/)
  })

  it('renders superscript and subscript marks', () => {
    const raw = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Витамин B' },
            { type: 'text', text: '2', marks: [{ type: 'subscript' }] },
            { type: 'text', text: ' и м' },
            { type: 'text', text: '2', marks: [{ type: 'superscript' }] },
          ],
        },
      ],
    }

    const { container } = render(<TipTapDocRenderer raw={raw} />)

    expect(container.querySelector('sub')?.textContent).toBe('2')
    expect(container.querySelector('sup')?.textContent).toBe('2')
  })
})
