'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/button'
import { ProductRichTextEditor } from '@/app/admin/products/components/ProductRichTextEditor'
import { CoverImageDropzone } from '@/app/admin/news/components/CoverImageDropzone'

interface GiftPromotion {
  id: string
  title: string
  status: 'enabled' | 'disabled'
  validFrom: string | null
  validTo: string | null
  giftProductId: string
  triggerType: 'PRODUCT' | 'CART_TOTAL'
  triggerProductId: string | null
  triggerProductMinQty: number | null
  minCartTotal: number | null
  giftQuantityMode: 'ONE_PER_ORDER' | 'PER_TRIGGER'
  maxGiftsPerOrder: number | null
  promoProductInteractionMode: 'BLOCK_IF_PROMO_PRODUCTS_PRESENT' | 'ALWAYS_ALLOW' | null
  promoCodeInteractionMode: 'ALLOW_WITH_PROMOCODE' | 'BLOCK_IF_PROMOCODE_PRESENT' | null
  autoRemoveWhenConditionFails: boolean
  userCanRemoveGiftManually: boolean
  showOnSite: boolean
  siteTitle: string | null
  siteDescription: string | null
  createdAt: string
}

interface FormState {
  title: string
  status: 'enabled' | 'disabled'
  validFrom: string
  validTo: string
  giftProductId: string
  giftProductLabel: string
  triggerType: 'PRODUCT' | 'CART_TOTAL'
  triggerProductId: string
  triggerProductLabel: string
  triggerProductMinQty: string
  minCartTotal: string
  giftQuantityMode: 'ONE_PER_ORDER' | 'PER_TRIGGER'
  maxGiftsPerOrder: string
  promoProductInteractionMode: 'BLOCK_IF_PROMO_PRODUCTS_PRESENT' | 'ALWAYS_ALLOW'
  promoCodeInteractionMode: 'ALLOW_WITH_PROMOCODE' | 'BLOCK_IF_PROMOCODE_PRESENT'
  autoRemoveWhenConditionFails: boolean
  userCanRemoveGiftManually: boolean
  showOnSite: boolean
  siteTitle: string
  siteDescription: string
  coverImage: string
}

const initialForm: FormState = {
  title: '',
  status: 'enabled',
  validFrom: '',
  validTo: '',
  giftProductId: '',
  giftProductLabel: '',
  triggerType: 'PRODUCT',
  triggerProductId: '',
  triggerProductLabel: '',
  triggerProductMinQty: '1',
  minCartTotal: '',
  giftQuantityMode: 'ONE_PER_ORDER',
  maxGiftsPerOrder: '',
  promoProductInteractionMode: 'ALWAYS_ALLOW',
  promoCodeInteractionMode: 'ALLOW_WITH_PROMOCODE',
  autoRemoveWhenConditionFails: true,
  userCanRemoveGiftManually: false,
  showOnSite: true,
  siteTitle: '',
  siteDescription: '',
  coverImage: '',
}

