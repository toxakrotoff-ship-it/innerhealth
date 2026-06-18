#!/usr/bin/env ts-node

import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  buildCategoryLinePageDraftForSlug,
  SEED_CATEGORY_LINE_PAGE_SLUGS,
  shouldSeedCategoryLinePage,
} from '../src/lib/seed-category-line-page-drafts';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан. Проверьте .env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedCategoryLineDrafts(): Promise<void> {
  console.log('Seeding Sprint category line page drafts (без bento)...');

  const categories = await prisma.category.findMany({
    where: {
      brand: 'sprint-power',
      slug: { in: SEED_CATEGORY_LINE_PAGE_SLUGS },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      linePageBodyRichJson: true,
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const category of categories) {
    if (!shouldSeedCategoryLinePage(category.slug, category.linePageBodyRichJson)) {
      console.log(`  skip ${category.slug} — контент уже есть или slug не в списке`);
      skipped += 1;
      continue;
    }

    const draft = buildCategoryLinePageDraftForSlug(category.slug);
    if (!draft) {
      skipped += 1;
      continue;
    }

    await prisma.category.update({
      where: { id: category.id },
      data: {
        linePageBodyRichJson: draft,
        updatedAt: new Date(),
      },
    });

    console.log(`  updated ${category.slug} (${category.title})`);
    updated += 1;
  }

  console.log(`Done. Updated: ${updated}, skipped: ${skipped}`);
}

seedCategoryLineDrafts()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
