export const MAX_CATEGORY_TEASER_LENGTH = 160;

export function normalizeCategoryTeaser(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
