'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProductCard } from '@/components/site/product-card';
import { getRecentlyViewedIds } from '@/lib/browser-product-lists';

interface RecentlyViewedProductsProps {
  title?: string;
  excludeProductId?: string;
  limit?: number;
}

interface RecentlyViewedProductItem {
  id: string;
  title: string;
  brand: string | null;
  sku: string | null;
  price: number;
  priceOld: number | null;
  photo: string | null;
  slug: string | null;
  isPromoEligible: boolean | null;
  discountPrice: number | null;
  quantity: number | null;
  isPreorderEnabled: boolean;
}

export function RecentlyViewedProducts({
  title = 'Недавно просмотренные',
  excludeProductId,
  limit = 8,
}: RecentlyViewedProductsProps) {
  const [items, setItems] = useState<RecentlyViewedProductItem[]>([]);

  const ids = useMemo(() => {
    const viewed = getRecentlyViewedIds();
    const filtered = excludeProductId ? viewed.filter((id) => id !== excludeProductId) : viewed;
    return filtered.slice(0, limit);
  }, [excludeProductId, limit]);

  useEffect(() => {
    if (ids.length === 0) {
      setItems([]);
      return;
    }

    const controller = new AbortController();
    fetch(`/api/products/cart-items?ids=${ids.join(',')}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => setItems([]));

    return () => controller.abort();
  }, [ids]);

  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-text mb-4">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            title={product.title}
            brand={product.brand}
            sku={product.sku}
            price={product.price}
            priceOld={product.priceOld}
            photo={product.photo}
            slug={product.slug}
            isPromoEligible={product.isPromoEligible ?? true}
            discountPrice={product.discountPrice}
            quantity={product.quantity}
            isPreorderEnabled={product.isPreorderEnabled}
          />
        ))}
      </div>
    </section>
  );
}
