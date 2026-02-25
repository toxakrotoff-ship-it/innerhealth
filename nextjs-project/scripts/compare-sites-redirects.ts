#!/usr/bin/env ts-node
/**
 * Сравнение старого сайта (innerhealth.ru) и нового (проект на VPS/IP).
 * Два режима:
 *   1) Без --match: обход старого сайта, проверка того же пути на новом, вывод пар старый путь → тот же путь.
 *   2) С --match: обход ОБОИХ сайтов с извлечением title/meta, автоматический МЭТЧ старых URL с новыми
 *      по совпадению заголовка (и пути при равенстве) — редирект старый путь → новый путь (например /page123 → /product/slug).
 *
 * Запуск (из nextjs-project):
 *   npx ts-node scripts/compare-sites-redirects.ts <rootUrl> <newOrigin> [--match] [--out file.csv] [--import-db] [--discrepancies-only] [--max-pages N] [--delay Ms]
 *
 * Примеры для innerhealth.ru:
 *   npm run redirects:compare -- https://innerhealth.ru https://NEW_IP --match --out redirects.csv
 *   npm run redirects:compare -- https://innerhealth.ru https://NEW_IP --match --import-db --max-pages 500
 *
 * Запуск на VPS в Docker (из каталога с docker-compose.yml):
 *   docker compose run --rm -v "$(pwd)/data:/data" app npm run redirects:compare -- https://innerhealth.ru http://app:3000 --match --out /data/redirects.csv
 *   docker compose run --rm app npm run redirects:compare -- https://innerhealth.ru http://app:3000 --match --import-db
 * Подробнее: docs/redirects-crawl-docker.md
 *
 * CSV для загрузки в админке: sourcePath,destination,statusCode,statusOnNew,note
 */

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import * as cheerio from 'cheerio';

const REDIRECT_STATUS_DEFAULT = 301;
const DEFAULT_MAX_PAGES = 1000;
const DEFAULT_DELAY_MS = 200;

interface CrawlResult {
  sourcePath: string;
  destination: string;
  statusCode: number;
  statusOnNew: number;
  note: string | null;
}

/** Мета одной страницы для матча */
interface PageMeta {
  path: string;
  title: string;
  metaDescription: string;
}

/** Нормализация пути: с ведущим слэшем, без query и hash */
function normalizePath(raw: string): string {
  try {
    const u = new URL(raw, 'https://dummy');
    const p = u.pathname || '/';
    return p.startsWith('/') ? p : `/${p}`;
  } catch {
    const trimmed = raw.split('?')[0]?.split('#')[0]?.trim() || '/';
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
}

/** Нормализация заголовка для сравнения (нижний регистр, схлопнуть пробелы, обрезка) */
function normalizeTitle(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .slice(0, 200);
}

/** Извлечь title и meta description из HTML */
function extractPageMeta(html: string, pathname: string): PageMeta {
  const $ = cheerio.load(html);
  const title = $('title').first().text().trim() || '';
  const metaDesc =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    '';
  return { path: pathname || '/', title, metaDescription: metaDesc };
}

/** Извлечь все same-origin пути из HTML */
function extractPaths(html: string, baseOrigin: string): Set<string> {
  const set = new Set<string>(['/']);
  const $ = cheerio.load(html);
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    try {
      const url = new URL(href, baseOrigin);
      if (url.origin !== baseOrigin) return;
      const p = normalizePath(url.pathname) || '/';
      set.add(p);
    } catch {
      // ignore invalid URLs
    }
  });
  return set;
}

/** Обход сайта BFS, сбор всех уникальных путей */
async function crawlSite(
  rootUrl: string,
  options: { maxPages: number; delayMs: number }
): Promise<Set<string>> {
  const visited = new Set<string>();
  const queue: string[] = ['/'];
  let processed = 0;
  const baseOrigin = new URL(rootUrl).origin;
  const base = baseOrigin.replace(/\/$/, '');

  while (queue.length > 0 && processed < options.maxPages) {
    const pathname = queue.shift()!;
    const pathKey = pathname || '/';
    if (visited.has(pathKey)) continue;
    visited.add(pathKey);

    const url = `${base}${pathKey}`;
    processed += 1;
    if (processed % 50 === 0) console.error(`Crawl: ${processed} pages, queue: ${queue.length}`);

    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': 'InnerHealth-RedirectCrawler/1.0' },
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) continue;

      const html = await res.text();
      const paths = extractPaths(html, baseOrigin);
      for (const p of Array.from(paths)) {
        const key = p || '/';
        if (!visited.has(key)) queue.push(key);
      }
    } catch (e) {
      console.error(`Fetch ${url}:`, (e as Error).message);
    }

    await new Promise((r) => setTimeout(r, options.delayMs));
  }

  return visited;
}

