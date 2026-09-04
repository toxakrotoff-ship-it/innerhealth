/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupedProductCard } from './grouped-product-card'
import type { ProductListingGroup } from '@/lib/product-grouping'

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

function buildGroup(overrides?: Partial<ProductListingGroup>): ProductListingGroup {
  return {
    kind: 'group',
    parentUid: 'parent-1',
    baseTitle: 'Пептиды коллагена',
    defaultVariantId: 'v-1',
    flavorOptions: [
      { id: 'v-1', label: 'Капучино', isAvailable: true },
      { id: 'v-2', label: 'Lemon&Lime', isAvailable: true },
    ],
    variants: [
      {
        id: 'v-1',
        parentUid: 'parent-1',
        title: 'Пептиды коллагена (Капучино)',
        brand: 'inner',
        sku: 'SKU-1',
        price: 1600,
        priceOld: null,
        quantity: 5,
        photo: null,
        slug: 'peptidy-kollagena-kapuchino',
        isPromoEligible: true,
        discountPrice: null,
      },
      {
        id: 'v-2',
        parentUid: 'parent-1',
        title: 'Пептиды коллагена (Lemon&Lime)',
        brand: 'inner',
        sku: 'SKU-2',
        price: 1600,
        priceOld: null,
        quantity: 5,
        photo: null,
        slug: 'peptidy-kollagena-lemonlime',
        isPromoEligible: true,
        discountPrice: null,
      },
    ],
    ...overrides,
  }
}

describe('GroupedProductCard', () => {
  it('makes the whole card a click target to the active variant, in addition to the "Подробнее" link', () => {
    const { container } = render(<GroupedProductCard group={buildGroup()} />)

    const links = container.querySelectorAll('a[href="/product/peptidy-kollagena-kapuchino"]')
    expect(links).toHaveLength(2)

    const detailsLink = screen.getByText('Подробнее').closest('a')
    const stretchedLink = Array.from(links).find((link) => link !== detailsLink)
    expect(stretchedLink).toHaveAttribute('aria-hidden')
    expect(stretchedLink).toHaveAttribute('tabIndex', '-1')
    expect(stretchedLink?.className).toContain('absolute')
    expect(stretchedLink?.className).toContain('inset-0')
  })

  it('omits the whole-card click target when showDetailsButton is false', () => {
    const { container } = render(<GroupedProductCard group={buildGroup()} showDetailsButton={false} />)

    expect(container.querySelectorAll('a[href="/product/peptidy-kollagena-kapuchino"]')).toHaveLength(0)
  })
})
