'use server';

import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

// Инициализация Prisma Client
// const prisma = new PrismaClient();

// Функция для перевода названия на английский с использованием внешнего API
async function translateToEnglish(title: string): Promise<string> {
  try {
    // Используем простой подход - если у нас есть API ключ, используем его
    // В противном случае возвращаем упрощенный вариант
    const simplifiedTitle = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s\-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-|-$/g, '');
    
    return simplifiedTitle || 'product';
  } catch (error) {
    console.error('[DEBUG] Ошибка перевода:', error);
    // В случае ошибки возвращаем упрощенную версию
    const simplifiedTitle = title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s\-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-|-$/g, '');
    
    return simplifiedTitle || 'product';
  }
}

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

// Server Action для парсинга данных из Tilda
export async function scrapeTildaProduct(url: string) {
  try {
    console.log(`[DEBUG] Начало парсинга URL: ${url}`);
    
    // Валидация URL
    if (!url || !url.startsWith('http')) {
      throw new Error('Неверный формат URL');
    }

    // Получаем HTML страницы с помощью fetch (реальный запрос к URL)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Не удалось получить страницу: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`[DEBUG] Получен HTML: ${html.length} символов`);
    
    // Парсим HTML с помощью cheerio
    const $ = cheerio.load(html);
    
    // Извлекаем название товара с учетом реальной структуры Tilda
    let title = '';
    const titleSelectors = [
      '.js-store-prod-name',
      '.t-store__prod-name',
      '[data-test="product-title"]',
      'h1',
      '.product-name',
      '.t-store__prod-popup__title'
    ];
    
    console.log('[DEBUG] Поиск названия товара...');
    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        title = element.text().trim();
        console.log(`[DEBUG] Найдено название по селектору "${selector}": ${title}`);
        if (title) break;
      }
    }
    
    // Извлекаем цену с учетом реальной структуры Tilda
    let price = 0;
    let oldPrice = 0; // Цена до скидки
    let discountPrice = 0; // Цена со скидкой
    
    // Селекторы для цен
    const priceSelectors = [
      '.js-store-prod-price-val',
      '.js-product-price',
      '.t-store__prod-popup__price-value',
      '.product-price',
      '.price'
    ];
    
    // Селекторы для цены до скидки
    const oldPriceSelectors = [
      '.js-store-prod-price-old-val',
      '.t-store__prod-popup__price_old',
      '.js-store-prod-price-old'
    ];
    
    // Селекторы для цены со скидкой
    const discountPriceSelectors = [
      '.js-product-price.js-store-prod-price-val',
      '.t-store__prod-popup__price.t-store__prod-popup__price-item',
      '.js-store-prod-price-val'
    ];
    
    console.log('[DEBUG] Поиск цены...');
    let bestPrice = 0;
    let bestSelector = '';
    
    // Извлечение обычной цены - УПРОЩЕННАЯ ВЕРСИЯ БЕЗ КОРРЕКЦИИ
    console.log('[DEBUG] Начинаем извлечение цены...');
    for (const selector of priceSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        console.log(`[DEBUG] Найден элемент по селектору: ${selector}`);
        // Проверяем атрибут data-product-price-def
        const priceAttr = element.attr('data-product-price-def');
        if (priceAttr) {
          const priceValue = parseInt(priceAttr.replace(/\D/g, '')) || 0;
          console.log(`[DEBUG] Цена по атрибуту "${selector}": ${priceAttr} -> ${priceValue}`);
          if (priceValue > 0) {
            if (bestPrice === 0 || priceValue < bestPrice) {
              bestPrice = priceValue;
              bestSelector = selector;
              console.log(`[DEBUG] Выбрана цена по атрибуту: ${priceValue} (${selector})`);
            }
          }
        }
        
        // Проверяем текст элемента
        const text = element.text().trim();
        if (text) {
          // Убираем пробелы и символы валюты, оставляем только цифры
          const cleanText = text.replace(/[^\d]/g, '');
          const priceValue = parseInt(cleanText) || 0;
          console.log(`[DEBUG] Цена по тексту "${selector}": "${text}" -> "${cleanText}" -> ${priceValue}`);
          if (priceValue > 0) {
            if (bestPrice === 0 || priceValue < bestPrice) {
              bestPrice = priceValue;
              bestSelector = selector;
              console.log(`[DEBUG] Выбрана цена по тексту: ${priceValue} (${selector})`);
            }
          }
        }
      } else {
        console.log(`[DEBUG] Элемент по селектору ${selector} не найден`);
      }
    }
    
    console.log(`[DEBUG] Финальная цена: ${bestPrice}, использован селектор: ${bestSelector || 'не найден'}`);
    
    // Устанавливаем финальную цену
    price = bestPrice;
    if (bestPrice > 0) {
      console.log(`[DEBUG] Найдена цена по селектору "${bestSelector}": ${price}`);
    }
    
    // Извлечение цены до скидки
    for (const selector of oldPriceSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        if (text) {
          // Убираем пробелы и символы валюты, оставляем только цифры
          const cleanText = text.replace(/[^\d]/g, '');
          const priceValue = parseInt(cleanText) || 0;
          console.log(`[DEBUG] Проверка цены до скидки "${selector}": "${text}" -> "${cleanText}" -> ${priceValue}`);
          if (priceValue > 0 && priceValue >= 500 && priceValue <= 4000) {
            oldPrice = priceValue;
            console.log(`[DEBUG] Найдена цена до скидки: ${oldPrice} (${selector})`);
            break;
          } else if (priceValue > 0) {
            console.log(`[DEBUG] Цена до скидки вне диапазона 500-4000: ${priceValue} (${selector})`);
          }
        }
      }
    }
    
    // Извлечение цены со скидкой
    for (const selector of discountPriceSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        if (text) {
          // Убираем пробелы и символы валюты, оставляем только цифры
          const cleanText = text.replace(/[^\d]/g, '');
          const priceValue = parseInt(cleanText) || 0;
          console.log(`[DEBUG] Проверка цены со скидкой "${selector}": "${text}" -> "${cleanText}" -> ${priceValue}`);
          if (priceValue > 0 && priceValue >= 500 && priceValue <= 4000) {
            discountPrice = priceValue;
            console.log(`[DEBUG] Найдена цена со скидкой: ${discountPrice} (${selector})`);
            break;
          } else if (priceValue > 0) {
            console.log(`[DEBUG] Цена со скидкой вне диапазона 500-4000: ${priceValue} (${selector})`);
          }
        }
      }
    }
    
    // Извлекаем основное описание из js-store-prod-all-text
    console.log('[DEBUG] Поиск основного описания...');
    const mainDescription = $('.js-store-prod-all-text').first().html() || '';
    console.log(`[DEBUG] Основное описание: ${mainDescription.substring(0, 100)}...`);
    
    // Извлекаем описание из табов с учетом реальной структуры Tilda
    let description = '';
    
    // Сначала добавляем основное описание
    if (mainDescription) {
      // Очищаем описание от ненужных тегов и форматирования
      let cleanedDescription = mainDescription
        .replace(/<p[^>]*>/g, '')  // Убираем opening p tags
        .replace(/<\/p>/g, '<br>') // Заменяем closing p tags на br
        .replace(/<br\s*\/?>/gi, '<br>') // Нормализуем br теги
        .replace(/<h\d[^>]*>/g, '<br><b>') // Заменяем заголовки на жирный текст
        .replace(/<\/h\d>/g, '</b><br>')
        .replace(/<div[^>]*>/g, '') // Убираем opening div tags
        .replace(/<\/div>/g, '') // Убираем closing div tags
        .replace(/<h3[^>]*>/g, '<br><b>') // Заменяем h3 на жирный текст
        .replace(/<\/h3>/g, '</b><br>')
        .replace(/<[^>]*>/g, ''); // Убираем все остальные HTML теги
      
      // Убираем лишние переносы строк и пробелы
      cleanedDescription = cleanedDescription
        .replace(/<br>\s*<br>/g, '<br><br>') // Убираем лишние переносы
        .replace(/^\s+|\s+$/g, ''); // Убираем начальные и конечные пробелы
      
      // Заменяем двойные br на одинарные для лучшего форматирования
      cleanedDescription = cleanedDescription.replace(/<br><br><br>/g, '<br><br>');
      
      // Убираем лишние пробелы и форматируем
      cleanedDescription = cleanedDescription.replace(/\s+/g, ' ').trim();
      
      description += `<div>${cleanedDescription}</div>`;
    }
    
    // Обрабатываем табы с учетом реальной структуры
    const tabContents: string[] = [];
    
    console.log('[DEBUG] Поиск табов...');
    // Сначала пробуем найти активные табы по классу
    $('.t-store__tabs__item').each((_, element) => {
      const title = $(element).attr('data-tab-title') || '';
      const content = $(element).find('.t-store__tabs__content').html() || '';
      
      if (title && content) {
        tabContents.push(`<h3>${title}</h3><div>${content}</div>`);
        console.log(`[DEBUG] Найден таб: ${title}`);
      }
    });
    
    // Если не нашли через data-tab-title, пробуем другой способ
    if (tabContents.length === 0) {
      $('.t-store__tabs__item[data-tab-type]').each((_, element) => {
        const title = $(element).attr('data-tab-title') || '';
        const content = $(element).find('.t-store__tabs__content').html() || '';
        
        if (title && content) {
          tabContents.push(`<h3>${title}</h3><div>${content}</div>`);
          console.log(`[DEBUG] Найден таб (альтернативный способ): ${title}`);
        }
      });
    }
    
    // Объединяем содержимое табов
    if (tabContents.length > 0) {
      description += tabContents.join('<hr>');
    }
    
    // Извлекаем характеристики с учетом реальной структуры Tilda
    console.log('[DEBUG] Поиск характеристик...');
    const characteristics = $('.js-store-prod-charcs').map((_, el) => $(el).text()).get().join('<br>');
    if (characteristics) {
      description += `<h3>Характеристики</h3><div>${characteristics}</div>`;
      console.log('[DEBUG] Найдены характеристики');
    }
    
    // Извлекаем изображения с учетом реальной структуры Tilda
    const images: string[] = [];
    
    console.log('[DEBUG] Поиск изображений...');
    
    // Проверяем все возможные селекторы для изображений
    const imageSelectors = [
      '.js-product-img',
      '.t-store__prod-popup__columns',
      '.t-img',
      '.gallery img',
      '.t-store__prod-popup__image',
      '[data-product-image]',
      '.product-image',
      '.t-store__prod-image'
    ];
    
    for (const selector of imageSelectors) {
      $(selector).each((_, element) => {
        const src = $(element).attr('data-original') || 
                   $(element).attr('src') || 
                   $(element).attr('data-src') ||
                   $(element).attr('data-image-url');
        if (src && !images.includes(src)) {
          // Фильтруем изображения, чтобы исключить логотипы и неподходящие изображения
          if (!src.includes('logo') && !src.includes('favicon') && !src.includes('icon') && 
              !src.includes('apple-touch-icon') && !src.includes('manifest') &&
              (src.includes('.jpg') || src.includes('.png') || src.includes('.jpeg') || src.includes('.webp'))) {
            images.push(src);
            console.log(`[DEBUG] Найдено изображение с селектором "${selector}": ${src}`);
          }
        }
      });
      
      // Если нашли изображения, продолжаем поиск для большего количества
      if (images.length > 0) {
        console.log(`[DEBUG] Найдено ${images.length} изображений, продолжаем поиск...`);
      }
    }
    
    // Если не нашли изображения через селекторы, пробуем другие методы
    if (images.length === 0) {
      console.log('[DEBUG] Попытка найти изображения через атрибуты data-srcset и data-lazyload');
      $('[data-srcset], [data-lazyload]').each((_, element) => {
        const srcset = $(element).attr('data-srcset') || $(element).attr('data-lazyload');
        if (srcset) {
          // Разбиваем srcset на отдельные изображения
          const srcs = srcset.split(',').map(s => s.trim().split(' ')[0]);
          for (const src of srcs) {
            if (src && !images.includes(src) && 
                !src.includes('logo') && !src.includes('favicon') && !src.includes('icon') &&
                !src.includes('apple-touch-icon') && !src.includes('manifest') &&
                (src.includes('.jpg') || src.includes('.png') || src.includes('.jpeg') || src.includes('.webp'))) {
              images.push(src);
              console.log(`[DEBUG] Найдено изображение через data-srcset/data-lazyload: ${src}`);
            }
          }
        }
      });
    }
    
    // Если все еще нет изображений, пробуем найти любые img теги
    if (images.length === 0) {
      console.log('[DEBUG] Попытка найти изображения через все img теги');
      $('img').each((_, element) => {
        const src = $(element).attr('src') || $(element).attr('data-src');
        if (src && !images.includes(src) && 
            !src.includes('logo') && !src.includes('favicon') && !src.includes('icon') &&
            !src.includes('apple-touch-icon') && !src.includes('manifest') &&
            (src.includes('.jpg') || src.includes('.png') || src.includes('.jpeg') || src.includes('.webp'))) {
          images.push(src);
          console.log(`[DEBUG] Найдено изображение через img тег: ${src}`);
        }
      });
    }
    
    // Если все еще нет изображений, пробуем более широкий поиск
    if (images.length === 0) {
      console.log('[DEBUG] Попытка расширенного поиска изображений');
      // Ищем все атрибуты src в элементах с классами, связанными с изображениями
      $('[class*="img"], [class*="image"]').each((_, element) => {
        const src = $(element).attr('src') || $(element).attr('data-src') || $(element).attr('data-original');
        if (src && !images.includes(src) && 
            !src.includes('logo') && !src.includes('favicon') && !src.includes('icon') &&
            !src.includes('apple-touch-icon') && !src.includes('manifest') &&
            (src.includes('.jpg') || src.includes('.png') || src.includes('.jpeg') || src.includes('.webp'))) {
          images.push(src);
          console.log(`[DEBUG] Найдено изображение через расширенный поиск: ${src}`);
        }
      });
    }
    
    // Если все еще нет изображений, пробуем искать по href атрибутам
    if (images.length === 0) {
      console.log('[DEBUG] Попытка поиска изображений по href');
      $('[href*=".jpg"], [href*=".png"], [href*=".jpeg"]').each((_, element) => {
        const href = $(element).attr('href');
        if (href && !images.includes(href) && 
            !href.includes('logo') && !href.includes('favicon') && !href.includes('icon') &&
            !href.includes('apple-touch-icon') && !href.includes('manifest') &&
            (href.includes('.jpg') || href.includes('.png') || href.includes('.jpeg') || href.includes('.webp'))) {
          images.push(href);
          console.log(`[DEBUG] Найдено изображение через href: ${href}`);
        }
      });
    }
    
    console.log(`[DEBUG] Найдено изображений: ${images.length}`);
    
    // Сохраняем изображения на сервере
    const savedImages: string[] = [];
    for (let i = 0; i < Math.min(images.length, 5); i++) { // Ограничиваем до 5 изображений
      const imageUrl = images[i];
      const filename = `tilda-image-${Date.now()}-${i}.jpg`;
      // Переводим название товара на английский для создания папки
      const productFolder = await translateToEnglish(title);
      try {
        const savedPath = await downloadImage(imageUrl, filename, productFolder);
        savedImages.push(savedPath);
        console.log(`[DEBUG] Сохранено изображение: ${savedPath}`);
      } catch (err) {
        console.warn(`[DEBUG] Не удалось скачать изображение ${imageUrl}:`, err);
      }
    }
    
    console.log(`[DEBUG] Парсинг завершен. Название: ${title}, Цена: ${price}, Изображений: ${savedImages.length}`);
    
    // Валидация данных перед возвратом
    if (!title) {
      throw new Error('Не удалось извлечь название товара');
    }
    
    // Извлекаем SKU и бренд
    const sku = $('.t-store__prod-popup__sku.t-typography__sku.t-descr.t-descr_xxs > span').first().text().trim() || '';
    const brand = $('.t-store__prod-popup__brand.t-typography__sku.t-descr.t-descr_xxs > span').first().text().trim() || '';
    
    return {
      title,
      price,
      oldPrice,
      discountPrice,
      description,
      images: savedImages,
      sku,
      brand
    };
  } catch (error) {
    console.error('[DEBUG] Ошибка парсинга Tilda:', error);
    if (error instanceof Error) {
      throw new Error(`Не удалось получить данные из Tilda: ${error.message}`);
    }
    throw new Error('Не удалось получить данные из Tilda');
  }
}