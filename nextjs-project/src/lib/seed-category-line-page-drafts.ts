import type { JSONContent } from '@tiptap/core';
import { BCAA6000_INFO_CELLS } from '@/content/bcaa6000-category-info';
import { COLLAGEN_SPEC_CELLS } from '@/content/collagen-category-line';
import { HYDRO_CATEGORY_PRODUCT_DESCRIPTION } from '@/content/hydro-category-bento';
import { BONE_BROTH_PRODUCT_DESCRIPTION } from '@/content/bonebroth-catalog-screens';

const DEFAULT_NUTRIENT_USAGE =
  'один впрыск в час, до 10 нажатий в день. Перед употреблением взболтать. Продолжительность приема 2–3 недели. При необходимости прием можно повторить через месяц.';

const DEFAULT_NUTRIENT_COMPOSITION =
  'вода очищенная, пептидный комплекс MH+GNDR-19-21 (глицин, пролин, аргинин, лейцин, тирозин, серин, триптофан, гистидин, пироглутаминовая кислота), ниацин (витамин PP), экстракт корней левзеи, экстракт';

function textNode(value: string): JSONContent {
  return { type: 'text', text: value };
}

function paragraph(value: string): JSONContent {
  return { type: 'paragraph', content: [textNode(value)] };
}

function heading(level: 2 | 3, value: string): JSONContent {
  return { type: 'heading', attrs: { level }, content: [textNode(value)] };
}

function doc(content: JSONContent[]): JSONContent {
  return { type: 'doc', content };
}

function tableFromTitleBodyRows(
  rows: readonly { readonly title: string; readonly body: string }[]
): JSONContent {
  return {
    type: 'table',
    content: rows.map((row) => ({
      type: 'tableRow',
      content: [
        {
          type: 'tableHeader',
          content: [paragraph(row.title)],
        },
        {
          type: 'tableCell',
          content: [paragraph(row.body)],
        },
      ],
    })),
  };
}

function isEmptyLineDoc(raw: unknown): boolean {
  if (raw == null) return true;
  if (typeof raw === 'object' && raw !== null) {
    const docNode = raw as { type?: string; content?: unknown[] };
    return docNode.type !== 'doc' || !Array.isArray(docNode.content) || docNode.content.length === 0;
  }
  return true;
}

export function buildCollagenLinePageDraft(): JSONContent {
  return doc([tableFromTitleBodyRows(COLLAGEN_SPEC_CELLS)]);
}

export function buildBcaa6000LinePageDraft(): JSONContent {
  return doc([tableFromTitleBodyRows(BCAA6000_INFO_CELLS)]);
}

export function buildHydroLinePageDraft(): JSONContent {
  return doc([
    heading(2, HYDRO_CATEGORY_PRODUCT_DESCRIPTION.heading),
    ...HYDRO_CATEGORY_PRODUCT_DESCRIPTION.points.map((point) => paragraph(point)),
  ]);
}

export function buildNutrientLinePageDraft(): JSONContent {
  return doc([
    heading(3, 'Применение'),
    paragraph(DEFAULT_NUTRIENT_USAGE),
    heading(3, 'Состав'),
    paragraph(DEFAULT_NUTRIENT_COMPOSITION),
  ]);
}

export function buildBoneBrothLinePageDraft(): JSONContent {
  const { heading: productHeading, introPoints, gridCells } = BONE_BROTH_PRODUCT_DESCRIPTION;

  return doc([
    heading(2, productHeading),
    ...introPoints.map((point) => paragraph(point)),
    tableFromTitleBodyRows(gridCells),
  ]);
}

const DRAFT_BUILDERS: Record<string, () => JSONContent> = {
  collagen: buildCollagenLinePageDraft,
  hydro: buildHydroLinePageDraft,
  bcaa6000: buildBcaa6000LinePageDraft,
  'sp-bcaa6000': buildBcaa6000LinePageDraft,
  nutrient: buildNutrientLinePageDraft,
  'sp-nutrient': buildNutrientLinePageDraft,
  bonebroth: buildBoneBrothLinePageDraft,
  'sp-bonebroth': buildBoneBrothLinePageDraft,
};

export const SEED_CATEGORY_LINE_PAGE_SLUGS = Object.keys(DRAFT_BUILDERS);

export function buildCategoryLinePageDraftForSlug(slug: string): JSONContent | null {
  const builder = DRAFT_BUILDERS[slug];
  return builder ? builder() : null;
}

export function shouldSeedCategoryLinePage(slug: string, linePageBodyRichJson: unknown): boolean {
  return Boolean(DRAFT_BUILDERS[slug]) && isEmptyLineDoc(linePageBodyRichJson);
}
