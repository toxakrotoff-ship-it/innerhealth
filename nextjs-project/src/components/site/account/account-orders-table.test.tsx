import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

import { AccountOrdersTable } from './account-orders-table'

vi.mock('next/link', () => {
  interface NextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    readonly href: string
    readonly children: React.ReactNode
  }

  function NextLink({ href, children, ...props }: NextLinkProps) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }

  return { default: NextLink }
})

describe('AccountOrdersTable', () => {
  it('renders desktop header "ID заказа" instead of "Заказ"', () => {
    render(
      <AccountOrdersTable
        items={[
          {
            id: 'order_1',
            status: 'pending',
            total: 123.45,
            createdAt: new Date('2026-03-27T10:00:00.000Z'),
          },
        ]}
        page={1}
        totalPages={1}
      />,
    )

    expect(screen.getByText('ID заказа', { selector: 'th' })).toBeInTheDocument()
    expect(screen.queryByText('Заказ', { selector: 'th' })).not.toBeInTheDocument()
  })

  it('renders pending status badge label and amber classes', () => {
    render(
      <AccountOrdersTable
        items={[
          {
            id: 'order_1',
            status: 'pending',
            total: 123.45,
            createdAt: new Date('2026-03-27T10:00:00.000Z'),
          },
        ]}
        page={1}
        totalPages={1}
      />,
    )

    const badge = screen.getAllByText('В обработке')[0]
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-amber-100')
    expect(badge.className).toContain('text-amber-800')
  })

  it('renders CDEK track number when present', () => {
    render(
      <AccountOrdersTable
        items={[
          {
            id: 'order_1',
            status: 'paid',
            total: 123.45,
            createdAt: new Date('2026-03-27T10:00:00.000Z'),
            cdekTrackNumber: '1234567890123',
          },
        ]}
        page={1}
        totalPages={1}
      />,
    )

    expect(screen.getAllByText(/1234567890123/).length).toBeGreaterThan(0)
  })
})
