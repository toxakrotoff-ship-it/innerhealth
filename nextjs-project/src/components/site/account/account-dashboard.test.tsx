// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountDashboard } from '@/components/site/account/account-dashboard'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

function getEmailOccurrencesCount(email: string): number {
  const normalizedEmail = email.trim().toLowerCase()
  return screen.queryAllByText((_, element) => {
    const normalizedText = element?.textContent?.trim().toLowerCase()
    const isLeafNode = (element?.childElementCount ?? 0) === 0
    return normalizedText === normalizedEmail && isLeafNode
  }).length
}

describe('AccountDashboard', () => {
  it('renders distinct name and email', () => {
    render(
      <AccountDashboard
        userName="Jane Doe"
        userEmail="jane@example.com"
        orderCount={3}
        totalSpent={1200}
      />,
    )

    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(getEmailOccurrencesCount('jane@example.com')).toBe(1)
  })

  it('renders only email when name is empty', () => {
    render(
      <AccountDashboard
        userName="   "
        userEmail="empty-name@example.com"
        orderCount={0}
        totalSpent={0}
      />,
    )

    expect(screen.getByText('empty-name@example.com')).toBeInTheDocument()
    expect(getEmailOccurrencesCount('empty-name@example.com')).toBe(1)
  })

  it('renders only email when name equals email ignoring case/whitespace', () => {
    render(
      <AccountDashboard
        userName="  TEST@EXAMPLE.COM  "
        userEmail="test@example.com"
        orderCount={1}
        totalSpent={10}
      />,
    )

    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    expect(getEmailOccurrencesCount('test@example.com')).toBe(1)
  })
})

