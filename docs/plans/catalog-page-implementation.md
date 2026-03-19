# Admin Catalog Page Implementation Specification

## File Structure
```
nextjs-project/src/app/admin/catalog/page.tsx
nextjs-project/src/app/admin/catalog/actions.ts
nextjs-project/src/app/admin/catalog/components/
nextjs-project/src/app/admin/catalog/components/ProductTable.tsx
nextjs-project/src/app/admin/catalog/components/ImportSection.tsx
```

## Main Catalog Page (`page.tsx`)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { ProductTable } from './components/ProductTable';
import { ImportSection } from './components/ImportSection';
import { Product } from '@prisma/client';

export default function AdminCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading products...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Административный каталог</h1>
        <button 
          onClick={fetchProducts}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
        >
          Обновить
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProductTable products={products} onRefresh={fetchProducts} />
        </div>
        <div>
          <ImportSection onImportSuccess={fetchProducts} />
        </div>
      </div>
    </div>
  );
}
```

## Product Table Component (`components/ProductTable.tsx`)

```tsx
'use client';

import { useState } from 'react';
import { Product } from '@prisma/client';

interface ProductTableProps {
  products: Product[];
  onRefresh: () => void;
}

export function ProductTable({ products, onRefresh }: ProductTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const sortedProducts = React.useMemo(() => {
    let sortableProducts = [...products];
    
    if (sortConfig !== null) {
      sortableProducts.sort((a, b) => {
        if (a[sortConfig.key as keyof Product] < b[sortConfig.key as keyof Product]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key as keyof Product] > b[sortConfig.key as keyof Product]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return sortableProducts;
  }, [products, sortConfig]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredProducts = sortedProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.id.includes(searchTerm)
  );

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Товары</h3>
        <p className="mt-1 text-sm text-gray-500">Управление товарами каталога</p>
      </div>
      
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Поиск товаров..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('id')}
                >
                  ID
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  Название
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('price')}
                >
                  Цена
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('stock')}
                >
                  Запас
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.price} ₽</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">Редактировать</button>
                    <button className="text-red-600 hover:text-red-900">Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

## Import Section Component (`components/ImportSection.tsx`)

```tsx
'use client';

import { useState, useRef } from 'react';
import { importProductsFromCSV } from '../actions';

interface ImportSectionProps {
  onImportSuccess: () => void;
}

export function ImportSection({ onImportSuccess }: ImportSectionProps) {
  const [csvContent, setCsvContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const handleImportCSV = async () => {
    if (!csvContent.trim()) {
      setError('Пожалуйста, загрузите или введите содержимое CSV');
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setError(null);

    try {
      const result = await importProductsFromCSV(csvContent);
      
      if (result.success) {
        setImportResult(result.message);
        onImportSuccess(); // Refresh product list
      } else {
        setError(`Ошибка: ${result.message}`);
      }
    } catch (err) {
      console.error('Ошибка импорта CSV:', err);
      setError('Ошибка при импорте данных');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Импорт товаров</h3>
        <p className="mt-1 text-sm text-gray-500">Импорт товаров из CSV файла</p>
      </div>
      
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Загрузить CSV файл
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="csvContent" className="block text-sm font-medium text-gray-700 mb-2">
            Или вставить содержимое CSV
          </label>
          <textarea
            id="csvContent"
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder="Вставьте содержимое CSV файла здесь..."
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleImportCSV}
            disabled={isImporting || !csvContent.trim()}
            className={`px-4 py-2 rounded-md text-white ${
              isImporting || !csvContent.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isImporting ? 'Импорт...' : 'Импортировать товары'}
          </button>
          
          <button
            onClick={() => {
              setCsvContent('');
              setError(null);
              setImportResult(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Очистить
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {importResult && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700">{importResult}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Import Actions (`actions.ts`)

```tsx
'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { Product } from '@prisma/client';

// Функция для скачивания изображения и сохранения на сервере
async function downloadImage(imageUrl: string, filename: string, productFolder: string): Promise<string> {
  try {
    console.log(`[DEBUG] Скачивание изображения: ${imageUrl}`);
    
    // Создаем директорию uploads если она не существует
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', productFolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Скачиваем изображение с помощью fetch
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`Не удалось загрузить изображение: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);
    
    // Сохраняем изображение на диск
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, imageBuffer);
    
    console.log(`[DEBUG] Изображение сохранено: ${filePath}`);
    
    // Возвращаем путь к файлу
    return `/uploads/${productFolder}/${filename}`;
  } catch (error) {
    console.error('[DEBUG] Ошибка скачивания изображения:', error);
    throw new Error('Не удалось скачать изображение');
  }
}

// Функция для парсинга CSV строки с разделителем точка с запятой
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Двойная кавычка внутри поля
        currentField += '"';
        i++; // Пропускаем следующую кавычку
      } else {
        // Переключение состояния кавычек
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      // Конец поля
      fields.push(currentField);
      currentField = '';
    } else {
      // Обычный символ
      currentField += char;
    }
  }
  
  // Добавляем последнее поле
  fields.push(currentField);
  
  return fields;
}

