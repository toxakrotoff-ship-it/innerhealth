#!/usr/bin/env ts-node
/**
 * Backfill Product.slug for existing rows. Run once after adding the slug column.
 * Usage: from nextjs-project: npx ts-node scripts/backfill-product-slug.ts
 */
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })
dotenv.config({ path: path.join(__dirname, '../../.env.local') })

import { prisma } from '../src/lib/prisma'
import { slugify, slugifyUnique } from '../src/lib/slugify'

async function backfillProductSlug() {
  const products = await prisma.product.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: { createdAt: 'asc' },
  })

  const existingSlugs: string[] = []
  let updated = 0

  for (const product of products) {
    const baseSlug = product.slug?.trim() || slugify(product.title)
    if (!baseSlug) continue
    const slug = slugifyUnique(baseSlug, existingSlugs)
    existingSlugs.push(slug)

    if (product.slug !== slug) {
      await prisma.product.update({
        where: { id: product.id },
        data: { slug },
      })
      updated += 1
      console.log(`Updated ${product.id}: "${product.title}" -> ${slug}`)
    }
  }

  console.log(`Done. Updated ${updated} of ${products.length} products.`)
}

backfillProductSlug()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
