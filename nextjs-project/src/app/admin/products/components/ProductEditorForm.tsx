'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import { CategoryMultiSelect } from './CategoryMultiSelect';
import { getCategoriesWithCounts } from '@/app/admin/catalog/actions';
import { sanitizeProductText } from '@/lib/sanitize-text';
import { usePreventLeaveWhenDirty } from '@/hooks/use-prevent-leave-when-dirty';
import { ProductGalleryEditor } from './ProductGalleryEditor';
import type { ProductGalleryEditorPhoto } from './ProductGalleryEditor';
import { ProductCharacteristicsEditor } from './ProductCharacteristicsEditor';
import { ProductRichTextEditor } from './ProductRichTextEditor';

type AdminBrand = 'inner' | 'sprint-power';

export interface ProductEditorFormValues {
  brand: AdminBrand;
  parentUid: string;
  title: string;
  slug: string;
  sku: string;
  price: number;
  quantity: number | null;
  description: string;
  text: string;
  tab1: string;
  tab2: string;
  tab3: string;
  tab4: string;
  tab1Title: string;
  tab2Title: string;
  tab3Title: string;
  tab4Title: string;
  photo: string;
  priceOld: number | null;
  discountPrice: number | null;
  isPromoEligible: boolean;
  isPreorderEnabled: boolean;
  isFeaturedInNewArrivals: boolean;
  isDraft: boolean;
  categories: string[];
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  seoTitle: string;
  seoDescr: string;
  seoKeywords: string;
  photos: ProductGalleryEditorPhoto[];
}

export interface ProductEditorSubmitPayload {
  brand: AdminBrand;
  parentUid: string | null;
  title: string;
  slug: string | null;
  sku: string | null;
  price: number;
  quantity: number | null;
  description: string | null;
  text: string | null;
  tab1: string | null;
  tab2: string | null;
  tab3: string | null;
  tab4: string | null;
  tab1Title: string | null;
  tab2Title: string | null;
  tab3Title: string | null;
  tab4Title: string | null;
  photo: string | null;
  photos: Array<{
    url: string;
    blurDataURL?: string;
    transform?: ProductGalleryEditorPhoto['transform'];
  }> | null;
  priceOld: number | null;
  discountPrice: number | null;
  isPromoEligible: boolean;
  isPreorderEnabled: boolean;
  isFeaturedInNewArrivals: boolean;
  isDraft: boolean;
  categoryIds: string[];
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  seoTitle: string | null;
  seoDescr: string | null;
  seoKeywords: string | null;
}

interface ProductEditorFormProps {
  activeBrand: AdminBrand | null;
  initialValues: ProductEditorFormValues;
  title: string;
  submitLabel: string;
  submitPendingLabel: string;
  catalogHref: string;
  loading?: boolean;
  error?: string | null;
  onSubmit: (payload: ProductEditorSubmitPayload) => Promise<void>;
}

const textFieldsToSanitize = ['tab1Title', 'tab2Title', 'tab3Title', 'tab4Title'];

export function createEmptyProductEditorValues(
  activeBrand: AdminBrand | null
): ProductEditorFormValues {
  return {
    brand: activeBrand === 'sprint-power' ? 'sprint-power' : 'inner',
    parentUid: '',
    title: '',
    slug: '',
    sku: '',
    price: 0,
    quantity: null,
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
    priceOld: null,
    discountPrice: null,
    isPromoEligible: true,
    isPreorderEnabled: false,
    isFeaturedInNewArrivals: false,
    isDraft: false,
    categories: [],
    weight: null,
    length: null,
    width: null,
    height: null,
    seoTitle: '',
    seoDescr: '',
    seoKeywords: '',
    photos: [],
  };
}

