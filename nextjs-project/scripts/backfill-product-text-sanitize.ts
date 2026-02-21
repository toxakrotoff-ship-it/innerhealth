#!/usr/bin/env ts-node
/**
 * Очистка полей description, text, tab1–tab4, tab1Title–tab4Title у всех товаров
 * от разметки Тильды (info|#|…|#|, chars|#|…) и HTML.
 *
 * Запуск из nextjs-project: npx ts-node scripts/backfill-product-text-sanitize.ts
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import { prisma } from '../src/lib/prisma';
import { sanitizeProductText, PRODUCT_TEXT_FIELDS } from '../src/lib/sanitize-text';

async function backfillSanitize() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      text: true,
      tab1: true,
      tab2: true,
      tab3: true,
      tab4: true,
      tab1Title: true,
      tab2Title: true,
      tab3Title: true,
      tab4Title: true,
    },
  });

  let updated = 0;
  for (const product of products) {
    const data: Record<string, string | null> = {};
    let changed = false;
    for (const key of PRODUCT_TEXT_FIELDS) {
      const raw = (product as Record<string, unknown>)[key];
      const value = typeof raw === 'string' ? raw : null;
      const cleaned = value ? sanitizeProductText(value) || null : null;
      if (value !== cleaned) changed = true;
      data[key] = cleaned;
    }
    if (changed) {
      await prisma.product.update({
        where: { id: product.id },
        data,
      });
      updated++;
      console.log(`[OK] ${product.title.slice(0, 50)}...`);
    }
  }
  console.log(`\nГотово. Обновлено ${updated} из ${products.length} товаров.`);
}

backfillSanitize()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
