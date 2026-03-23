export interface RedirectSuggestCandidate {
  path: string;
  title: string;
  type: 'product' | 'category' | 'post' | 'seo-hub' | 'static';
  slug?: string;
  excerpt?: string | null;
}

export interface RankedRedirectSuggestCandidate extends RedirectSuggestCandidate {
  score: number;
}

interface RedirectSearchParts {
  normalizedPath: string;
  sourceTokens: string[];
  sourcePathCore: string;
}

function normalizePath(rawPath: string): string {
  const noQuery = rawPath.split('?')[0]?.split('#')[0]?.trim() ?? '';
  if (!noQuery) return '/';
  return noQuery.startsWith('/') ? noQuery.toLowerCase() : `/${noQuery.toLowerCase()}`;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    // Keep latin/cyrillic letters and digits to avoid unicode-property escapes
    // which fail under older TS targets (es5 in this project).
    .replace(/[^a-z0-9\u0400-\u04ff]+/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function extractSourcePathCore(sourcePath: string): string {
  const normalized = normalizePath(sourcePath);
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) return '';

  if (segments[0] === 'tpost' && segments[1]) {
    const second = segments[1];
    const dashIndex = second.indexOf('-');
    if (dashIndex > 0) return second.slice(dashIndex + 1);
    return second;
  }

  return segments[segments.length - 1] ?? '';
}

function createSearchParts(sourcePath: string): RedirectSearchParts {
  const normalizedPath = normalizePath(sourcePath);
  const sourcePathCore = extractSourcePathCore(sourcePath);
  const sourceTokens = tokenize(`${normalizedPath} ${sourcePathCore}`);
  return { normalizedPath, sourceTokens, sourcePathCore };
}

function scoreCandidate(
  parts: RedirectSearchParts,
  candidate: RedirectSuggestCandidate,
  query: string
): number {
  const normalizedCandidatePath = normalizePath(candidate.path);
  const candidateText = [candidate.title, candidate.slug ?? '', candidate.excerpt ?? '', normalizedCandidatePath]
    .join(' ')
    .toLowerCase();
  const candidateTokens = tokenize(candidateText);
  const candidateTokenSet = new Set(candidateTokens);

  let score = 0;
  if (candidate.type === 'post') score += 5;
  if (candidate.type === 'product') score += 4;
  if (candidate.type === 'category') score += 3;
  if (candidate.type === 'seo-hub') score += 2;

  if (parts.sourcePathCore.length >= 3) {
    if (normalizedCandidatePath.includes(parts.sourcePathCore)) score += 80;
    if ((candidate.slug ?? '').toLowerCase().includes(parts.sourcePathCore)) score += 60;
    if (candidate.title.toLowerCase().includes(parts.sourcePathCore)) score += 30;
  }

  for (const token of parts.sourceTokens) {
    if (candidateTokenSet.has(token)) score += 10;
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery) {
    if (candidateText.includes(normalizedQuery)) score += 90;
    const queryTokens = tokenize(normalizedQuery);
    for (const token of queryTokens) {
      if (candidateTokenSet.has(token)) score += 20;
    }
  }

  if (normalizedCandidatePath === parts.normalizedPath) score -= 120;
  if (normalizedCandidatePath === '/') score -= 10;

  return score;
}

export function rankRedirectCandidates(params: {
  sourcePath: string;
  query?: string;
  candidates: RedirectSuggestCandidate[];
  limit?: number;
}): RankedRedirectSuggestCandidate[] {
  const parts = createSearchParts(params.sourcePath);
  const query = params.query ?? '';
  const limit = params.limit ?? 10;

  return params.candidates
    .map((candidate) => ({ ...candidate, score: scoreCandidate(parts, candidate, query) }))
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, Math.max(1, limit));
}
