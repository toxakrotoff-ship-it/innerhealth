import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
  rankRedirectCandidates,
  type RedirectSuggestCandidate,
  type RankedRedirectSuggestCandidate,
} from '@/lib/redirect-suggest';

/** Допустимые коды редиректа (301 — по умолчанию для постоянных с Тилды). */
export const REDIRECT_STATUS_CODES = [301, 302, 307, 308] as const;
export type RedirectStatusCode = (typeof REDIRECT_STATUS_CODES)[number];

export interface RedirectRule {
  sourcePath: string;
  destination: string;
  statusCode: RedirectStatusCode;
}

/** Нормализация пути для сравнения: без query, с ведущим слэшем. */
function normalizePath(pathname: string): string {
  const path = pathname.split('?')[0]?.trim() || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

/** Карта редиректов для middleware/API (кэш 60 с). */
export async function getRedirectMap(): Promise<RedirectRule[]> {
  return unstable_cache(
    async () => {
      const rows = await prisma.redirect.findMany({
        where: {},
        select: { sourcePath: true, destination: true, statusCode: true },
      });
      return rows.map((r) => ({
        sourcePath: normalizePath(r.sourcePath),
        destination: r.destination,
        statusCode: Math.min(308, Math.max(301, r.statusCode)) as RedirectStatusCode,
      }));
    },
    ['redirect-map'],
    { revalidate: 60, tags: ['redirects'] }
  )();
}

/** Найти редирект по пути (точное совпадение). */
export async function findRedirectByPath(pathname: string): Promise<{
  destination: string;
  statusCode: RedirectStatusCode;
} | null> {
  const path = normalizePath(pathname);
  const map = await getRedirectMap();
  const rule = map.find((r) => r.sourcePath === path);
  if (!rule) return null;
  return { destination: rule.destination, statusCode: rule.statusCode };
}

/** Список редиректов для админки. */
export async function listRedirects() {
  return prisma.redirect.findMany({
    orderBy: { sourcePath: 'asc' },
  });
}

/** Создать редирект. */
export async function createRedirect(data: {
  sourcePath: string;
  destination: string;
  statusCode?: number;
  entityType?: string | null;
  entityId?: string | null;
  note?: string | null;
}) {
  const statusCode = data.statusCode ?? 301;
  if (!REDIRECT_STATUS_CODES.includes(statusCode as RedirectStatusCode)) {
    throw new Error(`statusCode must be one of ${REDIRECT_STATUS_CODES.join(', ')}`);
  }
  return prisma.redirect.create({
    data: {
      sourcePath: normalizePath(data.sourcePath),
      destination: data.destination,
      statusCode,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
      note: data.note ?? null,
    },
  });
}

/** Обновить редирект. */
export async function updateRedirect(
  id: string,
  data: Partial<{
    sourcePath: string;
    destination: string;
    statusCode: number;
    entityType: string | null;
    entityId: string | null;
    note: string | null;
  }>
) {
  type UpdateData = Parameters<typeof prisma.redirect.update>[0]['data'];
  const payload: UpdateData = { ...data };
  if (data.sourcePath !== undefined) payload.sourcePath = normalizePath(data.sourcePath);
  if (data.statusCode !== undefined) {
    if (!REDIRECT_STATUS_CODES.includes(data.statusCode as RedirectStatusCode)) {
      throw new Error(`statusCode must be one of ${REDIRECT_STATUS_CODES.join(', ')}`);
    }
  }
  return prisma.redirect.update({ where: { id }, data: payload });
}

/** Удалить редирект. */
export async function deleteRedirect(id: string) {
  return prisma.redirect.delete({ where: { id } });
}

/** Строка CSV для импорта: sourcePath,destination,statusCode,statusOnNew,note */
export interface CsvRedirectRow {
  sourcePath: string;
  destination: string;
  statusCode?: number;
  note?: string | null;
}

/** Парсинг одной строки CSV с учётом кавычек и запятых */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && c === ',') {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += c;
  }
  result.push(current.trim());
  return result;
}

/**
 * Импорт редиректов из CSV.
 * Формат: sourcePath,destination,statusCode,statusOnNew,note (заголовок опционален).
 * Возвращает количество созданных, пропущенных (дубли) и список ошибок.
 */
