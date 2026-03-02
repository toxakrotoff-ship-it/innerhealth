'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore, type CartLine } from '@/store/cart-store'
import { useMounted } from '@/hooks/use-mounted'
import {
  DeliverySection,
  type CdekCityOption,
  type CdekTariffSummary,
  type CdekPvzOption,
  type DeliveryMethod,
} from '@/components/site/delivery-section'
import { SavedAddressSelector } from '@/components/site/saved-address-selector'
import {
  mapUserAddressToShipping,
  type UserAddressForCheckout,
} from '@/lib/mappers/user-address-to-shipping'

interface PromoResult {
  valid: boolean
  id?: string
  code?: string
  discountType?: string
  discountValue?: number
  error?: string
}

/**
 * Скидка по промокоду применяется только к сумме eligible-товаров без акционной цены.
 * Товары с hasPromoPrice и с isPromoEligible=false в скидку не входят.
 * У eligible-товаров с discountPrice при скидке подставляется discountPrice за единицу.
 */
function applyPromoToSubtotal(subtotal: number, promo: PromoResult | null): number {
  if (!promo?.valid || !promo.discountValue) return subtotal
  if (promo.discountType === 'percentage') {
    return Math.max(0, subtotal * (1 - promo.discountValue / 100))
  }
  return Math.max(0, subtotal - promo.discountValue)
}

