/**
 * Shared frontend/backend types for type safety across the app.
 */

/** Product fields for catalog and home product cards (no photos Json). */
export interface ProductCardDTO {
  id: string;
  title: string;
  price: number;
  priceOld: number | null;
  photo: string | null;
  slug: string | null;
  isPromoEligible?: boolean;
  discountPrice?: number | null;
}

/** Minimal cart item shape (e.g. persisted in localStorage or API payload). */
export interface CartItem {
  productId: string;
  quantity: number;
}

/** Cart line with optional display details (enriched from API). */
export interface CartLineDetails {
  title?: string;
  price?: number;
  photo?: string | null;
  slug?: string | null;
  hasPromoPrice?: boolean;
  isPromoEligible?: boolean;
  discountPrice?: number | null;
}