/** Обход сайта с сохранением title/meta для каждой страницы (для матча) */
async function crawlSiteWithMeta(
  rootUrl: string,
  options: { maxPages: number; delayMs: number }
): Promise<Map<string, PageMeta>> {
  const metaByPath = new Map<string, PageMeta>();
  const visited = new Set<string>();
  const queue: string[] = ['/'];
  let processed = 0;
  const baseOrigin = new URL(rootUrl).origin;
  const base = baseOrigin.replace(/\/$/, '');

  while (queue.length > 0 && processed < options.maxPages) {
    const pathname = queue.shift()!;
    const pathKey = pathname || '/';
    if (visited.has(pathKey)) continue;
    visited.add(pathKey);

    const url = `${base}${pathKey}`;
    processed += 1;
    if (processed % 30 === 0) console.error(`Crawl+meta: ${processed} pages, queue: ${queue.length}`);

    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': 'InnerHealth-RedirectCrawler/1.0' },
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) continue;

      const html = await res.text();
      const pageMeta = extractPageMeta(html, pathKey);
      metaByPath.set(pathKey, pageMeta);

      const paths = extractPaths(html, baseOrigin);
      for (const p of Array.from(paths)) {
        const key = p || '/';
        if (!visited.has(key)) queue.push(key);
      }
    } catch (e) {
      console.error(`Fetch ${url}:`, (e as Error).message);
    }

    await new Promise((r) => setTimeout(r, options.delayMs));
  }

  return metaByPath;
}

/**
 * Найти лучший путь на новом сайте для старой страницы: сначала точный путь, затем по заголовку.
 */
function findBestDestination(
  oldPath: string,
  oldMeta: PageMeta,
  newMetaByPath: Map<string, PageMeta>
): { path: string; note: string } {
  const oldNorm = normalizeTitle(oldMeta.title);

  if (newMetaByPath.has(oldPath)) {
    const newMeta = newMetaByPath.get(oldPath)!;
    if (normalizeTitle(newMeta.title) === oldNorm) {
      return { path: oldPath, note: 'exact path + title' };
    }
    return { path: oldPath, note: 'exact path' };
  }

  for (const [newPath, newMeta] of Array.from(newMetaByPath.entries())) {
    const newNorm = normalizeTitle(newMeta.title);
    if (!newNorm) continue;
    if (oldNorm === newNorm) return { path: newPath, note: 'title match' };
    if (oldNorm.includes(newNorm) || newNorm.includes(oldNorm)) {
      return { path: newPath, note: 'title overlap' };
    }
  }

  return { path: oldPath, note: 'no match, same path' };
}

