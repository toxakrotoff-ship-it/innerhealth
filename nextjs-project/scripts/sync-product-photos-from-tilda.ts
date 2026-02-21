#!/usr/bin/env ts-node
/**
 * Синхронизация фото товаров из CSV Тильды:
 * - Парсит docs/store-6292080-202602140043.csv (col 1 = Tilda UID, col 9 = Photo URLs)
 * - Находит товар в БД по tildaUid
 * - Скачивает первое фото с static.tildacdn.com в public/uploads/products/{tildaUid}/
 * - Обновляет Product.photo локальным путём
 *
 * Запуск из корня nextjs-project:
 *   npx ts-node scripts/sync-product-photos-from-tilda.ts
 *   npx ts-node scripts/sync-product-photos-from-tilda.ts /path/to/file.csv
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });

import { prisma } from '../src/lib/prisma';

const TILDA_PHOTO_PREFIX = 'https://static.tildacdn.com/';
const UPLOAD_BASE = 'public/uploads/products';

/** Парсинг одной строки CSV с разделителем ";" и полями в кавычках */
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
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  fields.push(currentField);
  return fields;
}

/** Из строки Photo (col 9) извлекает массив URL static.tildacdn */
function extractPhotoUrls(photoField: string): string[] {
  if (!photoField || !photoField.trim()) return [];
  const urls = photoField.trim().split(/\s+/).map((u) => u.trim()).filter(Boolean);
  return urls.filter((u) => u.startsWith(TILDA_PHOTO_PREFIX));
}

/** Скачивает изображение по URL и сохраняет в dirPath как filename. Возвращает относительный URL для БД или null при ошибке */
async function downloadImage(
  imageUrl: string,
  dirPath: string,
  filename: string
): Promise<string | null> {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    if (!res.ok) {
      console.warn(`  HTTP ${res.status} ${imageUrl}`);
      return null;
    }
    const contentType = res.headers.get('content-type') ?? '';
    const ext = contentType.includes('png')
      ? 'png'
      : contentType.includes('gif')
        ? 'gif'
        : contentType.includes('webp')
          ? 'webp'
          : 'jpg';
    const finalFilename = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
    const filePath = path.join(dirPath, finalFilename);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    // Относительный URL от public: /uploads/products/...
    const relativeDir = path.relative(path.join(process.cwd(), 'public'), dirPath);
    return `/${relativeDir.replace(/\\/g, '/')}/${finalFilename}`;
  } catch (err) {
    console.warn('  Ошибка загрузки:', (err as Error).message);
    return null;
  }
}

async function main(): Promise<void> {
  const csvPath =
    process.argv[2] ??
    path.resolve(process.cwd(), '../docs/store-6292080-202602140043.csv');

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

  const header = parseCSVLine(lines[0]);
  const tildaUidIndex = header.findIndex((h) => h.trim() === 'Tilda UID');
  const photoIndex = header.findIndex((h) => h.trim() === 'Photo');
  if (tildaUidIndex === -1 || photoIndex === -1) {
    console.error('В заголовке CSV не найдены колонки "Tilda UID" или "Photo". Колонки:', header);
    process.exit(1);
  }

  console.log('Колонки: Tilda UID =', tildaUidIndex, ', Photo =', photoIndex);
  console.log('Обработка строк:', lines.length - 1);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  let noPhoto = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const tildaUid = (fields[tildaUidIndex] ?? '').trim();
    const photoField = fields[photoIndex] ?? '';

    if (!tildaUid) {
      skipped++;
      continue;
    }

    const urls = extractPhotoUrls(photoField);
    if (urls.length === 0) {
      noPhoto++;
      continue;
    }

    const product = await prisma.product.findUnique({
      where: { tildaUid },
    });

    if (!product) {
      notFound++;
      console.log(`[?] Товар не найден tildaUid=${tildaUid}`);
      continue;
    }

    const dirPath = path.join(process.cwd(), UPLOAD_BASE, tildaUid);
    const localUrl = await downloadImage(urls[0], dirPath, 'main');
    if (!localUrl) continue;

    await prisma.product.update({
      where: { id: product.id },
      data: { photo: localUrl },
    });
    updated++;
    console.log(`[OK] ${product.title.slice(0, 50)}... -> ${localUrl}`);
  }

  console.log('\nИтого: обновлено', updated, ', без фото в CSV', noPhoto, ', не найдено в БД', notFound, ', пропущено', skipped);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
