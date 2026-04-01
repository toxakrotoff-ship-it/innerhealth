import Image from 'next/image';
import Link from 'next/link';
import { AddToCartButton } from '@/components/site/add-to-cart-button';
import { CompareToggleButton } from '@/components/site/compare-toggle-button';
import { ProductQuickView } from '@/components/site/product-quick-view';

interface ProductListRowProps {
  id: string;
  title: string;
  sku?: string | null;
  showSku?: boolean;
  price: number;
  priceOld?: number | null;
  photo?: string | null;
  slug?: string | null;
  isPromoEligible?: boolean;
  discountPrice?: number | null;
  quantity?: number | null;
  isPreorderEnabled?: boolean;
}

export function ProductListRow({
  id,
  title,
  sku,
  showSku = true,
  price,
  priceOld,
  photo,
  slug,
  isPromoEligible = true,
  discountPrice = null,
  quantity = null,
  isPreorderEnabled = false,
}: ProductListRowProps) {
  const detailHref = slug ? `/product/${slug}` : `/product/id/${id}`;
  const isUnavailable = quantity != null && quantity <= 0 && !isPreorderEnabled;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 lg:p-5 2xl:p-6 3xl:p-7">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_minmax(0,1fr)] lg:grid-cols-[140px_minmax(0,1fr)] 2xl:grid-cols-[160px_minmax(0,1fr)] 3xl:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative aspect-square rounded-xl bg-highlight-blue overflow-hidden">
          {photo ? (
            <Image
              src={
                photo.startsWith('http://') || photo.startsWith('https://')
                  ? photo
                  : photo.startsWith('/')
                    ? photo
                    : `/${photo.replace(/^\//, '')}`
              }
              alt={title}
              fill
              className="object-contain object-center"
              unoptimized={photo.startsWith('http://') || photo.startsWith('https://')}
            />
          ) : (
            <span className="flex h-full items-center justify-center text-action-blue/40 text-3xl">?</span>
          )}
        </div>
        <div className="min-w-0">
          <Link href={detailHref} className="text-base font-semibold text-text hover:text-action-blue transition-colors">
            {title}
          </Link>
          {showSku && sku?.trim() && (
            <div className="mt-1 text-xs text-gray-500">SKU: {sku.trim()}</div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-semibold text-text">{price.toLocaleString('ru-RU')} ₽</span>
            {priceOld != null && priceOld > price && (
              <span className="text-sm text-gray-500 line-through">{priceOld.toLocaleString('ru-RU')} ₽</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AddToCartButton
              productId={id}
              title={title}
              price={price}
              photo={photo ?? null}
              slug={slug ?? null}
              hasPromoPrice={priceOld != null && priceOld > price}
              isPromoEligible={isPromoEligible}
              discountPrice={discountPrice}
              disabled={isUnavailable}
              size="sm"
            />
            <ProductQuickView
              id={id}
              title={title}
              price={price}
              priceOld={priceOld}
              photo={photo}
              slug={slug}
              isPromoEligible={isPromoEligible}
              discountPrice={discountPrice}
              quantity={quantity}
              isPreorderEnabled={isPreorderEnabled}
            />
            <CompareToggleButton productId={id} compact />
          </div>
        </div>
      </div>
    </article>
  );
}
