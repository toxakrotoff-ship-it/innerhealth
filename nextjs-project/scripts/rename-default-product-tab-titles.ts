#!/usr/bin/env ts-node
/**
 * Переименовывает у уже сохранённых товаров системные табы, у которых
 * заголовок ещё стоит по старому дефолту ("Описание" / "Способ применения"),
 * в новый дефолт ("О продукте" / "Как принимать"). Смена дефолта в коде
 * (src/lib/product-tabs.ts) влияет только на новые/несохранённые табы —
 * у товаров, где title уже записан в JSON-поле Product.tabs, старый текст
 * остаётся, пока его не переписать явно.
 *
 * Трогает только табы с системным key === 'description' | 'usage' и точным
 * совпадением старого заголовка (без учёта регистра/пробелов по краям) —
 * пользовательские кастомные заголовки не затрагиваются.
 *
 * Запуск из nextjs-project:
 *   npx ts-node scripts/rename-default-product-tab-titles.ts --dry-run
 *   npx ts-node scripts/rename-default-product-tab-titles.ts --apply
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import type { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { getSeedExecutionMode } from '../src/lib/seed-safety';
import { parseProductTabsJson, serializeProductTabsForStorage } from '../src/lib/product-tabs';

const RENAME_MAP: Record<string, { key: string; oldTitle: string; newTitle: string }> = {
  description: { key: 'description', oldTitle: 'описание', newTitle: 'О продукте' },
  usage: { key: 'usage', oldTitle: 'способ применения', newTitle: 'Как принимать' },
};

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

    let changed = false;
    const renamedTitles: string[] = [];
    const fixedTabs = tabs.map((tab) => {
      if (!tab.key) return tab;
      const rule = RENAME_MAP[tab.key];
      if (!rule) return tab;
      if (tab.title.trim().toLocaleLowerCase('ru') !== rule.oldTitle) return tab;

      changed = true;
      renamedTitles.push(`"${tab.title}" → "${rule.newTitle}"`);
      return { ...tab, title: rule.newTitle };
    });

    if (!changed) continue;

    affected++;
    console.log(
      `[${mode === 'apply' ? 'FIX' : 'DRY-RUN'}] ${product.title} (${product.id}): ${renamedTitles.join(', ')}`
    );

    if (mode === 'apply') {
      await prisma.product.update({
        where: { id: product.id },
        data: { tabs: serializeProductTabsForStorage(fixedTabs) as unknown as Prisma.InputJsonValue },
      });
    }
  }

  console.log(`\nГотово. Товаров с переименованными табами: ${affected} из ${products.length}.`);
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
