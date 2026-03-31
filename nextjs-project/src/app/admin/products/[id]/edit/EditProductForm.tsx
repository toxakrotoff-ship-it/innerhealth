'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductEditorForm, createEmptyProductEditorValues, type ProductEditorFormValues, type ProductEditorSubmitPayload } from '../../components/ProductEditorForm';
import type { ProductGalleryEditorPhoto } from '../../components/ProductGalleryEditor';
import { useAdminBasePath } from '@/app/admin/context/admin-base-path';

interface ProductResponse {
  id: string;
  brand: string | null;
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
  photos?: unknown;
  priceOld: number | null;
  discountPrice: number | null;
  isPromoEligible?: boolean;
  isPreorderEnabled?: boolean;
  isFeaturedInNewArrivals?: boolean;
  isDraft?: boolean;
  categories?: Array<{ categoryId: string }>;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  seoTitle: string | null;
  seoDescr: string | null;
  seoKeywords: string | null;
}

interface EditProductFormProps {
  productId: string;
}

function normalizePhotos(input: unknown, fallbackPhoto: string | null): ProductGalleryEditorPhoto[] {
  if (!Array.isArray(input)) return fallbackPhoto ? [{ url: fallbackPhoto }] : [];
  return input
    .map((photo: unknown) => {
      if (typeof photo === 'string') return { url: photo } as ProductGalleryEditorPhoto;
      if (!photo || typeof photo !== 'object') return null;
      const record = photo as Record<string, unknown>;
      if (typeof record.url !== 'string') return null;
      return {
        url: record.url,
        blurDataURL: typeof record.blurDataURL === 'string' ? record.blurDataURL : undefined,
        transform:
          record.transform && typeof record.transform === 'object'
            ? (record.transform as ProductGalleryEditorPhoto['transform'])
            : undefined,
      } as ProductGalleryEditorPhoto;
    })
    .filter(Boolean) as ProductGalleryEditorPhoto[];
}

function mapProductToFormValues(
  product: ProductResponse,
  activeBrand: 'inner' | 'sprint-power' | null
): ProductEditorFormValues {
  const initial = createEmptyProductEditorValues(activeBrand);

  return {
    ...initial,
    brand: product.brand === 'sprint-power' ? 'sprint-power' : 'inner',
    parentUid: typeof product.parentUid === 'string' ? product.parentUid : '',
    title: product.title,
    slug: product.slug || '',
    sku: product.sku || '',
    price: product.price,
    quantity: product.quantity ?? null,
    description: product.description || '',
    text: product.text || '',
    tab1: product.tab1 || '',
    tab2: product.tab2 || '',
    tab3: product.tab3 || '',
    tab4: product.tab4 || '',
    tab1Title: product.tab1Title || '',
    tab2Title: product.tab2Title || '',
    tab3Title: product.tab3Title || '',
    tab4Title: product.tab4Title || '',
    photo: product.photo || '',
    priceOld: product.priceOld || null,
    discountPrice: product.discountPrice || null,
    isPromoEligible: product.isPromoEligible ?? true,
    isPreorderEnabled: product.isPreorderEnabled ?? false,
    isFeaturedInNewArrivals: product.isFeaturedInNewArrivals ?? false,
    isDraft: product.isDraft ?? false,
    categories: product.categories?.map((category) => category.categoryId) || [],
    weight: product.weight ?? null,
    length: product.length ?? null,
    width: product.width ?? null,
    height: product.height ?? null,
    seoTitle: product.seoTitle ?? '',
    seoDescr: product.seoDescr ?? '',
    seoKeywords: product.seoKeywords ?? '',
    photos: normalizePhotos(product.photos, product.photo),
  };
}

export function EditProductForm({ productId }: EditProductFormProps) {
  const searchParams = useSearchParams();
  const base = useAdminBasePath();
  const activeBrand: 'inner' | 'sprint-power' | null = base.includes('sprint-power')
    ? 'sprint-power'
    : base.includes('inner')
      ? 'inner'
      : null;
  const selectedCategoryId = searchParams.get('categoryId');
  const catalogHref = selectedCategoryId
    ? `/${base}/catalog?categoryId=${encodeURIComponent(selectedCategoryId)}`
    : `/${base}/catalog`;

  const [formValues, setFormValues] = useState<ProductEditorFormValues>(() =>
    createEmptyProductEditorValues(activeBrand)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormValues(createEmptyProductEditorValues(activeBrand));
  }, [activeBrand]);

  useEffect(() => {
    if (!productId) {
      setError('Неверный или отсутствующий ID товара');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/products?id=${encodeURIComponent(productId)}`, {
          credentials: 'include',
        });
        const data = (await response.json().catch(() => ({}))) as ProductResponse & { error?: string };

        if (!response.ok) {
          const message =
            (typeof data.error === 'string' && data.error) ||
            (response.status === 401 && 'Необходима авторизация') ||
            (response.status === 404 && 'Товар не найден') ||
            `Ошибка загрузки (${response.status})`;
          throw new Error(message);
        }

        if (cancelled) return;
        setFormValues(mapProductToFormValues(data, activeBrand));
      } catch (fetchError) {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Произошла ошибка');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [productId, activeBrand]);

  const initialValues = useMemo(() => formValues, [formValues]);

  const handleSubmit = async (payload: ProductEditorSubmitPayload) => {
    const response = await fetch('/api/admin/products', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        id: productId,
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string; detail?: string };
      const message = errorData.error || 'Не удалось сохранить товар';
      throw new Error(errorData.detail ? `${message}. ${errorData.detail}` : message);
    }

    window.location.assign(catalogHref);
  };

  return (
    <ProductEditorForm
      activeBrand={activeBrand}
      initialValues={initialValues}
      title="Редактирование товара"
      submitLabel="Сохранить изменения"
      submitPendingLabel="Сохранение..."
      catalogHref={catalogHref}
      loading={loading}
      error={error}
      onSubmit={handleSubmit}
    />
  );
}
