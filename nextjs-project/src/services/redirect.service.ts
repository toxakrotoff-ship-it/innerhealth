import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

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
