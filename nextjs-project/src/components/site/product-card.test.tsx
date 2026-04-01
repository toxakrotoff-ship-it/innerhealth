/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProductCard } from './product-card'

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} {...props} />,
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/site/add-to-cart-button', () => ({
  AddToCartButton: ({ disabled, className }: { disabled?: boolean; className?: string }) => (
    <button type="button" className={className} disabled={disabled}>
      {disabled ? 'Товар закончился' : 'В корзину'}
    </button>
  ),
}))

vi.mock('@/components/site/wishlist-toggle-button', () => ({
  WishlistToggleButton: () => <button type="button">Wishlist</button>,
}))

vi.mock('@/components/site/product-quick-view', () => ({
  ProductQuickView: () => <button type="button">Quick view</button>,
}))

vi.mock('@/components/ui/scroll-reveal', () => ({
  ScrollReveal: ({ as: Component = 'div', children, ...props }: { as?: keyof React.JSX.IntrinsicElements; children: React.ReactNode }) => (
    <Component {...props}>{children}</Component>
  ),
}))

describe('ProductCard', () => {
  it('uses overflow-safe classes for mobile catalog content', () => {
    render(
      <ProductCard
        id="p-1"
        title="ОченьДлинноеНазваниеТовараБезПробеловЧтобыПроверитьПеренос"
        sku="SKU-SUPER-LONG-WITHOUT-SPACES-1234567890"
        showSku
        price={2600}
        slug="broth"
        quantity={0}
      />
    )

    const title = screen.getByRole('heading', { level: 3 })
    expect(title.className).toContain('[overflow-wrap:anywhere]')
    expect(title.className).toContain('break-words')

    const sku = screen.getByText(/SKU:/)
    expect(sku.className).toContain('overflow-hidden')
    expect(sku.className).toContain('text-ellipsis')

    const addToCart = screen.getByText('Товар закончился')
    expect(addToCart.className).toContain('w-full')
  })
})
