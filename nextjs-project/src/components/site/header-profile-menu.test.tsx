/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HeaderProfileMenu } from './header-profile-menu'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
}))

describe('HeaderProfileMenu', () => {
  it('uses a relative admin link for authenticated admin users', () => {
    render(<HeaderProfileMenu isAuthenticated role="ADMIN" />)

    fireEvent.click(screen.getByTitle('Управление сайтом'))
    const adminLink = screen.getByText('Управление сайтом').closest('a')

    expect(adminLink).toHaveAttribute('href', '/admin')
  })
})
