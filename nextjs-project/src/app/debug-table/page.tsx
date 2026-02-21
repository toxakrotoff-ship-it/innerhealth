'use client';

import { useState } from 'react';
import { ProductTable } from '@/app/admin/catalog/components/ProductTable';
import type { Product } from '@prisma/client';

const mockProducts: Product[] = [
  {
    id: '1',
    tildaUid: 'mock-1',
    slug: 'tovar-1',
    title: 'Товар 1',
    price: 1000,
    quantity: 10,
    description: 'Описание товара 1',
    photo: '/images/product1.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    priceOld: 1200,
    brand: null,
    sku: null,
    mark: null,
    category: null,
    text: null,
    editions: null,
    modifications: null,
    externalId: null,
    parentUid: null,
    weight: null,
    length: null,
    width: null,
    height: null,
    seoTitle: null,
    seoDescr: null,
    seoKeywords: null,
    fbTitle: null,
    fbDescr: null,
    tab1: null,
    tab2: null,
    tab3: null,
    tab4: null,
    characteristicsNutrition100g: null,
    characteristicsKkal: null,
    characteristicsContraindications: null,
    characteristicsShelfLife: null,
    characteristicsShelfLife2: null,
    characteristicsNutrition100gProduct: null,
    characteristicsEnergyValue100g: null,
    characteristicsNutrition100g2: null,
    characteristicsNutritionPerPortion5g: null,
    characteristicsComposition: null,
    characteristicsKkal100gDailyDose: null,
    characteristicsFormulation: null,
    characteristicsCalorie: null,
    characteristicsFlacon200ml: null,
    characteristicsStorage: null,
  },
  {
    id: '2',
    tildaUid: 'mock-2',
    slug: 'tovar-2',
    title: 'Товар 2 с очень длинным названием для проверки переноса текста и отображения за пределами экрана',
    price: 2000,
    quantity: 5,
    description: 'Описание товара 2',
    photo: '/images/product2.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    priceOld: 2500,
    brand: null,
    sku: null,
    mark: null,
    category: null,
    text: null,
    editions: null,
    modifications: null,
    externalId: null,
    parentUid: null,
    weight: null,
    length: null,
    width: null,
    height: null,
    seoTitle: null,
    seoDescr: null,
    seoKeywords: null,
    fbTitle: null,
    fbDescr: null,
    tab1: null,
    tab2: null,
    tab3: null,
    tab4: null,
    characteristicsNutrition100g: null,
    characteristicsKkal: null,
    characteristicsContraindications: null,
    characteristicsShelfLife: null,
    characteristicsShelfLife2: null,
    characteristicsNutrition100gProduct: null,
    characteristicsEnergyValue100g: null,
    characteristicsNutrition100g2: null,
    characteristicsNutritionPerPortion5g: null,
    characteristicsComposition: null,
    characteristicsKkal100gDailyDose: null,
    characteristicsFormulation: null,
    characteristicsCalorie: null,
    characteristicsFlacon200ml: null,
    characteristicsStorage: null,
  },
  {
    id: '3',
    tildaUid: 'mock-3',
    slug: 'tovar-3',
    title: 'Товар 3',
    price: 1500,
    quantity: 15,
    description: 'Описание товара 3',
    photo: '/images/product3.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    priceOld: 1800,
    brand: null,
    sku: null,
    mark: null,
    category: null,
    text: null,
    editions: null,
    modifications: null,
    externalId: null,
    parentUid: null,
    weight: null,
    length: null,
    width: null,
    height: null,
    seoTitle: null,
    seoDescr: null,
    seoKeywords: null,
    fbTitle: null,
    fbDescr: null,
    tab1: null,
    tab2: null,
    tab3: null,
    tab4: null,
    characteristicsNutrition100g: null,
    characteristicsKkal: null,
    characteristicsContraindications: null,
    characteristicsShelfLife: null,
    characteristicsShelfLife2: null,
    characteristicsNutrition100gProduct: null,
    characteristicsEnergyValue100g: null,
    characteristicsNutrition100g2: null,
    characteristicsNutritionPerPortion5g: null,
    characteristicsComposition: null,
    characteristicsKkal100gDailyDose: null,
    characteristicsFormulation: null,
    characteristicsCalorie: null,
    characteristicsFlacon200ml: null,
    characteristicsStorage: null,
  },
];

export default function DebugTablePage() {
  const [products, setProducts] = useState(mockProducts);

  const handleRefresh = () => {
    console.log('Refreshing products...');
    // Здесь можно добавить логику обновления данных
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6">Отладка ProductTable</h1>
      
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Таблица товаров с длинными названиями</h2>
        <div className="max-w-7xl mx-auto">
          <ProductTable products={products} onRefresh={handleRefresh} selectedCategory={null} />
        </div>
      </div>
      
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Таблица без ограничения ширины</h2>
        <ProductTable products={products} onRefresh={handleRefresh} selectedCategory={null} />
      </div>
    </div>
  );
}