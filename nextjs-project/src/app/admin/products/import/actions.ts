'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { sanitizeProductText } from '@/lib/sanitize-text';

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

// Нормализация текста: очистка от разметки Тильды и HTML (используется для заголовков/коротких полей)
function normalizeText(text: string): string {
  if (!text) return '';
  return sanitizeProductText(text);
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
function extractId(idString: string): string {
  if (!idString) return '0';
  try {
    const id = parseInt(idString, 10);
    return isNaN(id) ? '0' : id.toString();
  } catch (error) {
    console.error('Ошибка при извлечении ID:', error);
    return '0';
  }
}

/** Парсит целое число из строки; для веса и габаритов (СДЭК). Возвращает null если не число или ≤ 0. */
function parseOptionalInt(value: string | undefined): number | null {
  if (value == null || String(value).trim() === '') return null;
  const n = parseInt(String(value).replace(/\s/g, ''), 10);
  return Number.isNaN(n) || n < 0 ? null : n;
}

// Функция для обработки категорий
function extractCategories(categoryString: string): string[] {
  if (!categoryString) return [];
  return categoryString.split(';').map(cat => cat.trim()).filter(cat => cat.length > 0);
}

// Функция для обработки изображений
function extractImages(photoString: string): string[] {
  if (!photoString) return [];
  // Разделяем по двойному знаку и убираем лишние пробелы
  return photoString.split(' ').map(img => img.trim()).filter(img => img.length > 0);
}

// Функция для импорта товаров из CSV
export async function importProductsFromCSV(csvContent: string) {
  try {
    console.log('[IMPORT] Начало импорта CSV');
    
    // Разбиваем CSV на строки
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    console.log(`[IMPORT] Найдено строк: ${lines.length}`);
    
    // Пропускаем заголовок
    const dataLines = lines.slice(1);
    
    console.log(`[IMPORT] Обрабатываемые строки: ${dataLines.length}`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Импортируем каждый товар
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      try {
        console.log(`[IMPORT] Обработка строки ${i + 1}: ${line.substring(0, 100)}...`);
        
        // Парсим CSV строку
        const fields = parseCSVLine(line);
        
        console.log(`[IMPORT] Поля: ${fields.length}`, fields);
        
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
        const quantityValue = parseInt(quantity, 10) || 0;

        // Подготавливаем описание и текст (поля схемы Prisma)
        const descrNormalized = normalizeText(description) || null;
        const textNormalized = normalizeText(text) || null;

        // Извлекаем изображения (первая ссылка — в photo, по ТЗ скачиваем в public/uploads/products/)
        const imageLinks = extractImages(photo);
        const primaryImageLink = imageLinks.length > 0 ? imageLinks[0].trim() : null;

        // Колонки 32–35 в CSV (индексы 31–34): Weight (г), Length (мм), Width (мм), Height (мм) — для СДЭК
        const weightG = parseOptionalInt(fields[31]);
        const lengthMm = parseOptionalInt(fields[32]);
        const widthMm = parseOptionalInt(fields[33]);
        const heightMm = parseOptionalInt(fields[34]);

        // Данные в формате текущей Prisma-схемы Product
        const productData = {
          tildaUid: String(tildaUid).trim(),
          title: normalizeText(title) || 'Без названия',
          description: descrNormalized,
          text: textNormalized,
          price: priceValue,
          priceOld: oldPriceValue > 0 && oldPriceValue > priceValue ? oldPriceValue : null,
          quantity: quantityValue,
          photo: null as string | null, // заполним после скачивания или оставим ссылку
          category: category?.trim() || null,
          brand: brand?.trim() || null,
          sku: sku?.trim() || null,
          mark: mark?.trim() || null,
          weight: weightG,
          length: lengthMm,
          width: widthMm,
          height: heightMm,
          seoTitle: seoTitle?.trim() || null,
          seoDescr: seoDescr?.trim() || null,
          seoKeywords: seoKeywords?.trim() || null,
          fbTitle: fbTitle?.trim() || null,
          fbDescr: fbDescr?.trim() || null,
          tab1: tab1 ? sanitizeProductText(tab1) || null : null,
          tab2: tab2 ? sanitizeProductText(tab2) || null : null,
          tab3: tab3 ? sanitizeProductText(tab3) || null : null,
          tab4: tab4 ? sanitizeProductText(tab4) || null : null,
          characteristicsNutrition100g: characteristics1?.trim() || null,
          characteristicsKkal: characteristics2?.trim() || null,
          characteristicsContraindications: characteristics3?.trim() || null,
          characteristicsShelfLife: characteristics4?.trim() || null,
          characteristicsShelfLife2: characteristics5?.trim() || null,
          characteristicsNutrition100gProduct: characteristics6?.trim() || null,
          characteristicsEnergyValue100g: characteristics7?.trim() || null,
          characteristicsNutrition100g2: characteristics8?.trim() || null,
          characteristicsNutritionPerPortion5g: characteristics9?.trim() || null,
          characteristicsComposition: characteristics10?.trim() || null,
          characteristicsKkal100gDailyDose: characteristics11?.trim() || null,
          characteristicsFormulation: characteristics12?.trim() || null,
          characteristicsCalorie: characteristics13?.trim() || null,
          characteristicsFlacon200ml: characteristics14?.trim() || null,
          characteristicsStorage: characteristics15?.trim() || null,
        };

        console.log('[IMPORT] Импортируем товар:', { tildaUid: productData.tildaUid, title: productData.title });

        // Ищем по tildaUid (уникальное поле в схеме)
        const existingProduct = await prisma.product.findUnique({
          where: { tildaUid: productData.tildaUid },
        });

        let productId: string;
        if (existingProduct) {
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: { ...productData, photo: existingProduct.photo },
          });
          productId = existingProduct.id;
          console.log(`Обновлен товар: ${productData.title}`);
        } else {
          const created = await prisma.product.create({
            data: { ...productData, photo: primaryImageLink || null },
          });
          productId = created.id;
          console.log(`Создан товар: ${productData.title}`);
        }

        // Скачивание фото по ТЗ: Tilda -> public/uploads/products/ -> путь в БД
        if (primaryImageLink && primaryImageLink.startsWith('http')) {
          try {
            const safeUid = productData.tildaUid.replace(/[^a-zA-Z0-9-_]/g, '_');
            const filename = `${safeUid}-${Date.now()}.jpg`;
            const productFolder = 'products';
            const savedPath = await downloadImage(primaryImageLink, filename, productFolder);
            await prisma.product.update({
              where: { id: productId },
              data: { photo: savedPath },
            });
          } catch (imageError) {
            console.warn(`[IMPORT] Не удалось скачать изображение для ${productData.title}:`, imageError);
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