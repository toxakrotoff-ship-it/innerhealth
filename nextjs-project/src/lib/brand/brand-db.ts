import type { BrandId } from '@/lib/brand/brand';

export function resolveDbBrand(brandId: BrandId | null | undefined): BrandId {
  if (brandId === 'sprint-power') return 'sprint-power';
  return 'inner';
}
