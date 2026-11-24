-- Stored CMS overrides take precedence over the code defaults.
UPDATE "ContentBlock" AS block
SET "text" = copy."text", "updatedAt" = CURRENT_TIMESTAMP
FROM (VALUES
  ('home', 'hero.cta.secondary', 'Хиты продаж'),
  ('home', 'hero.cta.secondary.href', '#hits'),
  ('footer', 'footer.brand.description', 'Спортивное питание и продукты для активной жизни'),
  ('sotrudnichestvo', 'cooperation.title', 'Партнёрство')
) AS copy("page", "key", "text")
WHERE block."brand" = 'sprint-power'
  AND block."page" = copy."page"
  AND block."key" = copy."key"
  AND block."text" IS DISTINCT FROM copy."text";

-- Rename only SCULPT SAUNA usage titles; preserve tab content, order and metadata.
UPDATE "Product"
SET
  "tab1Title" = CASE WHEN btrim("tab1Title") = 'Как принимать' THEN 'Как использовать' ELSE "tab1Title" END,
  "tab2Title" = CASE WHEN btrim("tab2Title") = 'Как принимать' THEN 'Как использовать' ELSE "tab2Title" END,
  "tab3Title" = CASE
    WHEN btrim("tab3Title") = 'Как принимать'
      OR (NULLIF(btrim("tab3Title"), '') IS NULL AND NULLIF(btrim("tab3"), '') IS NOT NULL)
    THEN 'Как использовать' ELSE "tab3Title" END,
  "tab4Title" = CASE WHEN btrim("tab4Title") = 'Как принимать' THEN 'Как использовать' ELSE "tab4Title" END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "brand" = 'sprint-power'
  AND "title" ~* 'SCULPT[[:space:]]+SAUNA'
  AND (
    'Как принимать' IN (btrim("tab1Title"), btrim("tab2Title"), btrim("tab3Title"), btrim("tab4Title"))
    OR (NULLIF(btrim("tab3Title"), '') IS NULL AND NULLIF(btrim("tab3"), '') IS NOT NULL)
  );

WITH renamed AS (
  SELECT product."id", jsonb_agg(
    CASE
      WHEN btrim(tab.value->>'title') = 'Как принимать'
        OR (tab.value->>'key' = 'usage' AND NULLIF(btrim(tab.value->>'title'), '') IS NULL)
      THEN jsonb_set(tab.value, '{title}', to_jsonb('Как использовать'::text))
      ELSE tab.value
    END ORDER BY tab.position
  ) AS tabs
  FROM "Product" AS product
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(product."tabs") = 'array' THEN product."tabs" ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS tab(value, position)
  WHERE product."brand" = 'sprint-power'
    AND product."title" ~* 'SCULPT[[:space:]]+SAUNA'
  GROUP BY product."id"
)
UPDATE "Product" AS product
SET "tabs" = renamed.tabs, "updatedAt" = CURRENT_TIMESTAMP
FROM renamed
WHERE product."id" = renamed."id"
  AND product."tabs" IS DISTINCT FROM renamed.tabs;
