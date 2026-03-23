'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import Input from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CategoryMultiSelect } from '../components/CategoryMultiSelect';
import { ImageDropzone } from '../components/ImageDropzone';
import { ProductGalleryEditor } from '../components/ProductGalleryEditor';
import { getCategoriesWithCounts } from '@/app/admin/catalog/actions';
import { slugify } from '@/lib/slugify';
import { usePreventLeaveWhenDirty } from '@/hooks/use-prevent-leave-when-dirty';
import { useAdminBasePath } from '@/app/admin/context/admin-base-path';

interface Product {
  id: string;
  tildaUid: string;
  slug: string | null;
  brand: string | null;
  sku: string | null;
  mark: string | null;
  category: string | null;
  title: string;
  description: string | null;
  text: string | null;
  photo: string | null;
  price: number;
  quantity: number | null;
  priceOld: number | null;
  discountPrice: number | null;
  editions: string | null;
  modifications: string | null;
  externalId: string | null;
  parentUid: string | null;
  characteristicsNutrition100g: string | null;
  characteristicsKkal: string | null;
  characteristicsContraindications: string | null;
  characteristicsShelfLife: string | null;
  characteristicsShelfLife2: string | null;
  characteristicsNutrition100gProduct: string | null;
  characteristicsEnergyValue100g: string | null;
  characteristicsNutrition100g2: string | null;
  characteristicsNutritionPerPortion5g: string | null;
  characteristicsComposition: string | null;
  characteristicsKkal100gDailyDose: string | null;
  characteristicsFormulation: string | null;
  characteristicsCalorie: string | null;
  characteristicsFlacon200ml: string | null;
  characteristicsStorage: string | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  seoTitle: string | null;
  seoDescr: string | null;
  seoKeywords: string | null;
  fbTitle: string | null;
  fbDescr: string | null;
  tab1: string | null;
  tab2: string | null;
  tab3: string | null;
  tab4: string | null;
  tab1Title: string | null;
  tab2Title: string | null;
  tab3Title: string | null;
  tab4Title: string | null;
  isDraft: boolean;
  isPromoEligible: boolean;
  isPreorderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  categoryIds?: string[];
  photos?: string[] | null;
}

