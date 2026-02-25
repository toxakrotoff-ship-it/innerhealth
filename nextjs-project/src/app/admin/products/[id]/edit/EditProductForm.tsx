'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import { CategoryMultiSelect } from '../../components/CategoryMultiSelect';
import { Category, getCategories } from '@/app/admin/catalog/actions';
import { sanitizeProductText } from '@/lib/sanitize-text';
import { useAdminBasePath } from '@/app/admin/context/admin-base-path';
import { ProductGalleryEditor } from '../../components/ProductGalleryEditor';
import { ProductRichTextEditor } from '../../components/ProductRichTextEditor';

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
  createdAt: string;
  updatedAt: string;
  categories: { categoryId: string }[];
}

interface EditProductFormProps {
  productId: string;
}

export function EditProductForm({ productId }: EditProductFormProps) {
  const router = useRouter();
  const base = useAdminBasePath();
  const id = productId;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    price: 0,
    quantity: 0,
    description: '',
    text: '',
    tab1: '',
    tab2: '',
    tab3: '',
    tab4: '',
    tab1Title: '',
    tab2Title: '',
    tab3Title: '',
    tab4Title: '',
    photo: '',
    priceOld: null as number | null,
    discountPrice: null as number | null,
    isPromoEligible: false,
    categories: [] as string[],
    weight: null as number | null,
    length: null as number | null,
    width: null as number | null,
    height: null as number | null,
    seoTitle: '',
    seoDescr: '',
    seoKeywords: '',
    photos: [] as string[],
  });
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!id) {
      setError('Неверный или отсутствующий ID товара');
      setLoading(false);
      return;
    }
    fetchProduct(id);
    fetchCategories();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const categories = await getCategories();
      setAvailableCategories(categories);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchProduct = async (productIdParam: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/products?id=${encodeURIComponent(productIdParam)}`, {
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          (data && typeof data.error === 'string' && data.error) ||
          (response.status === 401 && 'Необходима авторизация') ||
          (response.status === 404 && 'Товар не найден') ||
          `Ошибка загрузки (${response.status})`;
        throw new Error(message);
      }
      setProduct(data);
      setFormData({
        title: data.title,
        slug: data.slug || '',
        price: data.price,
        quantity: data.quantity || 0,
        description: data.description || '',
        text: data.text || '',
        tab1: data.tab1 || '',
        tab2: data.tab2 || '',
        tab3: data.tab3 || '',
        tab4: data.tab4 || '',
        tab1Title: data.tab1Title || '',
        tab2Title: data.tab2Title || '',
        tab3Title: data.tab3Title || '',
        tab4Title: data.tab4Title || '',
        photo: data.photo || '',
        priceOld: data.priceOld || null,
        discountPrice: data.discountPrice || null,
        isPromoEligible: data.isPromoEligible || false,
        categories: data.categories?.map((cat: { categoryId: string }) => cat.categoryId) || [],
        weight: data.weight ?? null,
        length: data.length ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        seoTitle: data.seoTitle ?? '',
        seoDescr: data.seoDescr ?? '',
        seoKeywords: data.seoKeywords ?? '',
        photos: (() => {
          if (!Array.isArray(data.photos)) return data.photo ? [data.photo] : [];
          return data.photos.map((p: unknown) =>
            typeof p === 'string' ? p : (p && typeof p === 'object' && 'url' in p && typeof (p as { url: string }).url === 'string' ? (p as { url: string }).url : '')
          ).filter(Boolean) as string[];
        })(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const textFieldsToSanitize = [
    'tab1Title', 'tab2Title', 'tab3Title', 'tab4Title',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const sanitized =
      textFieldsToSanitize.includes(name) && typeof value === 'string'
        ? sanitizeProductText(value)
        : value;
    setFormData(prev => ({
      ...prev,
      [name]: sanitized,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value ? Number(value) : null
    }));
  };

  const handleCategoryChange = (selectedCategories: string[]) => {
    setFormData(prev => ({
      ...prev,
      categories: selectedCategories
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`/api/admin/products`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug || null,
          price: formData.price,
          quantity: formData.quantity,
          description: formData.description || null,
          text: formData.text || null,
          tab1: formData.tab1 || null,
          tab2: formData.tab2 || null,
          tab3: formData.tab3 || null,
          tab4: formData.tab4 || null,
          tab1Title: formData.tab1Title || null,
          tab2Title: formData.tab2Title || null,
          tab3Title: formData.tab3Title || null,
          tab4Title: formData.tab4Title || null,
          priceOld: formData.priceOld,
          discountPrice: formData.discountPrice,
          isPromoEligible: formData.isPromoEligible,
          weight: formData.weight ?? null,
          length: formData.length ?? null,
          width: formData.width ?? null,
          height: formData.height ?? null,
          seoTitle: formData.seoTitle || null,
          seoDescr: formData.seoDescr || null,
          seoKeywords: formData.seoKeywords || null,
          photo: formData.photos.filter(Boolean).length > 0 ? formData.photos[0] : null,
          photos: formData.photos.filter(Boolean).length > 0 ? formData.photos.filter(Boolean) : null,
          id,
          categoryIds: formData.categories,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string; detail?: string };
        const msg = errorData?.error || 'Не удалось сохранить товар';
        const detail = errorData?.detail;
        throw new Error(detail ? `${msg}. ${detail}` : msg);
      }
      
      router.push(`/${base}/catalog`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    }
  };

  if (loading) {
    return <div className="p-8">Загрузка товара...</div>;
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          <p className="font-medium">Ошибка</p>
          <p className="mt-1 text-sm">{error}</p>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => router.push(`/${base}/catalog`)}
          >
            Вернуться в каталог
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-text">Редактирование товара</h1>
          <Button onClick={() => router.push(`/${base}/catalog`)}>
            Назад к каталогу
          </Button>
        </div>

        {product && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="form-input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className="form-input w-full"
                placeholder="product-url"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Цена</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleNumberChange}
                  className="form-input w-full"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Запас</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleNumberChange}
                  className="form-input w-full"
                  min="0"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Старая цена (если есть)</label>
              <input
                type="number"
                name="priceOld"
                value={formData.priceOld || ''}
                onChange={handleNumberChange}
                className="form-input w-full"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цена по промокоду (если задана — подставляется при скидке)</label>
              <input
                type="number"
                name="discountPrice"
                value={formData.discountPrice ?? ''}
                onChange={handleNumberChange}
                className="form-input w-full"
                min="0"
                step="0.01"
                placeholder="—"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPromoEligible"
                checked={formData.isPromoEligible}
                onChange={(e) => setFormData((prev) => ({ ...prev, isPromoEligible: e.target.checked }))}
                className="form-input h-4 w-4 rounded"
              />
              <label htmlFor="isPromoEligible" className="text-sm font-medium text-gray-700">
                Участвует в скидке по промокоду
              </label>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Габариты и вес (для доставки СДЭК)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Вес (г)</label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight ?? ''}
                  onChange={handleNumberChange}
                  className="form-input w-full"
                  min="0"
                  placeholder="—"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Длина (мм)</label>
                <input
                  type="number"
                  name="length"
                  value={formData.length ?? ''}
                  onChange={handleNumberChange}
                  className="form-input w-full"
                  min="0"
                  placeholder="—"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Ширина (мм)</label>
                <input
                  type="number"
                  name="width"
                  value={formData.width ?? ''}
                  onChange={handleNumberChange}
                  className="form-input w-full"
                  min="0"
                  placeholder="—"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Высота (мм)</label>
                <input
                  type="number"
                  name="height"
                  value={formData.height ?? ''}
                  onChange={handleNumberChange}
                  className="form-input w-full"
                  min="0"
                  placeholder="—"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Категории</label>
              <CategoryMultiSelect
                selectedCategoryIds={formData.categories}
                onCategoryChange={handleCategoryChange}
                categories={availableCategories}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание (краткое)</label>
              <ProductRichTextEditor
                value={formData.description}
                onChange={(html) => setFormData((prev) => ({ ...prev, description: html }))}
                placeholder="Краткое описание для карточки"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Основной текст (под фото)</label>
              <ProductRichTextEditor
                value={formData.text}
                onChange={(html) => setFormData((prev) => ({ ...prev, text: html }))}
                placeholder="Текст под блоком с ценой и кнопкой"
              />
            </div>

            <div className="space-y-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Табы на карточке товара: укажите название и содержимое каждого таба (пустой таб не показывается).
              </p>
              <div className="space-y-3">
                <label className="block text-sm text-gray-600 dark:text-gray-400">Таб 1</label>
                <input
                  type="text"
                  name="tab1Title"
                  value={formData.tab1Title}
                  onChange={handleChange}
                  className="form-input w-full max-w-md"
                  placeholder="Например: Преимущества"
                />
                <ProductRichTextEditor
                  value={formData.tab1}
                  onChange={(html) => setFormData((prev) => ({ ...prev, tab1: html }))}
                  placeholder="Содержимое таба (списки, жирный текст, фото)"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-sm text-gray-600 dark:text-gray-400">Таб 2</label>
                <input
                  type="text"
                  name="tab2Title"
                  value={formData.tab2Title}
                  onChange={handleChange}
                  className="form-input w-full max-w-md"
                  placeholder="Например: Состав"
                />
                <ProductRichTextEditor
                  value={formData.tab2}
                  onChange={(html) => setFormData((prev) => ({ ...prev, tab2: html }))}
                  placeholder="Содержимое таба"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-sm text-gray-600 dark:text-gray-400">Таб 3</label>
                <input
                  type="text"
                  name="tab3Title"
                  value={formData.tab3Title}
                  onChange={handleChange}
                  className="form-input w-full max-w-md"
                  placeholder="Например: Способ применения и дозировка"
                />
                <ProductRichTextEditor
                  value={formData.tab3}
                  onChange={(html) => setFormData((prev) => ({ ...prev, tab3: html }))}
                  placeholder="Содержимое таба"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-sm text-gray-600 dark:text-gray-400">Таб 4</label>
                <input
                  type="text"
                  name="tab4Title"
                  value={formData.tab4Title}
                  onChange={handleChange}
                  className="form-input w-full max-w-md"
                  placeholder="Например: Характеристики"
                />
                <ProductRichTextEditor
                  value={formData.tab4}
                  onChange={(html) => setFormData((prev) => ({ ...prev, tab4: html }))}
                  placeholder="Содержимое таба"
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700 space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">SEO</p>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">SEO заголовок</label>
                <input
                  type="text"
                  name="seoTitle"
                  value={formData.seoTitle}
                  onChange={handleChange}
                  className="form-input w-full"
                  placeholder="title для поисковиков"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">SEO описание</label>
                <textarea
                  name="seoDescr"
                  value={formData.seoDescr}
                  onChange={handleChange}
                  className="form-input w-full"
                  rows={2}
                  placeholder="meta description"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">SEO ключевые слова</label>
                <input
                  type="text"
                  name="seoKeywords"
                  value={formData.seoKeywords}
                  onChange={handleChange}
                  className="form-input w-full"
                  placeholder="keywords через запятую"
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <ProductGalleryEditor
                photos={formData.photos}
                onChange={(photos) => setFormData((prev) => ({ ...prev, photos }))}
              />
            </div>
            
            <div className="flex space-x-3">
              <Button type="submit">
                Сохранить изменения
              </Button>
              <Button variant="secondary" onClick={() => router.push(`/${base}/catalog`)}>
                Отмена
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