export async function importRedirectsFromCsv(csvText: string): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  const created = { count: 0 };
  const skipped = { count: 0 };
  const errors: string[] = [];
  const lines = csvText.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim());
  if (lines.length === 0) {
    return { created: 0, skipped: 0, errors: ['Файл пуст'] };
  }

  let startIndex = 0;
  const first = parseCsvLine(lines[0]);
  if (first[0]?.toLowerCase() === 'sourcepath' || first[0]?.toLowerCase().includes('source')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const sourcePath = (cells[0] ?? '').trim();
    const destination = (cells[1] ?? '').trim();
    const statusCodeRaw = (cells[2] ?? '').trim();
    const note = (cells[4] ?? '').trim() || null;

    if (!sourcePath || !destination) {
      errors.push(`Строка ${i + 1}: не указаны sourcePath или destination`);
      continue;
    }

    let statusCode = 301;
    if (statusCodeRaw) {
      const n = parseInt(statusCodeRaw, 10);
      if (REDIRECT_STATUS_CODES.includes(n as RedirectStatusCode)) statusCode = n;
    }

    try {
      await prisma.redirect.create({
        data: {
          sourcePath: normalizePath(sourcePath),
          destination,
          statusCode,
          note,
        },
      });
      created.count += 1;
    } catch (e: unknown) {
      if (String(e).includes('Unique constraint') || String(e).includes('unique')) {
        skipped.count += 1;
      } else {
        errors.push(`Строка ${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return { created: created.count, skipped: skipped.count, errors };
}

export interface RedirectSuggestion extends RankedRedirectSuggestCandidate {}

function getSuggestionPostPath(type: string, slug: string): string {
  return `${type === 'article' ? '/informaciya' : '/news'}/${slug}`;
}

const staticRedirectTargets: RedirectSuggestCandidate[] = [
  { path: '/', title: 'Главная', type: 'static' },
  { path: '/catalog', title: 'Каталог', type: 'static' },
  { path: '/news', title: 'Новости', type: 'static' },
  { path: '/informaciya', title: 'Информация', type: 'static' },
  { path: '/guides', title: 'Гайды', type: 'static' },
  { path: '/faq', title: 'FAQ', type: 'static' },
  { path: '/contacts', title: 'Контакты', type: 'static' },
  { path: '/otzyvy', title: 'Отзывы', type: 'static' },
];

async function listSuggestionCandidates(): Promise<RedirectSuggestCandidate[]> {
  const [products, categories, posts, seoHubs] = await Promise.all([
    prisma.product.findMany({
      where: { slug: { not: null }, isDraft: false },
      select: { slug: true, title: true, description: true },
      take: 3000,
    }),
    prisma.category.findMany({
      select: { slug: true, title: true },
      take: 1000,
    }),
    prisma.post.findMany({
      where: { published: true },
      select: { slug: true, title: true, excerpt: true, type: true },
      take: 2000,
    }),
    prisma.seoHub.findMany({
      where: { published: true },
      select: { slug: true, title: true, excerpt: true },
      take: 1000,
    }),
  ]);

  const productTargets: RedirectSuggestCandidate[] = products.flatMap((product) =>
    product.slug
      ? [
          {
            path: `/product/${product.slug}`,
            title: product.title,
            type: 'product',
            slug: product.slug,
            excerpt: product.description,
          },
        ]
      : []
  );
  const categoryTargets: RedirectSuggestCandidate[] = categories.map((category) => ({
    path: `/catalog/${category.slug}`,
    title: category.title,
    type: 'category',
    slug: category.slug,
  }));
  const postTargets: RedirectSuggestCandidate[] = posts.map((post) => ({
    path: getSuggestionPostPath(post.type, post.slug),
    title: post.title,
    type: 'post',
    slug: post.slug,
    excerpt: post.excerpt,
  }));
  const seoHubTargets: RedirectSuggestCandidate[] = seoHubs.map((hub) => ({
    path: `/guides/${hub.slug}`,
    title: hub.title,
    type: 'seo-hub',
    slug: hub.slug,
    excerpt: hub.excerpt,
  }));

  return [...staticRedirectTargets, ...productTargets, ...categoryTargets, ...postTargets, ...seoHubTargets];
}

export async function suggestRedirectDestinations(params: {
  sourcePath: string;
  query?: string;
  limit?: number;
}): Promise<RedirectSuggestion[]> {
  const candidates = await listSuggestionCandidates();
  return rankRedirectCandidates({
    sourcePath: params.sourcePath,
    query: params.query,
    limit: params.limit ?? 20,
    candidates,
  });
}
