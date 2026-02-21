#!/usr/bin/env ts-node

import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан. Проверьте .env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedCategories() {
  // Список из docs/categories.md (разделы по умолчанию)
  const categories = [
    { title: 'Collagen', slug: 'collagen', sortOrder: 1 },
    { title: 'Грибная коллекция', slug: 'gribnaya-kollekciya', sortOrder: 2 },
    { title: 'Нутриенты', slug: 'nutrienty', sortOrder: 3 },
    { title: 'Бульоны', slug: 'bulony', sortOrder: 4 },
    { title: 'Подарочные наборы', slug: 'podarkovye-nabory', sortOrder: 5 },
    { title: 'Подарочные сертификаты', slug: 'podarkovye-sertifikaty', sortOrder: 6 },
    { title: 'Акции', slug: 'aktsii', sortOrder: 7 },
    { title: 'Новинки', slug: 'novinki', sortOrder: 8 },
  ];

  try {
    console.log('Starting to seed categories...');

    await prisma.category.deleteMany({});
    console.log('Deleted existing categories');

    for (const category of categories) {
      await prisma.category.create({
        data: {
          title: category.title,
          slug: category.slug,
          sortOrder: category.sortOrder,
        },
      });
      console.log(`Created category: ${category.title}`);
    }
    
    console.log('Successfully seeded categories');
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories();