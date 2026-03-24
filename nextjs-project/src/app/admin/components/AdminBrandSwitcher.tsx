'use client';

import { usePathname } from 'next/navigation';
import { getBrandDefinitions, isBrandId, normalizeBrandId, type BrandId } from '@/lib/brand/brand';

interface AdminBrandSwitcherProps {
  adminBasePath: string;
  activeBrand: BrandId;
}

function buildBrandHref(adminBasePath: string, pathname: string, targetBrand: BrandId): string {
  const adminPrefix = `/${adminBasePath}`;
  if (!pathname.startsWith(adminPrefix)) {
    return `${adminPrefix}/${targetBrand}`;
  }

  const pathWithoutPrefix = pathname
    .slice(adminPrefix.length)
    .replace(/^\/+/, '');

  const segments = pathWithoutPrefix ? pathWithoutPrefix.split('/') : [];
  const restSegments = segments.length > 0 && isBrandId(segments[0]) ? segments.slice(1) : segments;

  const restPath = restSegments.length > 0 ? `/${restSegments.join('/')}` : '';
  return `${adminPrefix}/${targetBrand}${restPath}`;
}

export function AdminBrandSwitcher({ adminBasePath, activeBrand }: AdminBrandSwitcherProps) {
  const pathname = usePathname();
  const brands = getBrandDefinitions();
  const parsedPathBrand = normalizeBrandId(pathname.split('/')[2] || null);
  const currentBrand = parsedPathBrand ?? activeBrand;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white p-1">
      {brands.map((brand) => {
        const isActive = brand.id === currentBrand;
        const href = buildBrandHref(adminBasePath, pathname, brand.id);

        return (
          <a
            key={brand.id}
            href={href}
            onClick={(event) => {
              // Force full page reload when switching brand to reset all client state.
              event.preventDefault();
              window.location.assign(href);
            }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              isActive
                ? 'bg-action-blue text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {brand.label}
          </a>
        );
      })}
    </div>
  );
}

