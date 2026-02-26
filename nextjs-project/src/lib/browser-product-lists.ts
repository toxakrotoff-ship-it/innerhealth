export const COMPARE_STORAGE_KEY = 'innerhealth-compare-products';
export const RECENTLY_VIEWED_STORAGE_KEY = 'innerhealth-recently-viewed-products';
export const MAX_COMPARE_ITEMS = 6;
export const MAX_RECENTLY_VIEWED_ITEMS = 20;

function readIds(storageKey: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  } catch {
    return [];
  }
}

function writeIds(storageKey: string, ids: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(ids));
}

export function getCompareIds(): string[] {
  return readIds(COMPARE_STORAGE_KEY);
}

export function toggleCompareId(productId: string): {
  ids: string[];
  isSelected: boolean;
  error?: string;
} {
  const current = getCompareIds();
  if (current.includes(productId)) {
    const next = current.filter((id) => id !== productId);
    writeIds(COMPARE_STORAGE_KEY, next);
    return { ids: next, isSelected: false };
  }

  if (current.length >= MAX_COMPARE_ITEMS) {
    return {
      ids: current,
      isSelected: false,
      error: `Можно сравнивать не более ${MAX_COMPARE_ITEMS} товаров`,
    };
  }

  const next = [...current, productId];
  writeIds(COMPARE_STORAGE_KEY, next);
  return { ids: next, isSelected: true };
}

export function isInCompare(productId: string): boolean {
  return getCompareIds().includes(productId);
}

export function clearCompareIds(): void {
  writeIds(COMPARE_STORAGE_KEY, []);
}

export function getRecentlyViewedIds(): string[] {
  return readIds(RECENTLY_VIEWED_STORAGE_KEY);
}

export function pushRecentlyViewedId(productId: string): string[] {
  const ids = getRecentlyViewedIds();
  const withoutCurrent = ids.filter((id) => id !== productId);
  const next = [productId, ...withoutCurrent].slice(0, MAX_RECENTLY_VIEWED_ITEMS);
  writeIds(RECENTLY_VIEWED_STORAGE_KEY, next);
  return next;
}