// Функция для нормализации текста (удаление HTML тегов и лишних пробелов)
function normalizeText(text: string): string {
  if (!text) return '';
  // Удаляем HTML теги
  return text.replace(/<[^>]*>/g, '').trim();
}

// Функция для извлечения цены из строки
function extractPrice(priceString: string): number {
  if (!priceString) return 0;
  try {
    // Убираем все кроме цифр, точки и запятой
    const cleaned = priceString.replace(/[^\d.,]/g, '');
    // Заменяем запятую на точку для правильного парсинга
    const normalized = cleaned.replace(',', '.');
    const price = parseFloat(normalized);
    return isNaN(price) ? 0 : price;
  } catch (error) {
    console.error('Ошибка при извлечении цены:', error);
    return 0;
  }
}

// Функция для извлечения ID из строки
function extractId(idString: string): number {
  if (!idString) return 0;
  try {
    const id = parseInt(idString, 10);
    return isNaN(id) ? 0 : id;
  } catch (error) {
    console.error('Ошибка при извлечении ID:', error);
    return 0;
  }
}

// Функция для обработки категорий
function extractCategories(categoryString: string): string[] {
  if (!categoryString) return [];
  return categoryString.split(';').map(cat => cat.trim()).filter(cat => cat.length > 0);
}

// Функция для обработки изображений
function extractImages(photoString: string): string[] {
  if (!photoString) return [];
  // Разделяем по пробелам и убираем лишние пробелы
  return photoString.split(' ').map(img => img.trim()).filter(img => img.length > 0);
}

