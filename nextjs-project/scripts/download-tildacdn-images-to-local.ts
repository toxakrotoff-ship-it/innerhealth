#!/usr/bin/env ts-node
/**
 * Загружает все изображения с static.tildacdn.com в локальную папку проекта.
 *
 * - Находит в БД Product.photo и Category.image с URL https://static.tildacdn.com/*
 * - Скачивает каждое изображение в public/uploads/tilda/
 * - Обновляет записи в БД на локальный путь (/uploads/tilda/...)
 *
 * Запуск из корня nextjs-project:
 *   npx ts-node scripts/download-tildacdn-images-to-local.ts
 *   npx ts-node scripts/download-tildacdn-images-to-local.ts --dry-run  # только показать, не скачивать и не обновлять БД
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });

import { prisma } from '../src/lib/prisma';

const TILDA_PHOTO_PREFIX = 'https://static.tildacdn.com';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'tilda');
const PUBLIC_PREFIX = '/uploads/tilda';

function isTildacdnUrl(value: string | null): value is string {
  return typeof value === 'string' && value.startsWith(TILDA_PHOTO_PREFIX);
}

/** Генерирует безопасное имя файла из URL (уникальное по хешу) */
function filenameFromUrl(imageUrl: string): string {
  const hash = crypto.createHash('sha256').update(imageUrl).digest('hex').slice(0, 12);
  try {
    const u = new URL(imageUrl);
    const base = path.basename(u.pathname) || 'image';
    const safeBase = base.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 40);
    return `${safeBase}-${hash}`;
  } catch {
    return hash;
  }
}

/** Скачивает изображение по URL, сохраняет в UPLOAD_DIR. Возвращает относительный URL для БД или null */
async function downloadImage(
  imageUrl: string,
  baseFilename: string,
  dryRun: boolean
): Promise<string | null> {
  if (dryRun) {
    return `${PUBLIC_PREFIX}/${baseFilename}.jpg`;
  }
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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
    const finalFilename = `${baseFilename}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, finalFilename);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
    return `${PUBLIC_PREFIX}/${finalFilename}`;
  } catch (err) {
    console.warn('  Ошибка загрузки:', (err as Error).message);
    return null;
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('[DRY RUN] Скачивание и обновление БД отключены.\n');
  }

  const productPhotos = await prisma.product.findMany({
    where: { photo: { not: null } },
    select: { id: true, title: true, photo: true },
  });

  const categories = await prisma.category.findMany({
    where: { image: { not: null } },
    select: { id: true, title: true, image: true },
  });

  const productUrls = productPhotos.filter((p) => isTildacdnUrl(p.photo)) as Array<{
    id: string;
    title: string;
    photo: string;
  }>;
  const categoryUrls = categories.filter((c) => isTildacdnUrl(c.image)) as Array<{
    id: string;
    title: string;
    image: string;
  }>;

  const uniqueUrls = new Set<string>();
  productUrls.forEach((p) => uniqueUrls.add(p.photo));
  categoryUrls.forEach((c) => uniqueUrls.add(c.image));

  console.log(
    `Найдено: ${productUrls.length} товаров и ${categoryUrls.length} категорий с URL static.tildacdn.com (уникальных URL: ${uniqueUrls.size})\n`
  );

  const urlToLocal = new Map<string, string>();

  for (const imageUrl of Array.from(uniqueUrls)) {
    const baseFilename = filenameFromUrl(imageUrl);
    const localPath = await downloadImage(imageUrl, baseFilename, dryRun);
    if (localPath) {
      urlToLocal.set(imageUrl, localPath);
      if (!dryRun) {
        console.log(`  [OK] ${imageUrl.slice(0, 60)}... -> ${localPath}`);
      }
    }
  }

  let productsUpdated = 0;
  let categoriesUpdated = 0;

  if (!dryRun) {
    for (const p of productUrls) {
      const local = urlToLocal.get(p.photo);
      if (local) {
        await prisma.product.update({
          where: { id: p.id },
          data: { photo: local },
        });
        productsUpdated++;
      }
    }
    for (const c of categoryUrls) {
      const local = urlToLocal.get(c.image);
      if (local) {
        await prisma.category.update({
          where: { id: c.id },
          data: { image: local },
        });
        categoriesUpdated++;
      }
    }
  } else {
    productsUpdated = productUrls.length;
    categoriesUpdated = categoryUrls.length;
  }

  console.log(
    `\nИтого: обновлено товаров ${productsUpdated}, категорий ${categoriesUpdated}. Локальная папка: public/uploads/tilda/`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
