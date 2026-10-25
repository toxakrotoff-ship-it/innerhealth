import 'server-only';
import type { BrandId } from '@/lib/brand/brand';
import { parseOzonConnectionSettings, readOzonSettings } from './settings';

export interface OzonDeliveryConfig {
  clientId: string;
  clientSecret: string;
  shipmentMethodId: number;
  handlingHours: number;
}

/** Server settings only. Global is shared unless the storefront overrides it. */
export async function getOzonDeliveryConfig(brandId: BrandId | null, options: { includeDisabled?: boolean } = {}): Promise<OzonDeliveryConfig | null> {
  const settings = await readOzonSettings(brandId);
  if (settings.ozon_enabled !== '1' && !options.includeDisabled) return null;
  return parseOzonConnectionSettings(settings);
}