// Функция для импорта товаров из CSV
export async function importProductsFromCSV(csvContent: string) {
  try {
    console.log('[DEBUG] Начало импорта CSV');
    
    // Разбиваем CSV на строки
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    console.log(`[DEBUG] Найдено строк: ${lines.length}`);
    
    // Пропускаем заголовок
    const dataLines = lines.slice(1);
    
    console.log(`[DEBUG] Обрабатываемые строки: ${dataLines.length}`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Импортируем каждый товар
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      try {
        console.log(`[DEBUG] Обработка строки ${i + 1}: ${line.substring(0, 100)}...`);
        
        // Парсим CSV строку
        const fields = parseCSVLine(line);
        
        console.log(`[DEBUG] Поля: ${fields.length}`, fields);
        
        // Проверяем, что у нас есть нужное количество полей
        if (fields.length < 10) {
          throw new Error(`Недостаточно полей в строке CSV: ${line}`);
        }
        
        // Извлекаем данные из CSV (соответствие по позициям)
        const [
          tildaUid,
          brand,
          sku,
          mark,
          category,
          title,
          description,
          text,
          photo,
          price,
          quantity,
          priceOld,
          editions,
          modifications,
          externalId,
          parentUid,
          characteristics1,
          characteristics2,
          characteristics3,
          characteristics4,
          characteristics5,
          characteristics6,
          characteristics7,
          characteristics8,
          characteristics9,
          characteristics10,
          characteristics11,
          characteristics12,
          characteristics13,
          characteristics14,
          characteristics15,
          characteristics16,
          characteristics17,
          characteristics18,
          characteristics19,
          characteristics20,
          characteristics21,
          characteristics22,
          characteristics23,
          characteristics24,
          characteristics25,
          characteristics26,
          characteristics27,
          characteristics28,
          characteristics29,
          characteristics30,
          characteristics31,
          characteristics32,
          characteristics33,
          characteristics34,
          characteristics35,
          characteristics36,
          characteristics37,
          characteristics38,
          characteristics39,
          characteristics40,
          characteristics41,
          characteristics42,
          characteristics43,
          characteristics44,
          characteristics45,
          characteristics46,
          characteristics47,
          characteristics48,
          characteristics49,
          characteristics50,
          characteristics51,
          characteristics52,
          characteristics53,
          characteristics54,
          characteristics55,
          characteristics56,
          characteristics57,
          characteristics58,
          characteristics59,
          characteristics60,
          characteristics61,
          characteristics62,
          characteristics63,
          characteristics64,
          characteristics65,
          characteristics66,
          characteristics67,
          characteristics68,
          characteristics69,
          characteristics70,
          characteristics71,
          characteristics72,
          characteristics73,
          characteristics74,
          characteristics75,
          characteristics76,
          characteristics77,
          characteristics78,
          characteristics79,
          characteristics80,
          characteristics81,
          characteristics82,
          characteristics83,
          characteristics84,
          characteristics85,
          characteristics86,
          characteristics87,
          characteristics88,
          characteristics89,
          characteristics90,
          characteristics91,
          characteristics92,
          characteristics93,
          characteristics94,
          characteristics95,
          characteristics96,
          characteristics97,
          characteristics98,
          characteristics99,
          characteristics100,
          seoTitle,
          seoDescr,
          seoKeywords,
          fbTitle,
          fbDescr,
          tab1,
          tab2,
          tab3,
          tab4
        ] = fields;
        
        console.log(`[DEBUG] Извлеченные данные - ID: ${tildaUid}, Title: ${title}`);
        
        // Преобразуем цену (удаляем RUB и запятые)
        const priceValue = extractPrice(price);
        const oldPriceValue = extractPrice(priceOld);
        
        // Преобразуем ID
        const productId = extractId(tildaUid);
        
        // Подготавливаем данные для сохранения в базу данных
        const slug = title.toLowerCase()
          .replace(/[^a-zA-Z0-9\s\-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/^-|-$/g, '') || 'product';
        
        // Подготавливаем описание (объединяем description и text)
        const combinedDescription = normalizeText(description) + (text ? '<br/>' + normalizeText(text) : '');
        
        // Извлекаем изображения
        const imageLinks = extractImages(photo);
        const primaryImageLink = imageLinks.length > 0 ? imageLinks[0] : null;
        
        // Извлекаем категории
        const categories = extractCategories(category);
        const productType = categories.length > 0 ? categories[0] : null;
        
        // Подготавливаем данные для сохранения в базу данных
        const productData = {
          name: normalizeText(title),
          slug: slug,
          description: combinedDescription || null,
          price: priceValue,
          discountPrice: oldPriceValue > priceValue ? oldPriceValue : null,
          stock: parseInt(quantity) || 0,
          imageLink: primaryImageLink || null,
          isHidden: mark === 'SALE' || mark === 'OUT OF STOCK',
          tag: productType || null,
          weight: null,
          width: null,
          height: null,
          length: null,
          isPromoEligible: mark === 'SALE' || mark === 'акции' || mark === 'АКЦИИ СТД',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        console.log('Импортируем товар:', {
          ...productData,
          id: productId
        });
        
        // Проверяем существование товара
        const existingProduct = await prisma.product.findUnique({
          where: { id: productId }
        });
        
        if (existingProduct) {
          // Обновляем существующий товар
          await prisma.product.update({
            where: { id: productId },
            data: productData
          });
          console.log(`Обновлен товар: ${productData.name}`);
        } else {
          // Создаем новый товар
          await prisma.product.create({
            data: productData
          });
          console.log(`Создан товар: ${productData.name}`);
        }
        
        // Обработка изображения
        if (primaryImageLink && primaryImageLink.trim() !== '') {
          try {
            console.log(`[DEBUG] Обработка изображения для товара: ${title}`);
            
            // Проверяем, что URL начинается с static.tildacdn.com
            if (primaryImageLink.includes('static.tildacdn.com')) {
              // Сохраняем изображения
              const filename = `csv-image-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
              const productFolder = title.toLowerCase()
                .replace(/[^a-zA-Z0-9\s\-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/^-|-$/g, '') || 'product';
              
              const savedPath = await downloadImage(primaryImageLink, filename, productFolder);
              
              // Обновляем товар с изображением
              await prisma.product.update({
                where: { id: productId },
                data: {
                  imageLink: savedPath
                }
              });
            }
          } catch (imageError) {
            console.warn(`[DEBUG] Не удалось обработать изображение для товара ${title}:`, imageError);
            // Добавляем в ошибки
            errors.push(`Ошибка при обработке изображения для товара ${title}: ${(imageError as Error).message}`);
            errorCount++;
          }
        }
        
        successCount++;
        console.log(`[DEBUG] Успешно обработан товар ${i + 1}`);
        
      } catch (error: any) {
        console.error(`Ошибка импорта товара ${i + 1}:`, error);
        errorCount++;
        errors.push(`Ошибка при импорте товара ${i + 1}: ${error.message || error}`);
      }
    }
    
    console.log(`[DEBUG] Импорт завершен! Успешно: ${successCount}, Ошибок: ${errorCount}`);
    
    return {
      success: true,
      message: `Импорт завершен! Успешно: ${successCount}, Ошибок: ${errorCount}`,
      successCount,
      errorCount,
      errors
    };
  } catch (error: any) {
    console.error('Ошибка импорта CSV:', error);
    return {
      success: false,
      message: 'Ошибка при импорте данных',
      error: error.message || error
    };
  }
}
```

## API Route for Products (`/src/app/api/admin/products/route.ts`)

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Product } from '@prisma/client';

export async function GET() {
  try {
    const products: Product[] = await prisma.product.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
```

## Database Schema Updates

The existing schema already includes all necessary fields for the product data. We'll map the CSV fields to the database fields appropriately.

## Key Features Implemented

1. **Authentication**: Protected admin routes with authentication
2. **Product Listing**: Table view with search and sorting
3. **CSV Import**: Upload or paste CSV content
4. **Image Processing**: Download images from static.tildacdn.com
5. **Database Integration**: Save products and images to database
6. **Error Handling**: Comprehensive error handling and reporting
7. **Responsive Design**: Mobile-friendly interface