/** Проверить один путь на новом хосте (HEAD), вернуть status */
async function checkNewPath(
  newOrigin: string,
  pathname: string,
  delayMs: number
): Promise<number> {
  const url = `${newOrigin.replace(/\/$/, '')}${pathname}`;
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': 'InnerHealth-RedirectCrawler/1.0' },
    });
    return res.status;
  } catch {
    return 0;
  } finally {
    await new Promise((r) => setTimeout(r, delayMs));
  }
}

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filePath: string, rows: CrawlResult[]): void {
  const header = 'sourcePath,destination,statusCode,statusOnNew,note';
  const lines = [header, ...rows.map((r) => [r.sourcePath, r.destination, String(r.statusCode), String(r.statusOnNew), r.note ?? ''].map(escapeCsvCell).join(','))];
  fs.writeFileSync(filePath, '\uFEFF' + lines.join('\n'), 'utf-8');
  console.error(`CSV записан: ${filePath} (${rows.length} строк)`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const rootUrl = args.find((a) => a.startsWith('http'));
  const newOriginArg = args.filter((a) => a.startsWith('http'))[1];
  const outIndex = args.indexOf('--out');
  const outFile = outIndex >= 0 ? args[outIndex + 1] : undefined;
  const importDb = args.includes('--import-db');
  const useMatch = args.includes('--match');
  const discrepanciesOnly = args.includes('--discrepancies-only');
  const maxPages = parseInt(args[args.indexOf('--max-pages') + 1] ?? '', 10) || DEFAULT_MAX_PAGES;
  const delayMs = parseInt(args[args.indexOf('--delay') + 1] ?? '', 10) || DEFAULT_DELAY_MS;

  if (!rootUrl || !newOriginArg) {
    console.error(
      'Использование: npx ts-node scripts/compare-sites-redirects.ts <rootUrl> <newOrigin> [--match] [--out file.csv] [--import-db] [--discrepancies-only] [--max-pages N] [--delay Ms]'
    );
    console.error('Пример: npx ts-node scripts/compare-sites-redirects.ts https://innerhealth.ru https://NEW_IP --match --out redirects.csv');
    process.exit(1);
  }

  let newOrigin = newOriginArg;
  if (!newOrigin.startsWith('http')) newOrigin = `http://${newOrigin}`;

  console.error('Корневой URL (старый сайт):', rootUrl);
  console.error('Новый хост:', newOrigin);
  console.error('Режим матча (старый→новый по title):', useMatch);
  console.error('Макс. страниц:', maxPages, 'Задержка (мс):', delayMs);

  const results: CrawlResult[] = [];

  if (useMatch) {
    console.error('Обход старого сайта с извлечением title/meta…');
    const oldMetaByPath = await crawlSiteWithMeta(rootUrl, { maxPages, delayMs });
    console.error('Найдено страниц на старом сайте:', oldMetaByPath.size);

    console.error('Обход нового сайта с извлечением title/meta…');
    const newMetaByPath = await crawlSiteWithMeta(newOrigin, { maxPages, delayMs });
    console.error('Найдено страниц на новом сайте:', newMetaByPath.size);

    let idx = 0;
    for (const [sourcePath, oldMeta] of Array.from(oldMetaByPath.entries())) {
      idx += 1;
      if (idx % 30 === 0) console.error(`Матч: ${idx}/${oldMetaByPath.size}`);
      const { path: destination, note: matchNote } = findBestDestination(sourcePath, oldMeta, newMetaByPath);
      const statusOnNew = await checkNewPath(newOrigin, destination, delayMs);
      const isDiscrepancy = statusOnNew !== 200;
      if (discrepanciesOnly && !isDiscrepancy) continue;
      results.push({
        sourcePath,
        destination,
        statusCode: REDIRECT_STATUS_DEFAULT,
        statusOnNew,
        note: [matchNote, isDiscrepancy ? `HTTP ${statusOnNew}` : null].filter(Boolean).join('; ') || null,
      });
    }
  } else {
    const paths = await crawlSite(rootUrl, { maxPages, delayMs });
    console.error('Найдено путей на старом сайте:', paths.size);

    let idx = 0;
    for (const sourcePath of Array.from(paths)) {
      idx += 1;
      if (idx % 50 === 0) console.error(`Проверка нового хоста: ${idx}/${paths.size}`);
      const statusOnNew = await checkNewPath(newOrigin, sourcePath, delayMs);
      const destination = sourcePath;
      const isDiscrepancy = statusOnNew !== 200;
      if (discrepanciesOnly && !isDiscrepancy) continue;
      results.push({
        sourcePath,
        destination,
        statusCode: REDIRECT_STATUS_DEFAULT,
        statusOnNew,
        note: isDiscrepancy ? `На новом: ${statusOnNew}` : null,
      });
    }
  }

  if (outFile) {
    writeCsv(outFile, results);
  } else if (!importDb) {
    // вывод в stdout как CSV
    const header = 'sourcePath,destination,statusCode,statusOnNew,note';
    const lines = [header, ...results.map((r) => [r.sourcePath, r.destination, String(r.statusCode), String(r.statusOnNew), r.note ?? ''].map(escapeCsvCell).join(','))];
    console.log(lines.join('\n'));
  }

  if (importDb) {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL не задан. Импорт в БД пропущен.');
      process.exit(1);
    }
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { default: Pool } = (await import('pg')) as { default: new (config: { connectionString: string }) => unknown };
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const normalizePathForDb = (p: string): string => (p.startsWith('/') ? p : `/${p}`);
    let created = 0;
    let skipped = 0;
    for (const row of results) {
      try {
        await prisma.redirect.create({
          data: {
            sourcePath: normalizePathForDb(row.sourcePath),
            destination: row.destination,
            statusCode: row.statusCode,
            note: row.note,
          },
        });
        created += 1;
      } catch (e: unknown) {
        if (String(e).includes('Unique constraint') || String(e).includes('unique')) skipped += 1;
        else throw e;
      }
    }
    console.error(`Импорт в БД: создано ${created}, пропущено (дубли) ${skipped}`);
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
