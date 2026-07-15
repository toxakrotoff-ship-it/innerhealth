#!/usr/bin/env ts-node

import path from 'path'
import dotenv from 'dotenv'
import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '../.env') })

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан. Проверьте .env или .env.local')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
const dryRun = process.argv.includes('--dry-run')

type InnerCategorySeed = {
  title: string
  pageTitle: string
  seoTitle: string
  seoDescription: string
  seoKeywords: string
  catalogTeaser: string
  image: string | null
  imageAlt: string
  linePageBodyRichJson: Prisma.InputJsonValue
}

function textNode(text: string) {
  return { type: 'text', text }
}

function paragraph(text: string) {
  return { type: 'paragraph', content: [textNode(text)] }
}

function heading(text: string) {
  return { type: 'heading', attrs: { level: 2 }, content: [textNode(text)] }
}

function bulletList(items: readonly string[]) {
  return {
    type: 'bulletList',
    content: items.map((item) => ({
      type: 'listItem',
      content: [paragraph(item)],
    })),
  }
}

function buildDoc(options: {
  heading: string
  bullets?: readonly string[]
  paragraphs: readonly string[]
}): Prisma.InputJsonValue {
  const content = [heading(options.heading)]
  if (options.bullets?.length) content.push(bulletList(options.bullets))
  content.push(...options.paragraphs.map((item) => paragraph(item)))
  return { type: 'doc', content }
}

