#!/usr/bin/env ts-node
/**
 * Заполнение веса и габаритов товаров из CSV Тильды (колонки 32–35: Weight г, Length мм, Width мм, Height мм).
 * Нужно для расчёта стоимости доставки СДЭК.
 *
 * Запуск из nextjs-project:
 *   npx ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' scripts/backfill-product-dimensions-from-csv.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' scripts/backfill-product-dimensions-from-csv.ts /path/to/file.csv
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });

import { prisma } from '../src/lib/prisma';

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        currentField += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else currentField += char;
  }
  fields.push(currentField);
  return fields;
}

function parseOptionalInt(value: string | undefined): number | null {
  if (value == null || String(value).trim() === '') return null;
  const n = parseInt(String(value).replace(/\s/g, ''), 10);
  return Number.isNaN(n) || n < 0 ? null : n;
}

async function main(): Promise<void> {
  const csvPath =
    process.argv[2] ?? path.resolve(process.cwd(), '../docs/store-6292080-202602140043.csv');

  if (!fs.existsSync(csvPath)) {
    console.error('Файл не найден:', csvPath);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.error('В CSV нет строк с данными');
    process.exit(1);
  }

  const COL_TILDA_UID = 0;
  const COL_WEIGHT = 31;
  const COL_LENGTH = 32;
  const COL_WIDTH = 33;
  const COL_HEIGHT = 34;

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const tildaUid = (fields[COL_TILDA_UID] ?? '').trim();
    if (!tildaUid) {
      skipped++;
      continue;
    }

    const weight = parseOptionalInt(fields[COL_WEIGHT]);
    const length = parseOptionalInt(fields[COL_LENGTH]);
    const width = parseOptionalInt(fields[COL_WIDTH]);
    const height = parseOptionalInt(fields[COL_HEIGHT]);

    const product = await prisma.product.findUnique({
      where: { tildaUid },
      select: { id: true, title: true, weight: true, length: true, width: true, height: true },
    });

    if (!product) {
      notFound++;
      continue;
    }

    const hasChange =
      product.weight !== weight ||
      product.length !== length ||
      product.width !== width ||
      product.height !== height;

    if (!hasChange) continue;

    await prisma.product.update({
      where: { id: product.id },
      data: { weight, length, width, height },
    });
    updated++;
    console.log(
      `[OK] ${product.title.slice(0, 45)}... weight=${weight ?? '-'}g, L=${length ?? '-'} W=${width ?? '-'} H=${height ?? '-'} mm`
    );
  }

  console.log(
    `\nИтого: обновлено ${updated}, без изменений пропущено, не найдено в БД ${notFound}, пустой UID ${skipped}`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
