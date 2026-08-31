-- The first character in the original slug was Cyrillic "с" (U+0441), not
-- Latin "c" (U+0063), so the visually identical public URL returned 404.
UPDATE "Category"
SET
  "slug" = 'crema-i-mazi',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "brand" = 'sprint-power'
  AND "slug" = 'сrema-i-mazi';
