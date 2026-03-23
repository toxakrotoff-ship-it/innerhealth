import { describe, expect, it } from 'vitest';
import { rankRedirectCandidates } from '@/lib/redirect-suggest';

describe('rankRedirectCandidates', () => {
  it('recommends the closest path based on old source slug', () => {
    const ranked = rankRedirectCandidates({
      sourcePath: '/tpost/bgg2lnu4f1-estestvennoe-sredstvo-ot-bolei-v-sustava',
      candidates: [
        {
          path: '/news/estestvennoe-sredstvo-ot-bolei-v-sustava',
          title: 'Естественное средство от болей в суставах',
          type: 'post',
          slug: 'estestvennoe-sredstvo-ot-bolei-v-sustava',
        },
        {
          path: '/catalog/sustavy',
          title: 'Суставы',
          type: 'category',
          slug: 'sustavy',
        },
        {
          path: '/news/chto-takoe-kollagen',
          title: 'Что такое коллаген',
          type: 'post',
          slug: 'chto-takoe-kollagen',
        },
      ],
      limit: 5,
    });

    expect(ranked[0]?.path).toBe('/news/estestvennoe-sredstvo-ot-bolei-v-sustava');
  });

  it('promotes textual matches when query is provided', () => {
    const ranked = rankRedirectCandidates({
      sourcePath: '/old/path',
      query: 'коллаген',
      candidates: [
        {
          path: '/product/kollagen-kompleks',
          title: 'Коллаген комплекс',
          type: 'product',
          slug: 'kollagen-kompleks',
        },
        {
          path: '/catalog/vitaminy',
          title: 'Витамины',
          type: 'category',
          slug: 'vitaminy',
        },
      ],
      limit: 5,
    });

    expect(ranked[0]?.path).toBe('/product/kollagen-kompleks');
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
  });
});