export function ProductEditorForm({
  activeBrand,
  initialValues,
  title,
  submitLabel,
  submitPendingLabel,
  catalogHref,
  loading = false,
  error = null,
  onSubmit,
}: ProductEditorFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<ProductEditorFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<
    { id: string; title: string; slug: string }[]
  >([]);

  const featuredBlockLabel =
    activeBrand === 'sprint-power'
      ? 'Показывать в блоке "Хиты продаж"'
      : 'Показывать в блоке "Новинки ассортимента"';

  useEffect(() => {
    setFormData(initialValues);
  }, [initialValues]);

  useEffect(() => {
    let cancelled = false;

    getCategoriesWithCounts({ brandId: activeBrand }).then((categories) => {
      if (cancelled) return;
      setAvailableCategories(categories);
    });

    return () => {
      cancelled = true;
    };
  }, [activeBrand]);

  const isDirty = useMemo(() => {
    const p = formData;
    const hasString = (value: string | null | undefined) => value != null && String(value).trim() !== '';
    const hasNumber = (value: number | null | undefined) => value != null && Number(value) !== 0;

    return (
      hasString(p.title) ||
      hasString(p.slug) ||
      hasString(p.parentUid) ||
      hasString(p.description) ||
      hasString(p.text) ||
      hasString(p.photo) ||
      hasNumber(p.price) ||
      p.categories.length > 0 ||
      p.isPromoEligible ||
      p.isPreorderEnabled ||
      hasString(p.brand) ||
      hasString(p.sku) ||
      hasString(p.seoTitle) ||
      hasString(p.seoDescr) ||
      hasString(p.tab1) ||
      hasString(p.tab2) ||
      hasString(p.tab3) ||
      hasString(p.tab4) ||
      hasString(p.tab1Title) ||
      hasString(p.tab2Title) ||
      hasString(p.tab3Title) ||
      hasString(p.tab4Title) ||
      hasNumber(p.weight)
    );
  }, [formData]);

  usePreventLeaveWhenDirty(isDirty && !submitting);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    const sanitized =
      textFieldsToSanitize.includes(name) && typeof value === 'string'
        ? sanitizeProductText(value)
        : value;

    setFormData((prev) => ({
      ...prev,
      [name]: sanitized,
    }));
  };

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value ? Number(value) : null,
    }));
  };

  const buildSubmitPayload = (): ProductEditorSubmitPayload => {
    const normalizedPhotos = formData.photos
      .map((entry) => ({
        url: entry.url.trim(),
        blurDataURL: entry.blurDataURL,
        transform: entry.transform,
      }))
      .filter((entry) => Boolean(entry.url));

    return {
      brand: formData.brand,
      parentUid: formData.parentUid.trim() ? formData.parentUid.trim() : null,
      title: formData.title,
      slug: formData.slug || null,
      sku: formData.sku || null,
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
      photo: normalizedPhotos[0]?.url ?? (formData.photo.trim() || null),
      photos: normalizedPhotos.length > 0 ? normalizedPhotos : null,
      priceOld: formData.priceOld,
      discountPrice: formData.discountPrice,
      isPromoEligible: formData.isPromoEligible,
      isPreorderEnabled: formData.isPreorderEnabled,
      isFeaturedInNewArrivals: formData.isFeaturedInNewArrivals,
      isDraft: formData.isDraft,
      categoryIds: formData.categories,
      weight: formData.weight ?? null,
      length: formData.length ?? null,
      width: formData.width ?? null,
      height: formData.height ?? null,
      seoTitle: formData.seoTitle || null,
      seoDescr: formData.seoDescr || null,
      seoKeywords: formData.seoKeywords || null,
    };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(buildSubmitPayload());
    } catch (submitErr) {
      setSubmitError(submitErr instanceof Error ? submitErr.message : 'Произошла ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8">Загрузка товара...</div>;
  }

  const currentError = error ?? submitError;
  if (currentError) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          <p className="font-medium">Ошибка</p>
          <p className="mt-1 text-sm">{currentError}</p>
          <Button className="mt-3" variant="secondary" onClick={() => router.push(catalogHref)}>
            Вернуться в каталог
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-text">{title}</h1>
          <Button onClick={() => router.push(catalogHref)}>Назад к каталогу</Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Бренд</label>
              <select
                name="brand"
                value={formData.brand}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    brand: event.target.value === 'sprint-power' ? 'sprint-power' : 'inner',
                  }))
                }
                className="form-input w-full"
              >
                <option value="inner">Inner Health</option>
                <option value="sprint-power">Sprint Power</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Группа вкусов (parentUid)
              </label>
              <input
                type="text"
                name="parentUid"
                value={formData.parentUid}
                onChange={handleChange}
                className="form-input w-full"
                placeholder="Одинаковый parentUid = одна карточка в каталоге"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Название</label>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Slug (URL)</label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="form-input w-full"
              placeholder="product-url"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">SKU</label>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className="form-input w-full"
              placeholder="Например: collagen-250g"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 flex h-9 items-center justify-between gap-2">
                <label className="block text-sm font-medium text-gray-700">Цена</label>
                <div className="invisible inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900">
                  <span className="rounded-md px-3 py-1 text-xs">Ограничен</span>
                  <span className="rounded-md px-3 py-1 text-xs">Бесконечно</span>
                </div>
              </div>
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
              <div className="mb-1 flex h-9 items-center justify-between gap-2">
                <label className="block text-sm font-medium text-gray-700">Запас</label>
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        quantity: prev.quantity === null ? 0 : prev.quantity,
                      }))
                    }
                    className={`rounded-md px-3 py-1 text-xs transition-colors ${
                      formData.quantity !== null
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    Ограничен
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, quantity: null }))}
                    className={`rounded-md px-3 py-1 text-xs transition-colors ${
                      formData.quantity === null
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    Бесконечно
                  </button>
                </div>
              </div>
              <input
                type="number"
                name="quantity"
                value={formData.quantity ?? ''}
                onChange={handleNumberChange}
                className="form-input w-full"
                min="0"
                disabled={formData.quantity === null}
                placeholder={formData.quantity === null ? 'Бесконечно' : undefined}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Старая цена (если есть)
            </label>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Цена по промокоду (если задана — подставляется при скидке)
            </label>
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

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPromoEligible"
                checked={formData.isPromoEligible}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, isPromoEligible: event.target.checked }))
                }
                className="form-input h-4 w-4 rounded"
              />
              <label htmlFor="isPromoEligible" className="text-sm font-medium text-gray-700">
                Участвует в скидке по промокоду
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPreorderEnabled"
                checked={formData.isPreorderEnabled}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, isPreorderEnabled: event.target.checked }))
                }
                className="form-input h-4 w-4 rounded"
              />
              <label htmlFor="isPreorderEnabled" className="text-sm font-medium text-gray-700">
                Разрешить предзаказ при отсутствии товара
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFeaturedInNewArrivals"
                checked={formData.isFeaturedInNewArrivals}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    isFeaturedInNewArrivals: event.target.checked,
                  }))
                }
                className="form-input h-4 w-4 rounded"
              />
              <label htmlFor="isFeaturedInNewArrivals" className="text-sm font-medium text-gray-700">
                {featuredBlockLabel}
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDraft"
                checked={Boolean(formData.isDraft)}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, isDraft: event.target.checked }))
                }
                className="form-input h-4 w-4 rounded"
              />
              <label htmlFor="isDraft" className="text-sm font-medium text-gray-700">
                Черновик (скрыть товар с сайта)
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Габариты и вес (для доставки СДЭК)
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Вес (г)</label>
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
                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                  Длина (мм)
                </label>
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
                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                  Ширина (мм)
                </label>
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
                <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                  Высота (мм)
                </label>
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Категории</label>
            <CategoryMultiSelect
              selectedCategoryIds={formData.categories}
              onCategoryChange={(categories) =>
                setFormData((prev) => ({
                  ...prev,
                  categories,
                }))
              }
              categories={availableCategories}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Описание (краткое)
            </label>
            <ProductRichTextEditor
              value={formData.description}
              onChange={(html) => setFormData((prev) => ({ ...prev, description: html }))}
              placeholder="Краткое описание для карточки"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Основной текст (под фото)
            </label>
            <ProductRichTextEditor
              value={formData.text}
              onChange={(html) => setFormData((prev) => ({ ...prev, text: html }))}
              placeholder="Текст под блоком с ценой и кнопкой"
            />
          </div>

          <div className="space-y-6 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Табы на карточке товара: укажите название и содержимое каждого таба (пустой таб не
              показывается).
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
              <ProductCharacteristicsEditor
                value={formData.tab4}
                onChange={(html) => setFormData((prev) => ({ ...prev, tab4: html }))}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">SEO</p>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                SEO заголовок
              </label>
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
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                SEO описание
              </label>
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
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                SEO ключевые слова
              </label>
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
            <Button type="submit" disabled={submitting}>
              {submitting ? submitPendingLabel : submitLabel}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push(catalogHref)}>
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
