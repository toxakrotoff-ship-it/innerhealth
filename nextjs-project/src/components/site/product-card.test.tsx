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
        weight={210}
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

    expect(screen.getByText('210 г')).toBeInTheDocument()
  })

  it('shows size badge instead of repeating parentheses segment in the title', () => {
    render(
      <ProductCard
        id="p-2"
        title="Биойодин (90 капсул)"
        price={1200}
        slug="bioiodine"
        quantity={5}
      />
    )

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Биойодин')
    expect(screen.getByRole('heading', { level: 3 })).not.toHaveTextContent('90 капсул')
    expect(screen.getByText('90 капсул')).toBeInTheDocument()
  })

  it('makes the whole card a click target to the product page, in addition to the "Подробнее" link', () => {
    const { container } = render(
      <ProductCard id="p-3" title="Магний B6" price={900} slug="magnesium-b6" quantity={5} />
    )

    const links = container.querySelectorAll('a[href="/product/magnesium-b6"]')
    expect(links).toHaveLength(2)

    const detailsLink = screen.getByText('Подробнее').closest('a')
    expect(detailsLink).toHaveAttribute('href', '/product/magnesium-b6')

    const stretchedLink = Array.from(links).find((link) => link !== detailsLink)
    expect(stretchedLink).toHaveAttribute('aria-hidden')
    expect(stretchedLink).toHaveAttribute('tabIndex', '-1')
    expect(stretchedLink?.className).toContain('absolute')
    expect(stretchedLink?.className).toContain('inset-0')
  })

  it('omits the whole-card click target when showDetailsButton is false', () => {
    const { container } = render(
      <ProductCard
        id="p-4"
        title="Магний B6"
        price={900}
        slug="magnesium-b6"
        quantity={5}
        showDetailsButton={false}
      />
    )

    expect(container.querySelectorAll('a[href="/product/magnesium-b6"]')).toHaveLength(0)
  })
})
