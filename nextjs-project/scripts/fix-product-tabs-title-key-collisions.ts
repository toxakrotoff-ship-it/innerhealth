#!/usr/bin/env ts-node
/**
 * Чинит товары, у которых пользовательский таб (без явного `key` в JSON)
 * назван так, что его заголовок совпадает с названием системного раздела
 * (например, "Характеристики"). До фикса в src/lib/product-tabs.ts такой
 * таб при чтении получал системный ключ по заголовку и, если в товаре уже
 * был настоящий системный таб с этим же ключом, молча выпадал при рендере
 * страницы — независимо от галочки "опубликовать".
 *
 * Скрипт находит подобные коллизии ключей внутри одного товара и явно
 * помечает "проигравший" (обычно более новый/переименованный) таб как
 * key: null, оставляя его пользовательским — тогда он больше не будет
 * соперничать за системный слот и будет отображаться на сайте.
 *
 * Запуск из nextjs-project:
 *   npx ts-node scripts/fix-product-tabs-title-key-collisions.ts --dry-run
 *   npx ts-node scripts/fix-product-tabs-title-key-collisions.ts --apply
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import type { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { getSeedExecutionMode } from '../src/lib/seed-safety';
import { parseProductTabsJson, serializeProductTabsForStorage } from '../src/lib/product-tabs';

async function main() {
  const mode = getSeedExecutionMode();
  const products = await prisma.product.findMany({
    where: { tabs: { not: null } },
    select: { id: true, title: true, tabs: true },
  });

  let affected = 0;

  for (const product of products) {
    const tabs = parseProductTabsJson(product.tabs);
    if (!tabs || tabs.length === 0) continue;

    const seenKeys = new Set<string>();
    let changed = false;
    const fixedTabs = tabs.map((tab) => {
      if (!tab.key) return tab;
      if (seenKeys.has(tab.key)) {
        changed = true;
        return { ...tab, key: null };
      }
      seenKeys.add(tab.key);
      return tab;
    });

    if (!changed) continue;

    affected++;
    const collidingTitles = fixedTabs
      .filter((tab, index) => tab.key === null && tabs[index]?.key)
      .map((tab) => `"${tab.title}"`)
      .join(', ');
    console.log(`[${mode === 'apply' ? 'FIX' : 'DRY-RUN'}] ${product.title} (${product.id}): ${collidingTitles}`);

    if (mode === 'apply') {
      await prisma.product.update({
        where: { id: product.id },
        data: { tabs: serializeProductTabsForStorage(fixedTabs) as unknown as Prisma.InputJsonValue },
      });
    }
  }

  console.log(`\nГотово. Товаров с коллизией ключей: ${affected} из ${products.length}.`);
  if (mode === 'dry-run' && affected > 0) {
    console.log('Это был dry-run, изменения не сохранены. Запустите с --apply, чтобы применить.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