export function CartPageContent() {
  const mounted = useMounted()
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const mergeItemDetails = useCartStore((s) => s.mergeItemDetails)

  /** Enrich slim items (rehydrated from localStorage) with product details. */
  useEffect(() => {
    const slimIds = items.filter((i) => i.title == null).map((i) => i.productId)
    if (slimIds.length === 0) return
    const controller = new AbortController()
    fetch(`/api/products/cart-items?ids=${slimIds.join(',')}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((products: Array<{ id: string; title: string; price: number; priceOld: number | null; photo: string | null; slug: string | null; isPromoEligible: boolean | null; discountPrice: number | null }>) => {
        products.forEach((p) => {
          const hasPromoPrice = p.priceOld != null && p.priceOld > p.price
          mergeItemDetails(p.id, {
            title: p.title,
            price: p.price,
            photo: p.photo ?? null,
            slug: p.slug ?? null,
            hasPromoPrice,
            isPromoEligible: p.isPromoEligible ?? true,
            discountPrice: p.discountPrice ?? null,
          })
        })
      })
      .catch(() => {})
    return () => controller.abort()
  }, [items, mergeItemDetails])

  const [promoCode, setPromoCode] = useState('')
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    zipCode: '',
    country: 'Россия',
  })
  const [submitting, setSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [selectedCity, setSelectedCity] = useState<CdekCityOption | null>(null)
  const [pvzTariff, setPvzTariff] = useState<CdekTariffSummary | null>(null)
  const [doorTariff, setDoorTariff] = useState<CdekTariffSummary | null>(null)
  const [calculationLoading, setCalculationLoading] = useState(false)
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('cdek_pvz')
  const [deliveryPoints, setDeliveryPoints] = useState<CdekPvzOption[]>([])
  const [deliveryPointsLoading, setDeliveryPointsLoading] = useState(false)
  const [deliveryPointsError, setDeliveryPointsError] = useState<string | null>(null)
  const [selectedPvz, setSelectedPvz] = useState<CdekPvzOption | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [doorAddress, setDoorAddress] = useState({
    street: '',
    house: '',
    apartment: '',
    entrance: '',
    floor: '',
    intercom: '',
  })
  const [comment, setComment] = useState('')
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const [isPrivacyAccepted, setIsPrivacyAccepted] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<UserAddressForCheckout[]>([])
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null)
  const [usingSavedAddress, setUsingSavedAddress] = useState(false)
  const selectedSavedAddressIdRef = useRef<string | null>(null)

  useEffect(() => {
    selectedSavedAddressIdRef.current = selectedSavedAddressId
  }, [selectedSavedAddressId])

  const loadSavedAddresses = useCallback(async () => {
    try {
      const response = await fetch('/api/account/addresses', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!response.ok) {
        setSavedAddresses([])
        setSelectedSavedAddressId(null)
        setUsingSavedAddress(false)
        return
      }

      const payload = (await response.json()) as
        | UserAddressForCheckout[]
        | { addresses?: UserAddressForCheckout[] }
      const addresses = Array.isArray(payload) ? payload : payload.addresses ?? []
      setSavedAddresses(addresses)

      if (addresses.length === 0) {
        setSelectedSavedAddressId(null)
        setUsingSavedAddress(false)
        return
      }

      const previousSelectedAddressId = selectedSavedAddressIdRef.current
      const hasPreviousSelection = previousSelectedAddressId
        ? addresses.some((address) => address.id === previousSelectedAddressId)
        : false

      setSelectedSavedAddressId(hasPreviousSelection ? previousSelectedAddressId : addresses[0].id)
    } catch {
      setSavedAddresses([])
      setSelectedSavedAddressId(null)
      setUsingSavedAddress(false)
    }
  }, [])

  useEffect(() => {
    void loadSavedAddresses()
  }, [loadSavedAddresses])

  useEffect(() => {
    const handleWindowFocus = () => {
      void loadSavedAddresses()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      void loadSavedAddresses()
    }

    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadSavedAddresses])

  const price = (i: { price?: number }) => i.price ?? 0
  const subtotalPromoPrice = items
    .filter((i) => i.hasPromoPrice)
    .reduce((sum, i) => sum + price(i) * i.quantity, 0)
  const eligibleWithFixedPrice = items.filter(
    (i) => !i.hasPromoPrice && i.isPromoEligible !== false && i.discountPrice != null
  )
  const eligibleForPercent = items.filter(
    (i) => !i.hasPromoPrice && i.isPromoEligible !== false && (i.discountPrice == null || i.discountPrice === undefined)
  )
  const ineligible = items.filter((i) => !i.hasPromoPrice && i.isPromoEligible === false)
  const subtotalEligibleFixed = eligibleWithFixedPrice.reduce(
    (sum, i) => sum + (i.discountPrice ?? price(i)) * i.quantity,
    0
  )
  const subtotalEligiblePercent = eligibleForPercent.reduce(
    (sum, i) => sum + price(i) * i.quantity,
    0
  )
  const subtotalIneligible = ineligible.reduce((sum, i) => sum + price(i) * i.quantity, 0)
  // Промокод применяется только к сумме товаров. Доставка не дисконтируется.
  const totalAfterPromo = applyPromoToSubtotal(subtotalEligiblePercent, promoResult)
  const subtotal = subtotalPromoPrice + subtotalEligibleFixed + subtotalEligiblePercent + subtotalIneligible
  const total = subtotalPromoPrice + subtotalEligibleFixed + totalAfterPromo + subtotalIneligible
  const discount = subtotal - total
  const deliverySum =
    deliveryMethod === 'cdek_pvz'
      ? pvzTariff?.deliverySum ?? 0
      : deliveryMethod === 'cdek_door'
        ? doorTariff?.deliverySum ?? 0
        : 0
  // Итого к оплате = (сумма товаров со скидкой) + доставка; доставка всегда без скидки
  const totalWithDelivery = total + deliverySum
  const cityCode = selectedCity?.code ?? (selectedCity as { city_code?: number } | null)?.city_code

  const applySavedAddress = useCallback(
    (addressId: string) => {
      const selectedAddress = savedAddresses.find((address) => address.id === addressId)
      if (!selectedAddress) return

      const mapped = mapUserAddressToShipping(selectedAddress)
      setSelectedCity(mapped.selectedCity)
      setDeliveryMethod(mapped.deliveryMethod)
      setSelectedPvz(mapped.selectedPvz)
      setDoorAddress(mapped.doorAddress)
      setFormData((prev) => ({
        ...prev,
        address: mapped.formPatch.address,
        city: mapped.formPatch.city,
        zipCode: mapped.formPatch.zipCode,
      }))
    },
    [savedAddresses]
  )

  const handleCalculateDelivery = useCallback(async () => {
    if (cityCode == null) return
    setCalculationLoading(true)
    setDeliveryError(null)
    try {
      const payload = {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        toLocation: { cityCode },
      }
      const [resPvz, resDoor] = await Promise.all([
        fetch('/api/cdek/calculator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, deliveryKind: 'pvz' }),
        }),
        fetch('/api/cdek/calculator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, deliveryKind: 'address' }),
        }),
      ])
      const dataPvz = await resPvz.json()
      const dataDoor = await resDoor.json()
      if (!resPvz.ok) throw new Error(dataPvz.error ?? 'Ошибка расчёта ПВЗ')
      if (!resDoor.ok) throw new Error(dataDoor.error ?? 'Ошибка расчёта до двери')
      const tariffsPvz = dataPvz.tariffs ?? []
      const tariffsDoor = dataDoor.tariffs ?? []
      if (tariffsPvz.length > 0) {
        const t = tariffsPvz[0]
        setPvzTariff({
          deliverySum: t.deliverySum,
          periodMin: t.periodMin,
          periodMax: t.periodMax,
          tariffCode: t.tariffCode,
        })
      } else setPvzTariff(null)
      if (tariffsDoor.length > 0) {
        const t = tariffsDoor[0]
        setDoorTariff({
          deliverySum: t.deliverySum,
          periodMin: t.periodMin,
          periodMax: t.periodMax,
          tariffCode: t.tariffCode,
        })
      } else setDoorTariff(null)
    } catch (e) {
      setDeliveryError(e instanceof Error ? e.message : 'Ошибка расчёта доставки')
    } finally {
      setCalculationLoading(false)
    }
  }, [cityCode, items])

  useEffect(() => {
    if (!usingSavedAddress || !selectedSavedAddressId) return
    applySavedAddress(selectedSavedAddressId)
  }, [usingSavedAddress, selectedSavedAddressId, applySavedAddress])

  useEffect(() => {
    if (!usingSavedAddress || cityCode == null) return
    void handleCalculateDelivery()
  }, [usingSavedAddress, cityCode, handleCalculateDelivery])

  useEffect(() => {
    if (cityCode != null && deliveryMethod === 'cdek_pvz') {
      setDeliveryPointsLoading(true)
      setDeliveryPoints([])
      setDeliveryPointsError(null)
      setSelectedPvz(null)
      fetch(`/api/cdek/deliverypoints?cityCode=${cityCode}&type=PVZ&size=50`)
        .then(async (r) => {
          const data = await r.json()
          if (!r.ok) {
            setDeliveryPointsError(data?.error ?? 'Не удалось загрузить пункты выдачи')
            return
          }
          setDeliveryPoints(data.deliveryPoints ?? [])
        })
        .catch(() => {
          setDeliveryPointsError('Не удалось загрузить пункты выдачи. Попробуйте позже.')
        })
        .finally(() => setDeliveryPointsLoading(false))
    } else {
      setDeliveryPoints([])
      setDeliveryPointsError(null)
      setSelectedPvz(null)
    }
  }, [cityCode, deliveryMethod])

  const handleApplyPromo = async () => {
    const code = promoCode.trim()
    if (!code) return
    setPromoLoading(true)
    setPromoResult(null)
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      setPromoResult(data)
    } catch {
      setPromoResult({ valid: false, error: 'Ошибка запроса' })
    } finally {
      setPromoLoading(false)
    }
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullName = recipientName.trim() || formData.fullName
    const city = selectedCity?.city ?? formData.city
    let address: string
    if (deliveryMethod === 'cdek_pvz' && selectedPvz) {
      address = selectedPvz.full_address || selectedPvz.address || selectedPvz.name || 'ПВЗ СДЭК'
      if (selectedPvz.code) address = `СДЭК ПВЗ ${selectedPvz.code}: ${address}`
    } else if (deliveryMethod === 'cdek_door') {
      const parts = [doorAddress.street, doorAddress.house, doorAddress.apartment, doorAddress.entrance, doorAddress.floor, doorAddress.intercom].filter(Boolean)
      address = parts.length ? parts.join(', ') : formData.address
      if (!address.trim()) address = formData.address
    } else {
      address = 'Самовывоз'
    }
    if (comment.trim()) address = `${address}\nКомментарий: ${comment.trim()}`
    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price ?? 0 })),
          total: totalWithDelivery,
          deliverySum: deliverySum > 0 ? deliverySum : undefined,
          promoCodeId: promoResult?.valid ? promoResult.id : null,
          shipping: {
            ...formData,
            fullName: fullName || formData.fullName,
            city: city || formData.city,
            address: address || formData.address,
            ...(deliveryMethod === 'cdek_pvz' || deliveryMethod === 'cdek_door'
              ? {
                  deliveryMethod,
                  cdekCityCode: cityCode ?? undefined,
                  cdekTariffCode:
                    deliveryMethod === 'cdek_pvz'
                      ? pvzTariff?.tariffCode
                      : doorTariff?.tariffCode,
                  ...(deliveryMethod === 'cdek_pvz' ? { cdekPvzCode: selectedPvz?.code } : {}),
                  ...(deliveryMethod === 'cdek_door'
                    ? {
                        doorAddress: {
                          street: doorAddress.street || undefined,
                          house: doorAddress.house || undefined,
                          apartment: doorAddress.apartment || undefined,
                          entrance: doorAddress.entrance || undefined,
                          floor: doorAddress.floor || undefined,
                          intercom: doorAddress.intercom || undefined,
                        },
                      }
                    : {}),
                }
              : {}),
          },
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Ошибка оформления')
      }
      const data = await res.json()
      if (data.confirmationUrl) {
        useCartStore.getState().clearCart()
        window.location.href = data.confirmationUrl
        return
      }
      setOrderSuccess(true)
      useCartStore.getState().clearCart()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка оформления заказа')
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-gray-600 mb-4">Корзина пуста</p>
        <Link
          href="/catalog"
          className="inline-flex items-center justify-center rounded-full bg-action-blue text-gray-800 font-medium px-6 py-3 min-h-[44px] hover:bg-action-blue/90"
        >
          Перейти в каталог
        </Link>
      </div>
    )
  }

  if (orderSuccess) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-lg font-medium text-text mb-2">Заказ успешно оформлен</p>
        <p className="text-gray-600 mb-4">Мы свяжемся с вами для подтверждения.</p>
        <Link
          href="/catalog"
          className="inline-flex items-center justify-center rounded-full bg-action-blue text-gray-800 font-medium px-6 py-3 min-h-[44px] hover:bg-action-blue/90"
        >
          Вернуться в каталог
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmitOrder} className="space-y-8">
      {/* Список товаров на всю ширину */}
      <div className="space-y-4">
        {items.map((line) => (
          <CartLineRow
            key={line.productId}
            line={line}
            onRemove={() => removeItem(line.productId)}
            onQuantityChange={(q) => updateQuantity(line.productId, q)}
          />
        ))}
      </div>

      {/* Промокод на всю ширину */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-text mb-4">Промокод</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Введите код"
            className="flex-1 min-w-[200px] form-input rounded-lg text-base min-h-[44px]"
          />
          <button
            type="button"
            onClick={handleApplyPromo}
            disabled={promoLoading}
            className="rounded-lg bg-action-blue text-gray-800 px-5 py-2 min-h-[44px] font-medium hover:bg-action-blue/90 disabled:opacity-50"
          >
            {promoLoading ? '...' : 'Применить'}
          </button>
        </div>
        {promoResult && (
          <p className={`mt-2 text-sm ${promoResult.valid ? 'text-green-600' : 'text-red-600'}`}>
            {promoResult.valid ? 'Скидка применена' : promoResult.error}
          </p>
        )}
      </div>

      {/* Остальная форма: доставка, контакты, итого */}
      <div className="space-y-6">
        {savedAddresses.length > 0 ? (
          <SavedAddressSelector
            addresses={savedAddresses}
            selectedAddressId={selectedSavedAddressId}
            usingSavedAddress={usingSavedAddress}
            onSelectAddress={(addressId) => {
              setSelectedSavedAddressId(addressId)
              if (usingSavedAddress) applySavedAddress(addressId)
            }}
            onUseSavedAddress={() => {
              if (!selectedSavedAddressId) return
              applySavedAddress(selectedSavedAddressId)
              setUsingSavedAddress(true)
            }}
            onUseAnotherAddress={() => setUsingSavedAddress(false)}
          />
        ) : null}

        {usingSavedAddress ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-text mb-2">Доставка</h2>
            <p className="text-sm text-gray-600">
              Используется сохранённый адрес. Чтобы заполнить поля вручную, выберите
              {' '}«Использовать другой адрес».
            </p>
          </div>
        ) : (
          <DeliverySection
              selectedCity={selectedCity}
              onCitySelect={setSelectedCity}
              pvzTariff={pvzTariff}
              doorTariff={doorTariff}
              calculationLoading={calculationLoading}
              onCalculate={handleCalculateDelivery}
              deliveryMethod={deliveryMethod}
              onDeliveryMethodChange={setDeliveryMethod}
              deliveryPoints={deliveryPoints}
              deliveryPointsLoading={deliveryPointsLoading}
              deliveryPointsError={deliveryPointsError}
              selectedPvz={selectedPvz}
              onPvzSelect={setSelectedPvz}
              recipientName={recipientName}
              onRecipientNameChange={setRecipientName}
              doorAddress={doorAddress}
              onDoorAddressChange={(patch) => setDoorAddress((prev) => ({ ...prev, ...patch }))}
              comment={comment}
              onCommentChange={setComment}
              error={deliveryError}
            />
        )}

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-text mb-4">Контактные данные</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="form-input w-full rounded-lg text-base min-h-[44px]"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="form-input w-full rounded-lg text-base min-h-[44px]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-text mb-4">Итого</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Товары</span>
                <span>{subtotal.toLocaleString('ru-RU')} ₽</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Скидка</span>
                  <span>-{discount.toLocaleString('ru-RU')} ₽</span>
                </div>
              )}
              {(deliveryMethod === 'cdek_pvz' || deliveryMethod === 'cdek_door') && deliverySum > 0 && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>
                      Доставка СДЭК ({deliveryMethod === 'cdek_pvz' ? 'до ПВЗ' : 'до двери'})
                    </span>
                    <span>{deliverySum.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Стоимость доставки не зависит от скидки по промокоду.
                  </p>
                </>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200">
                <span>К оплате</span>
                <span>{totalWithDelivery.toLocaleString('ru-RU')} ₽</span>
              </div>
            </dl>
          </div>

        <label className="flex items-center justify-center gap-2 text-sm text-gray-700 mb-3">
          <input
            type="checkbox"
            checked={isPrivacyAccepted}
            onChange={(e) => setIsPrivacyAccepted(e.target.checked)}
            required
            className="h-4 w-4 rounded border-gray-300 shrink-0"
          />
          <span>
            Ознакомлен(а) с{' '}
            <Link href="/privacy" className="text-action-blue hover:underline">
              политикой конфиденциальности
            </Link>
            .
          </span>
        </label>
        <button
          type="submit"
          disabled={submitting || !isPrivacyAccepted}
          className="w-full rounded-full bg-action-blue text-gray-800 font-medium py-3 min-h-[44px] hover:bg-action-blue/90 disabled:opacity-50"
        >
          {submitting ? 'Оформление...' : 'Оформить заказ'}
        </button>
      </div>
    </form>
  )
}

function CartLineRow({
  line,
  onRemove,
  onQuantityChange,
}: {
  line: CartLine
  onRemove: () => void
  onQuantityChange: (q: number) => void
}) {
  return (
    <div className="flex gap-4 bg-white rounded-xl border border-gray-200 p-4">
      <div className="relative w-20 h-20 rounded-lg bg-highlight-blue shrink-0 overflow-hidden">
        {line.photo ? (
          <Image
            src={line.photo.startsWith('/') ? line.photo : `/${line.photo.replace(/^\//, '')}`}
            alt={line.title ?? ''}
            fill
            className="object-contain p-1"
          />
        ) : (
          <span className="text-action-blue/40 text-2xl m-auto">?</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link
          href={line.slug ? `/product/${line.slug}` : `/product/id/${line.productId}`}
          className="font-medium text-text hover:text-action-blue line-clamp-2"
        >
          {line.title ?? 'Загрузка...'}
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-gray-600">
            {line.price != null
              ? `${line.price.toLocaleString('ru-RU')} ₽ × `
              : '— × '}
            <input
              type="number"
              min={1}
              value={line.quantity}
              onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-14 inline-block text-center border border-gray-300 rounded px-1 py-0.5 text-base"
            />
          </span>
          <button type="button" onClick={onRemove} className="text-sm text-red-600 hover:underline">
            Удалить
          </button>
        </div>
      </div>
      <div className="font-medium text-text">
        {((line.price ?? 0) * line.quantity).toLocaleString('ru-RU')} ₽
      </div>
    </div>
  )
}
