import Link from 'next/link';
import { getBrandDefinitions, type BrandId } from '@/lib/brand/brand';

interface AccountBrandSwitcherProps {
  activeBrand: BrandId;
  targetPath: string;
  visibleBrandIds: readonly BrandId[];
  className?: string;
}

export function AccountBrandSwitcher({
  activeBrand,
  targetPath,
  visibleBrandIds,
  className,
}: AccountBrandSwitcherProps) {
  if (visibleBrandIds.length <= 1) return null;

  const visibleBrandIdSet = new Set<BrandId>(visibleBrandIds);
  const brands = getBrandDefinitions().filter((brand) => visibleBrandIdSet.has(brand.id));
  if (brands.length <= 1) return null;

  return (
    <div className={className}>
      <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1">
        {brands.map((brand) => {
          const isActive = brand.id === activeBrand;
          return (
            <Link
              key={brand.id}
              href={`${targetPath}?brand=${brand.id}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                isActive
                  ? 'bg-action-blue text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {brand.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