const INNER_CATEGORY_CONTENT: Record<string, InnerCategorySeed> = {
  podarkovye-nabory: {
    title: 'Подарочные наборы',
    pageTitle: 'Подарочные наборы Inner Health',
    catalogTeaser:
      'Готовые подарочные наборы и подборки продуктов Inner Health для знакомых и близких.',
    seoTitle: 'Подарочные наборы Inner Health',
    seoDescription:
      'Подарочные наборы Inner Health с продуктами бренда в готовых комбинациях. Актуальные варианты и доставка по России.',
    seoKeywords: 'подарочные наборы Inner Health, наборы с продуктами Inner Health',
    image: '/uploads/categories/1775037592878-7ecaruorc.png',
    imageAlt: 'Подарочные наборы Inner Health',
    linePageBodyRichJson: buildDoc({
      heading: 'Подарочные наборы Inner Health',
      paragraphs: [
        'В этом разделе собраны готовые наборы и подборки продуктов Inner Health, которые удобно выбирать для подарка или знакомства с ассортиментом.',
        'Если актуальные наборы временно недоступны, страница остаётся ориентиром по разделу и будет обновляться по мере появления предложений.',
      ],
    }),
  },
  bulony: {
    title: 'Натуральные бульоны',
    pageTitle: 'Натуральные сухие бульоны',
    catalogTeaser:
      'Сухие концентраты и пептидный костный бульон в удобных форматах для приготовления напитков, супов и повседневных блюд.',
    seoTitle: 'Натуральные сухие бульоны — купить в Inner Health',
    seoDescription:
      'Натуральные сухие куриные и говяжьи бульоны Inner Health. Концентраты и костный бульон в стиках. Состав, характеристики и доставка по России.',
    seoKeywords:
      'натуральный сухой бульон, сухой куриный бульон, сухой говяжий бульон, костный бульон',
    image: '/images/categories/bulony.png',
    imageAlt: 'Натуральные сухие бульоны Inner Health',
    linePageBodyRichJson: buildDoc({
      heading: 'Натуральные сухие бульоны Inner Health',
      paragraphs: [
        'В категории представлены концентрированные куриные и говяжьи бульоны, а также пептидный костный куриный бульон без добавок.',
        'Сухой формат удобно хранить и использовать дома, на работе или в поездке. Бульон можно приготовить как самостоятельный горячий напиток или использовать как основу для супов, соусов и других повседневных блюд.',
      ],
    }),
  },
  collagen: {
    title: 'Коллаген и пептиды',
    pageTitle: 'Коллаген и пептиды',
    catalogTeaser:
      'Порошковые и таблетированные продукты на основе гидролизованного коллагена различных типов.',
    seoTitle: 'Коллаген и пептиды — купить в Inner Health',
    seoDescription:
      'Гидролизованный коллаген Inner Health в порошке и таблетках: коллаген II типа, комплексы I, II и III типов и коллаген с черной макой. Доставка по России.',
    seoKeywords:
      'гидролизованный коллаген, коллаген и пептиды, коллаген II типа, коллаген с черной макой',
    image: '/images/categories/collagen.png',
    imageAlt: 'Коллаген и пептиды Inner Health',
    linePageBodyRichJson: buildDoc({
      heading: 'Коллаген и пептиды Inner Health',
      bullets: [
        'гидролизованный коллаген II типа с витамином C;',
        'мультикомплексы I, II и III типов в нескольких вкусах;',
        'пептиды коллагена с черной макой.',
      ],
      paragraphs: [
        'В ассортименте Inner Health представлены продукты, которые отличаются источником сырья, составом, вкусом и формой выпуска.',
        'Сравните характеристики карточек товара, чтобы выбрать наиболее удобный вариант для повседневного рациона.',
      ],
    }),
  },
  'gribnaya-kollekciya': {
    title: 'Грибная коллекция Inner Health',
    pageTitle: 'Функциональные грибы Inner Health',
    catalogTeaser: 'Ежовик, кордицепс, рейши, траметес и лисички в капсулах и других форматах.',
    seoTitle: 'Функциональные грибы Inner Health — купить',
    seoDescription:
      'Функциональные грибы Inner Health: ежовик гребенчатый, кордицепс, рейши, траметес и лисички в капсулах и других форматах. Доставка по России.',
    seoKeywords:
      'функциональные грибы, ежовик гребенчатый, кордицепс военный, гриб рейши, траметес, лисички',
    image: '/images/categories/gribnaya-kollekciya.png',
    imageAlt: 'Функциональные грибы Inner Health',
    linePageBodyRichJson: buildDoc({
      heading: 'Функциональные грибы Inner Health',
      bullets: [
        'ежовик гребенчатый;',
        'кордицепс военный;',
        'рейши;',
        'траметес разноцветный;',
        'лисички;',
        'сочетание ежовика и кордицепса.',
      ],
      paragraphs: [
        'В категории представлены продукты из основных видов грибов Inner Health. В ассортименте есть капсулы и другие форматы, а также сочетания нескольких видов грибов.',
        'При выборе обращайте внимание на вид сырья, форму выпуска, состав и рекомендуемый способ применения, указанные в карточках товаров.',
      ],
    }),
  },
  nutrienty: {
    title: 'Нутриенты',
    pageTitle: 'Нутриенты Inner Health',
    catalogTeaser:
      'Капсулы с биойодином и биоферином для повседневного рациона и аккуратного выбора по составу.',
    seoTitle: 'Нутриенты Inner Health',
    seoDescription:
      'Нутриенты Inner Health: биойодин и биоферин в капсулах. Подробные характеристики, состав и доставка по России.',
    seoKeywords: 'нутриенты Inner Health, биойодин, биоферин, капсулы нутриенты',
    image: '/images/categories/nutrienty.png',
    imageAlt: 'Нутриенты Inner Health',
    linePageBodyRichJson: buildDoc({
      heading: 'Нутриенты Inner Health',
      bullets: ['капсулы биойодина 150;', 'капсулы биоферина.'],
      paragraphs: [
        'Раздел объединяет нутриенты Inner Health в капсульной форме с понятным составом и краткими характеристиками в карточках товара.',
        'Сравните формат, состав и рекомендации по применению, чтобы выбрать подходящий вариант для повседневного рациона.',
      ],
    }),
  },
  'podarochnie-sertifikaty': {
    title: 'Подарочные сертификаты',
    pageTitle: 'Подарочные сертификаты Inner Health',
    catalogTeaser:
      'Раздел для подарочных сертификатов Inner Health, если вы хотите оставить выбор ассортимента получателю.',
    seoTitle: 'Подарочные сертификаты Inner Health',
    seoDescription:
      'Подарочные сертификаты Inner Health для выбора ассортимента бренда. Информация о доступности и оформлении.',
    seoKeywords: 'подарочный сертификат Inner Health, сертификаты Inner Health',
    image: null,
    imageAlt: 'Подарочные сертификаты Inner Health',
    linePageBodyRichJson: buildDoc({
      heading: 'Подарочные сертификаты Inner Health',
      paragraphs: [
        'Этот раздел предназначен для подарочных сертификатов Inner Health, когда нужно передать право выбора ассортимента самому получателю.',
        'Если сертификаты временно недоступны, страница сохраняет структуру раздела и может быть оперативно обновлена через админку.',
      ],
    }),
  },
  aktsii: {
    title: 'Акции',
    pageTitle: 'Акции Inner Health',
    catalogTeaser:
      'Актуальные специальные предложения, подарки и временные предложения Inner Health.',
    seoTitle: 'Акции Inner Health',
    seoDescription:
      'Актуальные акции, подарки и специальные предложения Inner Health. Следите за обновлениями раздела.',
    seoKeywords: 'акции Inner Health, подарки Inner Health, специальные предложения Inner Health',
    image: '/uploads/categories/1775037945244-0tccpq2md.png',
    imageAlt: 'Акции Inner Health',
    linePageBodyRichJson: buildDoc({
      heading: 'Акции Inner Health',
      paragraphs: [
        'В разделе публикуются актуальные акции, подарочные предложения и другие специальные условия по ассортименту Inner Health.',
        'Список предложений обновляется по мере запуска новых кампаний, а подробности всегда доступны в карточках внутри раздела.',
      ],
    }),
  },
  novinki: {
    title: 'Новинки',
    pageTitle: 'Новинки Inner Health',
    catalogTeaser:
      'Раздел для новых поступлений и свежих позиций каталога Inner Health.',
    seoTitle: 'Новинки Inner Health',
    seoDescription:
      'Новые позиции каталога Inner Health. Следите за обновлениями ассортимента и новыми поступлениями.',
    seoKeywords: 'новинки Inner Health, новые продукты Inner Health',
    image: null,
    imageAlt: 'Новинки Inner Health',
    linePageBodyRichJson: buildDoc({
      heading: 'Новинки Inner Health',
      paragraphs: [
        'Раздел предназначен для новых поступлений и недавно добавленных позиций каталога Inner Health.',
        'Если сейчас список пуст, страница остаётся готовой к наполнению без дополнительных изменений в коде.',
      ],
    }),
  },
}

async function seedInnerCategoryContent() {
  console.log(dryRun ? 'Dry run: проверка контента категорий Inner' : 'Обновление контента категорий Inner')

  for (const [slug, payload] of Object.entries(INNER_CATEGORY_CONTENT)) {
    const category = await prisma.category.findUnique({
      where: { brand_slug: { brand: 'inner', slug } },
      select: { id: true, title: true, slug: true },
    })

    if (!category) {
      console.log(`skip ${slug}: категория не найдена`)
      continue
    }

    console.log(`${dryRun ? 'plan' : 'update'} ${slug}: ${category.title}`)
    if (dryRun) continue

    await prisma.category.update({
      where: { id: category.id },
      data: {
        title: payload.title,
        pageTitle: payload.pageTitle,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
        seoKeywords: payload.seoKeywords,
        catalogTeaser: payload.catalogTeaser,
        image: payload.image,
        imageAlt: payload.imageAlt,
        linePageBodyRichJson: payload.linePageBodyRichJson,
        showLegacyLinePageBlocks: false,
      },
    })
  }
}

seedInnerCategoryContent()
  .catch((error) => {
    console.error('Ошибка обновления категорий Inner:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
