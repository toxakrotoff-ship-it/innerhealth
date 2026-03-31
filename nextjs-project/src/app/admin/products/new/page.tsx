'use client';

import { ProductEditorForm, createEmptyProductEditorValues, type ProductEditorSubmitPayload } from '../components/ProductEditorForm';
import { useAdminBasePath } from '@/app/admin/context/admin-base-path';

export default function NewProductPage() {
  const base = useAdminBasePath();
  const activeBrand: 'inner' | 'sprint-power' | null = base.includes('sprint-power')
    ? 'sprint-power'
    : base.includes('inner')
      ? 'inner'
      : null;
  const catalogHref = `/${base}/catalog`;

  const handleSubmit = async (payload: ProductEditorSubmitPayload) => {
    const response = await fetch('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(errorData.error || 'Не удалось создать товар');
    }

    window.location.assign(catalogHref);
  };

  return (
    <ProductEditorForm
      activeBrand={activeBrand}
      initialValues={createEmptyProductEditorValues(activeBrand)}
      title="Создание нового товара"
      submitLabel="Создать"
      submitPendingLabel="Создание..."
      catalogHref={catalogHref}
      onSubmit={handleSubmit}
    />
  );
}