export default function NewProductPage() {
  const router = useRouter();
  const base = useAdminBasePath();
  const [product, setProduct] = useState<Omit<Product, 'id' | 'tildaUid' | 'createdAt' | 'updatedAt'>>({
    slug: null,
    brand: null,
    sku: null,
    mark: null,
    category: null,
    title: '',
    description: null,
    text: null,
    photo: null,
    price: 0,
    quantity: null,
    priceOld: null,
    discountPrice: null,
    editions: null,
    modifications: null,
    externalId: null,
    parentUid: null,
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
    tab1Title: null,
    tab2Title: null,
    tab3Title: null,
    tab4Title: null,
    isDraft: false,
    isPromoEligible: true,
    isPreorderEnabled: false,
    categoryIds: [],
    photos: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ id: string; title: string; slug: string }[]>([]);

  const isDirty = useMemo(() => {
    const p = product;
    const hasString = (v: string | null | undefined) => v != null && String(v).trim() !== '';
    const hasNumber = (v: number | null | undefined) => v != null && Number(v) !== 0;
    return (
      hasString(p.title) ||
      hasString(p.slug) ||
      hasString(p.description) ||
      hasString(p.text) ||
      hasString(p.photo) ||
      hasNumber(p.price) ||
      (p.categoryIds?.length ?? 0) > 0 ||
      p.isPromoEligible ||
      p.isPreorderEnabled ||
      hasString(p.brand) ||
      hasString(p.sku) ||
      hasString(p.mark) ||
      hasString(p.seoTitle) ||
      hasString(p.seoDescr) ||
      hasString(p.fbTitle) ||
      hasString(p.fbDescr) ||
      hasString(p.tab1) ||
      hasString(p.tab2) ||
      hasString(p.tab3) ||
      hasString(p.tab4) ||
      hasString(p.tab1Title) ||
      hasString(p.tab2Title) ||
      hasString(p.tab3Title) ||
      hasString(p.tab4Title) ||
      hasString(p.characteristicsComposition) ||
      hasString(p.characteristicsStorage) ||
      hasString(p.characteristicsShelfLife) ||
      hasNumber(p.weight)
    );
  }, [product]);

  usePreventLeaveWhenDirty(isDirty);

  useEffect(() => {
    getCategoriesWithCounts().then((data) => setCategories(data));
  }, []);

  const handleChange = (field: keyof Product, value: Product[keyof Product]) => {
    setProduct({
      ...product,
      [field]: value
    });
  };

  const handleCategoryChange = (categoryIds: string[]) => {
    setSelectedCategoryIds(categoryIds);
    setProduct({
      ...product,
      categoryIds
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Подготовка данных для отправки
      const productData = {
        ...product,
        // Убираем category, так как теперь используем categoryIds
        category: null,
        categoryIds: selectedCategoryIds
      };

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      await response.json();
      alert('Продукт успешно создан!');
      router.push(`/${base}/catalog`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Create product error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/${base}/catalog`);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Создание нового товара</h1>
        <button
          onClick={handleCancel}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
        >
          Отмена
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
            <Input
              value={product.title}
              onChange={(e) => {
                const title = e.target.value;
                handleChange('title', title);
                if (!product.slug || product.slug === slugify(product.title)) {
                  handleChange('slug', slugify(title) || null);
                }
              }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
            <Input
              value={product.slug || ''}
              onChange={(e) => handleChange('slug', e.target.value || null)}
              placeholder="Авто из названия"
            />
            <p className="mt-1 text-xs text-gray-500">ЧПУ для страницы товара. Оставьте пустым для автогенерации.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Цена *</label>
            <Input
              type="number"
              value={product.price}
              onChange={(e) => handleChange('price', parseFloat(e.target.value))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Количество</label>
            <Input
              type="number"
              value={product.quantity || ''}
              onChange={(e) => handleChange('quantity', e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>

          <div className="md:col-span-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Габариты и вес (для доставки СДЭК)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Вес (г)</label>
                <Input
                  type="number"
                  min={0}
                  value={product.weight ?? ''}
                  onChange={(e) => handleChange('weight', e.target.value ? parseInt(e.target.value, 10) : null)}
                  placeholder="—"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Длина (мм)</label>
                <Input
                  type="number"
                  min={0}
                  value={product.length ?? ''}
                  onChange={(e) => handleChange('length', e.target.value ? parseInt(e.target.value, 10) : null)}
                  placeholder="—"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ширина (мм)</label>
                <Input
                  type="number"
                  min={0}
                  value={product.width ?? ''}
                  onChange={(e) => handleChange('width', e.target.value ? parseInt(e.target.value, 10) : null)}
                  placeholder="—"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Высота (мм)</label>
                <Input
                  type="number"
                  min={0}
                  value={product.height ?? ''}
                  onChange={(e) => handleChange('height', e.target.value ? parseInt(e.target.value, 10) : null)}
                  placeholder="—"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <Input
              value={product.sku || ''}
              onChange={(e) => handleChange('sku', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Бренд</label>
            <Input
              value={product.brand || ''}
              onChange={(e) => handleChange('brand', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Марка</label>
            <Input
              value={product.mark || ''}
              onChange={(e) => handleChange('mark', e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Категории</label>
            <CategoryMultiSelect 
              selectedCategoryIds={selectedCategoryIds} 
              onCategoryChange={handleCategoryChange} 
              categories={categories}
            />
            <p className="mt-1 text-sm text-gray-500">Выберите одну или несколько категорий для товара</p>
          </div>

          <div className="md:col-span-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700 space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">SEO</p>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">SEO заголовок</label>
              <Input
                value={product.seoTitle || ''}
                onChange={(e) => handleChange('seoTitle', e.target.value || null)}
                placeholder="title для поисковиков"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">SEO описание</label>
              <Textarea
                value={product.seoDescr || ''}
                onChange={(e) => handleChange('seoDescr', e.target.value || null)}
                rows={2}
                placeholder="meta description"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">SEO ключевые слова</label>
              <Input
                value={product.seoKeywords || ''}
                onChange={(e) => handleChange('seoKeywords', e.target.value || null)}
                placeholder="keywords через запятую"
              />
            </div>
          </div>

          <div className="md:col-span-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 mb-2">Галерея (первое фото — основное)</label>
            <ProductGalleryEditor
              photos={product.photos ?? []}
              onChange={(photos) => handleChange('photos', photos)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Фото (основное, если не задано в галерее)</label>
            <ImageDropzone
              value={product.photo}
              onChange={(url) => handleChange('photo', url)}
              disabled={loading}
            />
            <p className="mt-2 text-xs text-gray-500">
              Или укажите URL:{' '}
              <input
                type="text"
                value={product.photo || ''}
                onChange={(e) => handleChange('photo', e.target.value || null)}
                placeholder="/uploads/... или https://..."
                className="inline-block w-full max-w-md mt-1 form-input text-sm"
              />
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
          <Textarea
            value={product.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Текст</label>
          <Textarea
            value={product.text || ''}
            onChange={(e) => handleChange('text', e.target.value)}
            rows={6}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Табы товара</p>
            <p className="text-xs text-gray-500">
              Заголовок и содержимое каждого таба. Пустые табы на карточке не отображаются.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Таб 1 — заголовок</label>
            <Input
              value={product.tab1Title || ''}
              onChange={(e) => handleChange('tab1Title', e.target.value || null)}
              placeholder="Например: Описание"
            />
            <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">Таб 1 — текст</label>
            <Textarea
              value={product.tab1 || ''}
              onChange={(e) => handleChange('tab1', e.target.value || null)}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Таб 2 — заголовок</label>
            <Input
              value={product.tab2Title || ''}
              onChange={(e) => handleChange('tab2Title', e.target.value || null)}
              placeholder="Например: Применение"
            />
            <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">Таб 2 — текст</label>
            <Textarea
              value={product.tab2 || ''}
              onChange={(e) => handleChange('tab2', e.target.value || null)}
              rows={3}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Таб 3 — заголовок</label>
            <Input
              value={product.tab3Title || ''}
              onChange={(e) => handleChange('tab3Title', e.target.value || null)}
            />
            <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">Таб 3 — текст</label>
            <Textarea
              value={product.tab3 || ''}
              onChange={(e) => handleChange('tab3', e.target.value || null)}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Таб 4 — заголовок</label>
            <Input
              value={product.tab4Title || ''}
              onChange={(e) => handleChange('tab4Title', e.target.value || null)}
            />
            <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">Таб 4 — текст</label>
            <Textarea
              value={product.tab4 || ''}
              onChange={(e) => handleChange('tab4', e.target.value || null)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
              checked={product.isPreorderEnabled}
              onChange={(e) => handleChange('isPreorderEnabled', e.target.checked)}
            />
            <span className="text-sm text-gray-700">Разрешить предзаказ при отсутствии товара</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500"
              checked={product.isDraft}
              onChange={(e) => handleChange('isDraft', e.target.checked)}
            />
            <span className="text-sm text-gray-700">Сохранить как черновик (не показывать на сайте)</span>
          </label>
        </div>

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Отмена
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Создание...' : 'Создать'}
          </Button>
        </div>
      </form>
    </div>
  );
}
