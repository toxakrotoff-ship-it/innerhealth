// Проверка состояния категорий и связей
const { prisma } = require('../src/lib/prisma');

async function checkDatabaseState() {
  try {
    console.log('=== Проверка состояния базы данных ===');
    
    // Проверяем категории
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    console.log(`Категории (${categories.length}):`);
    categories.forEach(cat => {
      console.log(`  - ${cat.title} (ID: ${cat.id})`);
    });
    
    // Проверяем товары
    const products = await prisma.product.findMany({
      take: 5
    });
    console.log(`\nТовары (${products.length}):`);
    products.forEach(prod => {
      console.log(`  - ${prod.title} (ID: ${prod.id})`);
    });
    
    // Проверяем связи
    const productCategories = await prisma.productCategory.findMany({
      take: 5
    });
    console.log(`\nСвязи товаров и категорий (${productCategories.length}):`);
    productCategories.forEach(pc => {
      console.log(`  - Product: ${pc.productId} → Category: ${pc.categoryId}`);
    });
    
    // Проверяем количество товаров в каждой категории
    console.log('\n=== Количество товаров по категориям ===');
    for (const category of categories) {
      const count = await prisma.productCategory.count({
        where: { categoryId: category.id }
      });
      console.log(`${category.title}: ${count} товаров`);
    }
    
  } catch (error) {
    console.error('Ошибка при проверке базы данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseState();