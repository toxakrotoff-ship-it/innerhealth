#!/usr/bin/env ts-node
/**
 * Загружает все изображения с static.tildacdn.com в локальную папку проекта.
 *
 * - Product.photo, Category.image, Post.previewImage и картинки в Post.content (TipTap)
 * - Скачивает в public/uploads/tilda/, обновляет записи на /uploads/tilda/...
 *
 * Запуск из корня nextjs-project:
 *   npx ts-node scripts/download-tildacdn-images-to-local.ts
 *   npx ts-node scripts/download-tildacdn-images-to-local.ts --dry-run  # только показать, не скачивать и не обновлять БД
 *   npx ts-node scripts/download-tildacdn-images-to-local.ts --debug    # вывести примеры полей из БД (формат URL)
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

const TILDA_URL_REGEX = /https:\/\/static\.tildacdn\.com\/[^\s"'<>]+/g;

/** Собирает все URL static.tildacdn из строки (целиком или по regex для HTML/текста) */
function collectTildacdnUrlsFromString(s: string, out: Set<string>): void {
  if (s.startsWith(TILDA_PHOTO_PREFIX)) {
    out.add(s);
    return;
  }
  const matches: RegExpMatchArray | null = s.match(TILDA_URL_REGEX);
  if (matches) for (const u of matches) out.add(u);
}

/** Рекурсивно собирает все URL static.tildacdn из любого JSON (объект/массив/строка) */
function collectTildacdnUrlsFromJson(val: unknown, out: Set<string>): void {
  if (typeof val === 'string') {
    collectTildacdnUrlsFromString(val, out);
    return;
  }
  if (Array.isArray(val)) {
    for (const item of val) collectTildacdnUrlsFromJson(item, out);
    return;
  }
  if (val !== null && typeof val === 'object') {
    for (const v of Object.values(val)) collectTildacdnUrlsFromJson(v, out);
  }
}

/** Рекурсивно заменяет в копии JSON все tildacdn URL на локальные пути */
function replaceTildacdnInJson(val: unknown, urlToLocal: Map<string, string>): unknown {
  if (typeof val === 'string') {
    if (urlToLocal.has(val)) return urlToLocal.get(val)!;
    let s = val;
    urlToLocal.forEach((local, url) => {
      s = s.split(url).join(local);
    });
    return s;
  }
  if (Array.isArray(val)) {
    return val.map((item) => replaceTildacdnInJson(item, urlToLocal));
  }
  if (val !== null && typeof val === 'object') {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      next[k] = replaceTildacdnInJson(v, urlToLocal);
    }
    return next;
  }
  return val;
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
  const debug = process.argv.includes('--debug');
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

  const posts = await prisma.post.findMany({
    where: {
      OR: [
        { previewImage: { not: null } },
        { content: { not: null } },
      ],
    },
    select: { id: true, title: true, slug: true, previewImage: true, content: true },
  });

  const postPreviewUrls = posts.filter((p) => isTildacdnUrl(p.previewImage)) as Array<{
    id: string;
    title: string;
    slug: string;
    previewImage: string;
    content: unknown;
  }>;

  const contentUrls = new Set<string>();
  for (const post of posts) {
    if (post.content != null) collectTildacdnUrlsFromJson(post.content, contentUrls);
  }

  if (debug) {
    console.log('[DEBUG] Примеры данных из БД:\n');
    const sampleProduct = productPhotos.find((p) => p.photo);
    if (sampleProduct) console.log('  Product.photo (пример):', sampleProduct.photo?.slice(0, 100));
    const sampleCategory = categories.find((c) => c.image);
    if (sampleCategory) console.log('  Category.image (пример):', sampleCategory.image?.slice(0, 100));
    const samplePost = posts.find((p) => p.previewImage || p.content);
    if (samplePost) {
      console.log('  Post.previewImage (пример):', samplePost.previewImage?.slice(0, 100));
      if (samplePost.content) {
        const contentStr = JSON.stringify(samplePost.content);
        console.log('  Post.content (первые 300 символов):', contentStr.slice(0, 300));
        console.log('  Есть "tildacdn" в content?', contentStr.includes('tildacdn'));
      }
    }
    console.log('');
  }

  const uniqueUrls = new Set<string>();
  productUrls.forEach((p) => uniqueUrls.add(p.photo));
  categoryUrls.forEach((c) => uniqueUrls.add(c.image));
  postPreviewUrls.forEach((p) => uniqueUrls.add(p.previewImage));
  contentUrls.forEach((u) => uniqueUrls.add(u));

  console.log(
    `Найдено: ${productUrls.length} товаров, ${categoryUrls.length} категорий, ${postPreviewUrls.length} постов (preview), ${contentUrls.size} картинок в контенте. Уникальных URL: ${uniqueUrls.size}\n`
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
  let postsUpdated = 0;

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
    for (const post of posts) {
      const updates: { previewImage?: string; content?: object } = {};
      if (post.previewImage && urlToLocal.has(post.previewImage)) {
        updates.previewImage = urlToLocal.get(post.previewImage)!;
      }
      if (post.content != null) {
        const newContent = replaceTildacdnInJson(post.content, urlToLocal);
        if (JSON.stringify(newContent) !== JSON.stringify(post.content)) {
          updates.content = newContent as object;
        }
      }
      if (Object.keys(updates).length > 0) {
        await prisma.post.update({
          where: { id: post.id },
          data: updates,
        });
        postsUpdated++;
      }
    }
  } else {
    productsUpdated = productUrls.length;
    categoriesUpdated = categoryUrls.length;
    let wouldUpdatePosts = 0;
    for (const post of posts) {
      const hasPreview = post.previewImage && isTildacdnUrl(post.previewImage);
      const urlsInPost = new Set<string>();
      if (post.content != null) collectTildacdnUrlsFromJson(post.content, urlsInPost);
      const hasContent = urlsInPost.size > 0;
      if (hasPreview || hasContent) wouldUpdatePosts++;
    }
    postsUpdated = wouldUpdatePosts;
  }

  console.log(
    `\nИтого: обновлено товаров ${productsUpdated}, категорий ${categoriesUpdated}, постов ${postsUpdated}. Локальная папка: public/uploads/tilda/`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