export default function GiftPromotionsPage() {
  const [items, setItems] = useState<GiftPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<GiftPromotion | null>(null)
  const [form, setForm] = useState<FormState>(initialForm)
  const [giftSearchResults, setGiftSearchResults] = useState<
    Array<{ id: string; title: string; sku: string | null; slug: string | null }>
  >([])
  const [triggerSearchResults, setTriggerSearchResults] = useState<
    Array<{ id: string; title: string; sku: string | null; slug: string | null }>
  >([])
  const [productSearchLoading, setProductSearchLoading] = useState(false)

  useEffect(() => {
    void fetchItems()
  }, [])

  async function fetchItems() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/gift-promotions', { cache: 'no-store' })
      if (!res.ok) throw new Error('Не удалось загрузить акции-подарки')
      const data = (await res.json()) as GiftPromotion[]
      setItems(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  async function searchProducts(query: string, target: 'gift' | 'trigger') {
    const trimmed = query.trim()
    if (!trimmed) {
      if (target === 'gift') setGiftSearchResults([])
      else setTriggerSearchResults([])
      return
    }
    try {
      setProductSearchLoading(true)
      const res = await fetch(
        `/api/catalog/suggest?q=${encodeURIComponent(trimmed)}&limit=10`,
        { credentials: 'include' }
      )
      if (!res.ok) {
        if (target === 'gift') setGiftSearchResults([])
        else setTriggerSearchResults([])
        return
      }
      const data = (await res.json()) as Array<{
        id: string
        title: string
        slug: string | null
        sku: string | null
      }>
      if (target === 'gift') setGiftSearchResults(data)
      else setTriggerSearchResults(data)
    } catch {
      if (target === 'gift') setGiftSearchResults([])
      else setTriggerSearchResults([])
    } finally {
      setProductSearchLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm(initialForm)
    setShowForm(true)
  }

  function openEdit(p: GiftPromotion) {
    setEditing(p)
    setForm({
      title: p.title,
      status: p.status,
      validFrom: p.validFrom ? p.validFrom.slice(0, 10) : '',
      validTo: p.validTo ? p.validTo.slice(0, 10) : '',
      giftProductId: p.giftProductId,
      giftProductLabel: '',
      triggerType: p.triggerType,
      triggerProductId: p.triggerProductId ?? '',
      triggerProductLabel: '',
      triggerProductMinQty: p.triggerProductMinQty?.toString() ?? '1',
      minCartTotal: p.minCartTotal?.toString() ?? '',
      giftQuantityMode: p.giftQuantityMode,
      maxGiftsPerOrder: p.maxGiftsPerOrder?.toString() ?? '',
      promoProductInteractionMode: p.promoProductInteractionMode ?? 'ALWAYS_ALLOW',
      promoCodeInteractionMode: p.promoCodeInteractionMode ?? 'ALLOW_WITH_PROMOCODE',
      autoRemoveWhenConditionFails: p.autoRemoveWhenConditionFails,
      userCanRemoveGiftManually: p.userCanRemoveGiftManually,
      showOnSite: p.showOnSite,
      siteTitle: p.siteTitle ?? '',
      siteDescription: p.siteDescription ?? '',
      coverImage: (p as any).coverImage ?? '',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(initialForm)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const payload = {
      ...(editing ? { id: editing.id } : {}),
      title: form.title,
      status: form.status,
      validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
      validTo: form.validTo ? new Date(form.validTo).toISOString() : null,
      giftProductId: form.giftProductId,
      triggerType: form.triggerType,
      triggerProductId: form.triggerType === 'PRODUCT' ? form.triggerProductId || null : null,
      triggerProductMinQty:
        form.triggerType === 'PRODUCT' ? Number.parseInt(form.triggerProductMinQty || '1', 10) : null,
      minCartTotal: form.triggerType === 'CART_TOTAL' ? Number.parseFloat(form.minCartTotal || '0') : null,
      giftQuantityMode: form.giftQuantityMode,
      maxGiftsPerOrder: form.maxGiftsPerOrder ? Number.parseInt(form.maxGiftsPerOrder, 10) : null,
      promoProductInteractionMode: form.promoProductInteractionMode,
      promoCodeInteractionMode: form.promoCodeInteractionMode,
      autoRemoveWhenConditionFails: form.autoRemoveWhenConditionFails,
      userCanRemoveGiftManually: form.userCanRemoveGiftManually,
      showOnSite: form.showOnSite,
      siteTitle: form.siteTitle || null,
      siteDescription: form.siteDescription || null,
      coverImage: form.coverImage || null,
    }

    try {
      const res = await fetch('/api/admin/gift-promotions', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Ошибка сохранения акции-подарка')
      }
      await fetchItems()
      closeForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Удалить эту акцию-подарок?')) return
    try {
      const res = await fetch('/api/admin/gift-promotions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Не удалось удалить акцию')
      setItems((prev) => prev.filter((p) => p.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка удаления')
    }
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-10 bg-gray-200 rounded w-40" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Подарочные акции</h1>
            <p className="text-gray-600 mt-1">
              Настройка правил «товар в подарок» и описаний для раздела «Акции»
            </p>
          </div>
          <Button variant="primary" onClick={openCreate}>
            Создать акцию-подарок
          </Button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <div className="card mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editing ? 'Редактирование акции-подарка' : 'Создание акции-подарка'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Название акции</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
                  <select
                    className="form-input"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as FormState['status'] })
                    }
                  >
                    <option value="enabled">Включена</option>
                    <option value="disabled">Выключена</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Подарочный товар
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="form-input"
                      value={form.giftProductLabel}
                      onChange={(e) => {
                        const value = e.target.value
                        setForm({
                          ...form,
                          giftProductLabel: value,
                        })
                        void searchProducts(value, 'gift')
                      }}
                      placeholder="Введите название товара"
                      required
                    />
                    {/* скрытое поле с ID для отладки/копирования при необходимости */}
                    {form.giftProductId && (
                      <p className="mt-1 text-xs text-gray-400">
                        ID: {form.giftProductId}
                      </p>
                    )}
                    {giftSearchResults.length > 0 && (
                      <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-64 overflow-auto">
                        {productSearchLoading && (
                          <div className="px-3 py-2 text-xs text-gray-500">
                            Поиск...
                          </div>
                        )}
                        {giftSearchResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                              onClick={() => {
                                setForm({
                                  ...form,
                                  giftProductId: p.id,
                                  giftProductLabel: p.title,
                                })
                                setGiftSearchResults([])
                              }}
                          >
                            <span className="font-medium text-gray-900">
                              {p.title}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              ID: {p.id}
                              {p.sku ? ` · SKU: ${p.sku}` : ''}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип условия
                  </label>
                  <select
                    className="form-input"
                    value={form.triggerType}
                    onChange={(e) =>
                      setForm({ ...form, triggerType: e.target.value as FormState['triggerType'] })
                    }
                  >
                    <option value="PRODUCT">Покупка товара</option>
                    <option value="CART_TOTAL">Сумма корзины</option>
                  </select>
                </div>

                {form.triggerType === 'PRODUCT' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Триггер-товар
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          className="form-input"
                          value={form.triggerProductLabel}
                          onChange={(e) => {
                            const value = e.target.value
                            setForm({
                              ...form,
                              triggerProductLabel: value,
                            })
                            void searchProducts(value, 'trigger')
                          }}
                          placeholder="Введите название товара"
                          required
                        />
                        {form.triggerProductId && (
                          <p className="mt-1 text-xs text-gray-400">
                            ID: {form.triggerProductId}
                          </p>
                        )}
                        {triggerSearchResults.length > 0 && (
                          <div className="absolute z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-64 overflow-auto">
                            {productSearchLoading && (
                              <div className="px-3 py-2 text-xs text-gray-500">
                                Поиск...
                              </div>
                            )}
                            {triggerSearchResults.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                                onClick={() => {
                                  setForm({
                                    ...form,
                                    triggerProductId: p.id,
                                    triggerProductLabel: p.title,
                                  })
                                  setTriggerSearchResults([])
                                }}
                              >
                                <span className="font-medium text-gray-900">
                                  {p.title}
                                </span>
                                <span className="ml-2 text-xs text-gray-500">
                                  ID: {p.id}
                                  {p.sku ? ` · SKU: ${p.sku}` : ''}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Минимальное количество триггер-товара
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="form-input"
                        value={form.triggerProductMinQty}
                        onChange={(e) =>
                          setForm({ ...form, triggerProductMinQty: e.target.value })
                        }
                        required
                      />
                    </div>
                  </>
                )}

                {form.triggerType === 'CART_TOTAL' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Минимальная сумма корзины (₽)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      className="form-input"
                      value={form.minCartTotal}
                      onChange={(e) =>
                        setForm({ ...form, minCartTotal: e.target.value })
                      }
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Режим количества подарков
                  </label>
                  <select
                    className="form-input"
                    value={form.giftQuantityMode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        giftQuantityMode: e.target.value as FormState['giftQuantityMode'],
                      })
                    }
                  >
                    <option value="ONE_PER_ORDER">1 подарок на заказ</option>
                    <option value="PER_TRIGGER">По количеству срабатываний условия</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Макс. подарков на заказ (опционально)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="form-input"
                    value={form.maxGiftsPerOrder}
                    onChange={(e) =>
                      setForm({ ...form, maxGiftsPerOrder: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Акционные товары
                  </label>
                  <select
                    className="form-input"
                    value={form.promoProductInteractionMode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        promoProductInteractionMode:
                          e.target.value as FormState['promoProductInteractionMode'],
                      })
                    }
                  >
                    <option value="ALWAYS_ALLOW">Всегда разрешать подарок</option>
                    <option value="BLOCK_IF_PROMO_PRODUCTS_PRESENT">
                      Не выдавать, если есть акционные товары
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Совместимость с промокодами
                  </label>
                  <select
                    className="form-input"
                    value={form.promoCodeInteractionMode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        promoCodeInteractionMode:
                          e.target.value as FormState['promoCodeInteractionMode'],
                      })
                    }
                  >
                    <option value="ALLOW_WITH_PROMOCODE">Разрешать с промокодами</option>
                    <option value="BLOCK_IF_PROMOCODE_PRESENT">
                      Блокировать, если применён промокод
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата начала действия
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата окончания действия
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.validTo}
                    onChange={(e) => setForm({ ...form, validTo: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Поведение подарка
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.autoRemoveWhenConditionFails}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          autoRemoveWhenConditionFails: e.target.checked,
                        })
                      }
                    />
                    <span>Авто-удалять, если условия перестали выполняться</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.userCanRemoveGiftManually}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          userCanRemoveGiftManually: e.target.checked,
                        })
                      }
                    />
                    <span>Разрешить пользователю удалить подарок вручную</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Отображение на сайте
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.showOnSite}
                      onChange={(e) =>
                        setForm({ ...form, showOnSite: e.target.checked })
                      }
                    />
                    <span>Показывать в разделе «Акции»</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Заголовок для сайта (опционально)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.siteTitle}
                      onChange={(e) =>
                        setForm({ ...form, siteTitle: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Обложка акции
                    </label>
                    <CoverImageDropzone
                      value={form.coverImage}
                      onChange={(url) => setForm({ ...form, coverImage: url })}
                      folder="posts"
                    />
                  </div>
                </div>
              </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Описание для сайта
                  </label>
                  <ProductRichTextEditor
                    value={form.siteDescription}
                    onChange={(html) => setForm({ ...form, siteDescription: html })}
                    placeholder="Текст, который отобразится в карточке акции в разделе «Акции»."
                    className="mt-1"
                  />
                </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="primary" type="submit">
                  {editing ? 'Сохранить изменения' : 'Создать акцию'}
                </Button>
                <Button variant="secondary" type="button" onClick={closeForm}>
                  Отмена
                </Button>
              </div>
            </form>
          </div>
        )}

        {items.length === 0 ? (
          <div className="card">
            <div className="p-10 text-center">
              <p className="text-sm text-gray-600 mb-3">
                Пока нет ни одной подарочной акции.
              </p>
              <Button variant="primary" onClick={openCreate}>
                Создать первую акцию-подарок
              </Button>
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="table-responsive overflow-x-auto">
              <table className="table table-horizontal min-w-[900px]">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">
                      Название
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                      Статус
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                      Условие
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                      Режим подарков
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                      На сайте
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center sticky right-0 bg-white border-l border-gray-200">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="group hover:bg-gray-50 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">{p.title}</span>
                          <span className="text-xs text-gray-500">
                            Подарок: {p.giftProductId}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            p.status === 'enabled'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {p.status === 'enabled' ? 'Включена' : 'Выключена'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">
                        {p.triggerType === 'PRODUCT'
                          ? `Товар ${p.triggerProductId ?? ''} × ${
                              p.triggerProductMinQty ?? 1
                            }`
                          : `Сумма ≥ ${p.minCartTotal ?? 0} ₽`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-center">
                        {p.giftQuantityMode === 'ONE_PER_ORDER'
                          ? '1 подарок на заказ'
                          : 'По количеству срабатываний'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            p.showOnSite
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {p.showOnSite ? 'Показывается' : 'Скрыта'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-200">
                        <div className="flex flex-wrap gap-2 justify-center">
                          <Button variant="secondary" size="sm" onClick={() => openEdit(p)}>
                            Редактировать
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(p.id)}
                          >
                            Удалить
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

