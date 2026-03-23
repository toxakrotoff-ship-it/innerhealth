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
})
