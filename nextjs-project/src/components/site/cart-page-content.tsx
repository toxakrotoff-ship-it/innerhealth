'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCartStore, type CartLine } from '@/store/cart-store'
import { useMounted } from '@/hooks/use-mounted'
import {
  type CdekCityOption,
  type CdekTariffSummary,
  type CdekPvzOption,
  type DeliveryMethod,
} from '@/components/site/delivery-section'
import { CdekWidget } from '@/components/site/cdek-widget'
import { SavedAddressSelector } from '@/components/site/saved-address-selector'
import { Heading2 } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
import {
  mapUserAddressToShipping,
  type UserAddressForCheckout,
} from '@/lib/mappers/user-address-to-shipping'
import { applyPhoneMask, validatePhoneRu } from '@/lib/phone-mask'
import { validateEmail } from '@/lib/validations/contact'
import { logAnalyticsEvent } from '@/lib/analytics/analytics-client'
import { cn } from '@/lib/utils'
import type { BrandId } from '@/lib/brand/brand'
import { usePromoStore } from '@/store/promo-store'
import { pushMetrikaEcommerceEvent } from '@/lib/analytics/metrika-ecommerce'
import { reachMetrikaGoal } from '@/lib/analytics/metrika'

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

interface CartPageContentProps {
  isSprintTheme?: boolean
  brandId?: BrandId
  pickupAddress?: string
  canUseSavedAddresses?: boolean
}

function resolvePickupCity(pickupAddress?: string): string {
  const trimmed = pickupAddress?.trim()
  if (!trimmed) return 'Москва'
  const match = trimmed.match(/^(?:г\.\s*)?([^,]+)/i)
  const city = match?.[1]?.trim()
  return city && city.length > 0 ? city : 'Москва'
}

function buildDoorAddressString(address: {
  street: string
  house: string
  apartment: string
  entrance: string
  floor: string
  intercom: string
}): string {
  return [
    address.street.trim(),
    address.house.trim(),
    address.apartment.trim(),
    address.entrance.trim(),
    address.floor.trim(),
    address.intercom.trim(),
  ]
    .filter(Boolean)
    .join(', ')
}

function parseDoorAddressFromWidget(formattedAddress: string): {
  street: string
  house: string
  apartment: string
} {
  const normalized = formattedAddress
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  let street = ''
  let house = ''
  let apartment = ''

  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const part = normalized[index]
    const houseMatch = part.match(/^(?:д\.?|дом)?\s*([0-9]+[0-9A-Za-zА-Яа-я/-]*)$/i)
    if (!houseMatch?.[1]) continue

    house = houseMatch[1].trim()
    street = normalized[index - 1]?.trim() ?? ''
    const apartmentMatch = normalized.slice(index + 1).join(', ').match(/(?:кв\.?|квартира|офис|оф\.)\s*([A-Za-zА-Яа-я0-9-/]+)/i)
    apartment = apartmentMatch?.[1]?.trim() ?? ''
    break
  }

  if (!street) {
    const streetCandidates = normalized.filter((part) => !/(?:^|\s)(?:д\.?|дом)?\s*[0-9]+[0-9A-Za-zА-Яа-я/-]*$/i.test(part))
    street = streetCandidates[streetCandidates.length - 1] ?? normalized.join(', ')
  }

  return { street, house, apartment }
}

export function CartPageContent({
  isSprintTheme = false,
  brandId,
  pickupAddress,
  canUseSavedAddresses = false,
}: CartPageContentProps) {
  const mounted = useMounted()
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const mergeItemDetails = useCartStore((s) => s.mergeItemDetails)
  const setHasPromoCode = usePromoStore((s) => s.setHasPromoCode)

  /** Enrich slim items (rehydrated from localStorage) with product details. */
  useEffect(() => {
    const giftIds = new Set(items.filter((i) => i.isGift === true).map((i) => i.productId))
    const slimIds = items.filter((i) => i.title == null).map((i) => i.productId)
    if (slimIds.length === 0) return
    const controller = new AbortController()
    const brandQuery = brandId ? `&brand=${encodeURIComponent(brandId)}` : ''
    fetch(`/api/products/cart-items?ids=${slimIds.join(',')}${brandQuery}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((products: Array<{ id: string; title: string; price: number; priceOld: number | null; photo: string | null; slug: string | null; isPromoEligible: boolean | null; discountPrice: number | null }>) => {
        products.forEach((p) => {
          const isGift = giftIds.has(p.id)
          if (isGift) {
            mergeItemDetails(p.id, {
              title: p.title,
              photo: p.photo ?? null,
              slug: p.slug ?? null,
            })
            return
          }
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
  }, [items, mergeItemDetails, brandId])

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
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup')
  const [hasWidgetTariffSelection, setHasWidgetTariffSelection] = useState(false)
  const [selectedPvz, setSelectedPvz] = useState<CdekPvzOption | null>(null)
  const [doorAddress, setDoorAddress] = useState({
    street: '',
    house: '',
    apartment: '',
    entrance: '',
    floor: '',
    intercom: '',
  })
  const [comment] = useState('')
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isPrivacyAccepted, setIsPrivacyAccepted] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<UserAddressForCheckout[]>([])
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null)
  const [usingSavedAddress, setUsingSavedAddress] = useState(false)
  const selectedSavedAddressIdRef = useRef<string | null>(null)

  const selectedSavedAddress = selectedSavedAddressId
    ? savedAddresses.find((address) => address.id === selectedSavedAddressId) ?? null
    : null
  const isCdekDeliverySelected = deliveryMethod === 'cdek_pvz' || deliveryMethod === 'cdek_door'

  useEffect(() => {
    if (usingSavedAddress) return
    setPvzTariff(null)
    setDoorTariff(null)
  }, [selectedSavedAddressId, usingSavedAddress])

  useEffect(() => {
    selectedSavedAddressIdRef.current = selectedSavedAddressId
  }, [selectedSavedAddressId])

  const loadSavedAddresses = useCallback(async () => {
    if (!canUseSavedAddresses) {
      setSavedAddresses([])
      setSelectedSavedAddressId(null)
      setUsingSavedAddress(false)
      return
    }
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
  }, [canUseSavedAddresses])

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
  const selectedDeliveryTariff = deliveryMethod === 'cdek_pvz' ? pvzTariff : doorTariff
  const rawCityCode = selectedCity?.code ?? (selectedCity as { city_code?: number } | null)?.city_code
  const cityCode =
    typeof rawCityCode === 'number' && Number.isFinite(rawCityCode) && rawCityCode > 0
      ? rawCityCode
      : null

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

  function handlePickupModeSelect() {
    setDeliveryMethod('pickup')
    setHasWidgetTariffSelection(false)
  }

  function handleCdekModeSelect() {
    setDeliveryMethod((prev) => (prev === 'pickup' ? 'cdek_pvz' : prev))
  }

  const resolveCdekCityCodeByName = useCallback(
    async (cityName: string): Promise<number | null> => {
      const query = cityName.trim()
      if (!query) return null
      const brandQuery = brandId ? `&brand=${encodeURIComponent(brandId)}` : ''
      try {
        const response = await fetch(`/api/cdek/cities?q=${encodeURIComponent(query)}&size=1${brandQuery}`)
        if (!response.ok) return null
        const data = (await response.json().catch(() => null)) as
          | { cities?: Array<{ code?: number; city?: string; region?: string; country?: string }> }
          | null
        const code = data?.cities?.[0]?.code
        if (typeof code !== 'number' || !Number.isFinite(code) || code <= 0) return null
        setSelectedCity((prev) => ({
          code,
          city: data?.cities?.[0]?.city ?? prev?.city ?? query,
          region: data?.cities?.[0]?.region ?? prev?.region,
          country: data?.cities?.[0]?.country ?? prev?.country,
        }))
        return code
      } catch {
        return null
      }
    },
    [brandId]
  )

  useEffect(() => {
    if (!usingSavedAddress || !selectedSavedAddressId) return
    applySavedAddress(selectedSavedAddressId)
  }, [usingSavedAddress, selectedSavedAddressId, applySavedAddress])

  useEffect(() => {
    const keepPvzSelection = cityCode != null && deliveryMethod === 'cdek_pvz'
    if (!keepPvzSelection) {
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
      setHasPromoCode(Boolean(data?.valid))
    } catch {
      setPromoResult({ valid: false, error: 'Ошибка запроса' })
      setHasPromoCode(false)
    } finally {
      setPromoLoading(false)
    }
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !isPrivacyAccepted) return
    const fullName = formData.fullName.trim()
    const phoneCheck = validatePhoneRu(formData.phone)
    const emailCheck = validateEmail(formData.email)
    setPhoneError(
      phoneCheck.valid ? null : ('message' in phoneCheck ? phoneCheck.message : null)
    )
    setEmailError(
      emailCheck.valid ? null : ('message' in emailCheck ? emailCheck.message : null)
    )
    if (!fullName || !phoneCheck.valid || !emailCheck.valid) return
    let effectiveCityCode = cityCode
    if (effectiveCityCode == null && (deliveryMethod === 'cdek_pvz' || deliveryMethod === 'cdek_door')) {
      effectiveCityCode = await resolveCdekCityCodeByName(selectedCity?.city ?? formData.city)
    }
    if ((deliveryMethod === 'cdek_pvz' || deliveryMethod === 'cdek_door') && effectiveCityCode == null) {
      setDeliveryError('Не указан код города СДЭК')
      return
    }
    if (deliveryMethod === 'cdek_pvz' && (!selectedPvz?.code || !pvzTariff?.tariffCode)) {
      setDeliveryError('Выберите пункт выдачи СДЭК и дождитесь расчёта тарифа')
      return
    }
    if (deliveryMethod === 'cdek_door' && !doorTariff?.tariffCode) {
      setDeliveryError('Не удалось определить тариф СДЭК до двери')
      return
    }
    if (deliveryMethod === 'cdek_door' && (!doorAddress.street.trim() || !doorAddress.house.trim())) {
      setDeliveryError('Укажите улицу и дом для доставки СДЭК')
      return
    }
    setDeliveryError(null)
    const city = deliveryMethod === 'pickup'
      ? formData.city.trim() || resolvePickupCity(pickupAddress)
      : selectedCity?.city ?? formData.city
    let address: string
    if (deliveryMethod === 'cdek_pvz' && selectedPvz) {
      address = selectedPvz.full_address || selectedPvz.address || selectedPvz.name || 'ПВЗ СДЭК'
      if (selectedPvz.code) address = `СДЭК ПВЗ ${selectedPvz.code}: ${address}`
    } else if (deliveryMethod === 'cdek_door') {
      const structuredAddress = buildDoorAddressString(doorAddress)
      address = structuredAddress || formData.address
      if (!address.trim()) address = formData.address
    } else {
      address = pickupAddress?.trim() || 'Самовывоз'
    }
    if (comment.trim()) address = `${address}\nКомментарий: ${comment.trim()}`
    setSubmitting(true)
    try {
      if (brandId !== 'sprint-power') {
        const nonGiftItems = items.filter((i) => i.isGift !== true)
        reachMetrikaGoal('begin_checkout', {
          deliveryMethod,
          itemCount: nonGiftItems.length,
          totalWithDelivery,
        })
        pushMetrikaEcommerceEvent({
          event: 'begin_checkout',
          ecommerce: {
            currency: 'RUB',
            value: totalWithDelivery,
            shipping: deliverySum,
            items: nonGiftItems.map((i) => ({
              item_id: i.productId,
              item_name: i.title,
              price: i.price ?? 0,
              quantity: i.quantity,
            })),
          },
        })
      }
      const orderEndpoint = brandId
        ? `/api/orders?brand=${encodeURIComponent(brandId)}`
        : '/api/orders'
      const res = await fetch(orderEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items
            .filter((i) => i.isGift !== true)
            .map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price ?? 0 })),
          total: totalWithDelivery,
          deliverySum: deliverySum > 0 ? deliverySum : undefined,
          promoCodeId: promoResult?.valid ? promoResult.id : null,
          shipping: {
            ...formData,
            fullName,
            city: city || formData.city,
            address: address || formData.address,
            deliveryMethod,
            ...(deliveryMethod === 'cdek_pvz' || deliveryMethod === 'cdek_door'
              ? {
                  cdekCityCode: effectiveCityCode ?? undefined,
                  cdekCityUuid: selectedCity?.city_uuid ?? undefined,
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
        try {
          const nonGiftItems = items
            .filter((i) => i.isGift !== true)
            .map((i) => ({
              productId: i.productId,
              title: i.title ?? '',
              price: i.price ?? 0,
              quantity: i.quantity,
            }))
          window.localStorage.setItem(
            'ih_pending_yookassa_payment',
            JSON.stringify({
              orderId: data.id,
              paymentId: data.paymentId,
              value: totalWithDelivery,
              deliveryMethod,
              items: nonGiftItems,
              createdAt: new Date().toISOString(),
            })
          )
        } catch {
          // ignore
        }
        useCartStore.getState().clearCart()
        logAnalyticsEvent({
          type: 'CHECKOUT_START',
          path: '/cart',
          meta: {
            totalWithDelivery,
            deliveryMethod,
          },
        })
        window.location.href = data.confirmationUrl
        return
      }
      setOrderSuccess(true)
      useCartStore.getState().clearCart()
      if (brandId !== 'sprint-power') {
        reachMetrikaGoal('order_created', { totalWithDelivery, deliveryMethod })
      }
      logAnalyticsEvent({
        type: 'ORDER_CREATED',
        path: '/cart',
        meta: {
          totalWithDelivery,
          deliveryMethod,
        },
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка оформления заказа')
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-4">
        <div className={cn('h-32 rounded-xl', isSprintTheme ? 'bg-slate-800' : 'bg-gray-200')} />
        <div className={cn('h-32 rounded-xl', isSprintTheme ? 'bg-slate-800' : 'bg-gray-200')} />
      </div>
    )
  }

  const hasNonGiftItems = items.some((i) => i.isGift !== true)

  if (!hasNonGiftItems && !orderSuccess) {
    return (
      <div className={cn('rounded-2xl border p-8 text-center xl:p-10 2xl:p-12 3xl:p-16 4xl:p-20 5xl:p-24 6xl:p-32', isSprintTheme ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white')}>
        <p className={cn('mb-4', isSprintTheme ? 'text-slate-300' : 'text-gray-600')}>Корзина пуста</p>
        <Link
          href="/catalog"
          className={cn(
            'inline-flex min-h-[44px] items-center justify-center rounded-full px-6 py-3 font-medium',
            isSprintTheme ? 'bg-[#7AA2FF] text-slate-950 hover:bg-[#9AB8FF]' : 'bg-action-blue text-gray-800 hover:bg-action-blue/90'
          )}
        >
          Перейти в каталог
        </Link>
      </div>
    )
  }

  if (orderSuccess) {
    return (
      <div className={cn('rounded-2xl border p-8 text-center xl:p-10 2xl:p-12 3xl:p-16 4xl:p-20 5xl:p-24 6xl:p-32', isSprintTheme ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white')}>
        <p className={cn('mb-2 text-lg font-medium', isSprintTheme ? 'text-slate-100' : 'text-text')}>Заказ успешно оформлен</p>
        <p className={cn('mb-4', isSprintTheme ? 'text-slate-300' : 'text-gray-600')}>Мы свяжемся с вами для подтверждения.</p>
        <Link
          href="/catalog"
          className={cn(
            'inline-flex min-h-[44px] items-center justify-center rounded-full px-6 py-3 font-medium',
            isSprintTheme ? 'bg-[#7AA2FF] text-slate-950 hover:bg-[#9AB8FF]' : 'bg-action-blue text-gray-800 hover:bg-action-blue/90'
          )}
        >
          Вернуться в каталог
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmitOrder} noValidate className="space-y-8">
      {/* Список товаров на всю ширину */}
      <div className="space-y-4 xl:space-y-6 2xl:space-y-8 3xl:space-y-10 4xl:space-y-12 5xl:space-y-14 6xl:space-y-16">
        {items.map((line) => {
          const lineTotalOriginal = (line.price ?? 0) * line.quantity
          const isEligibleForPercent =
            !line.hasPromoPrice &&
            line.isPromoEligible !== false &&
            (line.discountPrice == null || line.discountPrice === undefined)
          const lineTotalAfterPromo =
            promoResult?.valid &&
            subtotalEligiblePercent > 0 &&
            isEligibleForPercent
              ? lineTotalOriginal * (totalAfterPromo / subtotalEligiblePercent)
              : lineTotalOriginal
          const isGift = line.isGift === true
          return (
            <CartLineRow
              key={line.productId}
              line={line}
              lineTotalAfterPromo={lineTotalAfterPromo}
              isGift={isGift}
              isSprintTheme={isSprintTheme}
              onRemove={() => {
                if (isGift) return
                removeItem(line.productId)
              }}
              onQuantityChange={(q) => {
                if (isGift) return
                updateQuantity(line.productId, q)
              }}
            />
          )
        })}
      </div>

      <ScalableSpacing size="lg" />

      {/* Промокод на всю ширину */}
      <div className={cn('rounded-2xl border p-6 xl:p-8 2xl:p-10 3xl:p-12 4xl:p-16 5xl:p-20 6xl:p-24', isSprintTheme ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white')}>
        <Heading2 className={cn('mb-4 xl:mb-6 2xl:mb-8 3xl:mb-10 4xl:mb-12 5xl:mb-16 6xl:mb-20', isSprintTheme && 'text-slate-100')}>
          Промокод
        </Heading2>
        <div className="flex gap-2 xl:gap-3 2xl:gap-4 3xl:gap-5 4xl:gap-6 5xl:gap-8 6xl:gap-10 flex-wrap">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Введите код"
            className={cn(
              'form-input min-h-[44px] min-w-[200px] flex-1 rounded-lg text-base',
              isSprintTheme && 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400'
            )}
          />
          <button
            type="button"
            onClick={handleApplyPromo}
            disabled={promoLoading}
            className={cn(
              'min-h-[44px] rounded-lg px-5 py-2 font-medium disabled:opacity-50',
              isSprintTheme ? 'bg-[#7AA2FF] text-slate-950 hover:bg-[#9AB8FF]' : 'bg-action-blue text-gray-800 hover:bg-action-blue/90'
            )}
          >
            {promoLoading ? '...' : 'Применить'}
          </button>
        </div>
        {promoResult && (
          <p className={`mt-2 xl:mt-3 2xl:mt-4 3xl:mt-5 4xl:mt-6 5xl:mt-8 6xl:mt-10 text-sm ${promoResult.valid ? 'text-green-600' : 'text-red-600'}`}>
            {promoResult.valid ? 'Скидка применена' : promoResult.error}
          </p>
        )}
      </div>

      <ScalableSpacing size="lg" />

      {/* Остальная форма: доставка, контакты, итого */}
      <div className="space-y-6 xl:space-y-8 2xl:space-y-10 3xl:space-y-12 4xl:space-y-14 5xl:space-y-16 6xl:space-y-20">
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
          <div className={cn('rounded-2xl border p-6 xl:p-8 2xl:p-10 3xl:p-12 4xl:p-16 5xl:p-20 6xl:p-24', isSprintTheme ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white')}>
            <Heading2 className={cn('mb-2 xl:mb-3 2xl:mb-4 3xl:mb-5 4xl:mb-6 5xl:mb-8 6xl:mb-10', isSprintTheme && 'text-slate-100')}>
              Доставка
            </Heading2>
            <p className={cn('text-sm', isSprintTheme ? 'text-slate-300' : 'text-gray-600')}>
              Используется сохранённый адрес. Чтобы заполнить поля вручную, выберите
              {' '}«Использовать другой адрес».
            </p>
          </div>
        ) : null}

        {!usingSavedAddress ? (
          <div className={cn('rounded-2xl border p-6 xl:p-8 2xl:p-10 3xl:p-12 4xl:p-16 5xl:p-20 6xl:p-24', isSprintTheme ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white')}>
            <Heading2 className={cn('mb-4 xl:mb-6 2xl:mb-8 3xl:mb-10 4xl:mb-12 5xl:mb-16 6xl:mb-20', isSprintTheme && 'text-slate-100')}>
              Способ получения
            </Heading2>
            <div className="space-y-3">
              <label className={cn('flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border p-3', isSprintTheme ? 'border-slate-600 hover:bg-slate-800/60' : 'border-gray-200 hover:bg-gray-50')}>
                <input
                  type="radio"
                  name="checkout-delivery-kind"
                  checked={deliveryMethod === 'pickup'}
                  onChange={handlePickupModeSelect}
                  className="h-4 w-4"
                />
                <span className="min-w-0">
                  <span className={cn('block text-sm font-medium', isSprintTheme ? 'text-slate-100' : 'text-gray-900')}>
                    Самовывоз
                  </span>
                  {pickupAddress?.trim() ? (
                    <span className={cn('mt-1 block text-xs', isSprintTheme ? 'text-slate-300' : 'text-gray-600')}>
                      {pickupAddress.trim()}
                    </span>
                  ) : null}
                </span>
              </label>
              <label className={cn('flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border p-3', isSprintTheme ? 'border-slate-600 hover:bg-slate-800/60' : 'border-gray-200 hover:bg-gray-50')}>
                <input
                  type="radio"
                  name="checkout-delivery-kind"
                  checked={isCdekDeliverySelected}
                  onChange={handleCdekModeSelect}
                  className="h-4 w-4"
                />
                <span className={cn('text-sm font-medium', isSprintTheme ? 'text-slate-100' : 'text-gray-900')}>
                  Доставка (СДЭК)
                </span>
              </label>
            </div>
          </div>
        ) : null}

        {!usingSavedAddress ? (
          <div hidden={!isCdekDeliverySelected} aria-hidden={!isCdekDeliverySelected}>
            <CdekWidget
              key={[
                'cdek-widget',
                // When user changes the selected saved address, remount the widget to force recalculation.
                selectedSavedAddressId ?? 'none',
                selectedSavedAddress?.deliveryMethod ?? 'none',
                selectedSavedAddress?.cdekCityCode ?? '0',
                selectedSavedAddress?.cdekPvzCode ?? 'none',
                selectedSavedAddress?.addressLine ?? 'none',
              ].join(':')}
              brandId={brandId}
              items={items}
              defaultLocation={selectedSavedAddress?.city ?? undefined}
              selected={
                selectedSavedAddress
                  ? selectedSavedAddress.deliveryMethod === 'cdek_pvz'
                    ? { office: selectedSavedAddress.cdekPvzCode }
                    : undefined
                  : undefined
              }
              onCalculate={({ office, door }) => {
                // До выбора пользователем — можно подставить дефолт для отображения.
                // После `onChoose` выбранный тариф является источником истины и не должен затираться.
                if (hasWidgetTariffSelection) return
                const officeTariff = office.find((t) => t.tariffCode === 136) ?? office[0]
                const doorTariff = door.find((t) => t.tariffCode === 137) ?? door[0]
                setPvzTariff(officeTariff ?? null)
                setDoorTariff(doorTariff ?? null)
              }}
              onModeChange={(method) => {
                setDeliveryMethod(method)
              }}
              onChoose={({ deliveryMethod: method, tariff, cityCode: cdekCityCode, cityUuid, city: cdekCity, pvzCode, pvzAddress, doorAddress: doorAddr }) => {
                setHasWidgetTariffSelection(true)
                setDeliveryMethod(method)
                if (
                  (typeof cdekCityCode === 'number' && Number.isFinite(cdekCityCode) && cdekCityCode > 0) ||
                  cdekCity ||
                  cityUuid
                ) {
                  setSelectedCity((prev) => ({
                    code: cdekCityCode ?? prev?.code ?? Number.NaN,
                    city: cdekCity ?? prev?.city,
                    region: prev?.region,
                    country: prev?.country,
                    city_uuid: cityUuid ?? prev?.city_uuid,
                  }))
                }
                  if (method === 'cdek_pvz') {
                    setPvzTariff(tariff)
                    setSelectedPvz(
                    pvzCode
                      ? {
                          code: pvzCode,
                          address: pvzAddress ?? undefined,
                          full_address: pvzAddress ?? undefined,
                        }
                      : null
                  )
                  if (pvzCode) {
                    const formattedPvzAddress = pvzAddress ?? ''
                    setFormData((prev) => ({
                      ...prev,
                      city: cdekCity ?? prev.city,
                      address: `СДЭК ПВЗ ${pvzCode}: ${formattedPvzAddress}`.trim(),
                    }))
                  }
                } else {
                  setDoorTariff(tariff)
                  if (doorAddr) {
                    const parsedAddress = parseDoorAddressFromWidget(doorAddr)
                    setDoorAddress((prev) => ({
                      ...prev,
                      street: parsedAddress.street || prev.street,
                      house: parsedAddress.house || prev.house,
                      apartment: parsedAddress.apartment || prev.apartment,
                    }))
                    setFormData((prev) => ({
                      ...prev,
                      city: cdekCity ?? prev.city,
                      address: doorAddr,
                    }))
                  }
                }
              }}
            />
          </div>
        ) : null}

        {!usingSavedAddress && deliveryMethod === 'cdek_door' ? (
          <div
            className={cn(
              'rounded-2xl border p-6 xl:p-8 2xl:p-10 3xl:p-12 4xl:p-16 5xl:p-20 6xl:p-24',
              isSprintTheme ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'
            )}
          >
            <Heading2
              className={cn(
                'mb-4 xl:mb-6 2xl:mb-8 3xl:mb-10 4xl:mb-12 5xl:mb-16 6xl:mb-20',
                isSprintTheme && 'text-slate-100'
              )}
            >
              Адрес доставки
            </Heading2>
            <p className={cn('mb-4 text-sm', isSprintTheme ? 'text-slate-300' : 'text-gray-600')}>
              Виджет СДЭК заполняет улицу и дом. Проверьте их и добавьте детали для курьера.
            </p>

            <div className="grid gap-3 xl:gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="cdek-door-street"
                  className={cn('mb-1 block text-sm font-medium', isSprintTheme ? 'text-slate-200' : 'text-gray-700')}
                >
                  Улица
                </label>
                <input
                  id="cdek-door-street"
                  type="text"
                  required
                  value={doorAddress.street}
                  onChange={(e) => setDoorAddress((prev) => ({ ...prev, street: e.target.value }))}
                  className={cn(
                    'form-input min-h-[44px] w-full rounded-lg text-base',
                    isSprintTheme && 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400'
                  )}
                  placeholder="Улица"
                />
              </div>

              <div>
                <label
                  htmlFor="cdek-door-house"
                  className={cn('mb-1 block text-sm font-medium', isSprintTheme ? 'text-slate-200' : 'text-gray-700')}
                >
                  Дом / корпус
                </label>
                <input
                  id="cdek-door-house"
                  type="text"
                  required
                  value={doorAddress.house}
                  onChange={(e) => setDoorAddress((prev) => ({ ...prev, house: e.target.value }))}
                  className={cn(
                    'form-input min-h-[44px] w-full rounded-lg text-base',
                    isSprintTheme && 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400'
                  )}
                  placeholder="Например: 10к2"
                />
              </div>

              <div>
                <label
                  htmlFor="cdek-door-apartment"
                  className={cn('mb-1 block text-sm font-medium', isSprintTheme ? 'text-slate-200' : 'text-gray-700')}
                >
                  Квартира / офис
                </label>
                <input
                  id="cdek-door-apartment"
                  type="text"
                  value={doorAddress.apartment}
                  onChange={(e) => setDoorAddress((prev) => ({ ...prev, apartment: e.target.value }))}
                  className={cn(
                    'form-input min-h-[44px] w-full rounded-lg text-base',
                    isSprintTheme && 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400'
                  )}
                  placeholder="Необязательно"
                />
              </div>

              <div>
                <label
                  htmlFor="cdek-door-entrance"
                  className={cn('mb-1 block text-sm font-medium', isSprintTheme ? 'text-slate-200' : 'text-gray-700')}
                >
                  Подъезд
                </label>
                <input
                  id="cdek-door-entrance"
                  type="text"
                  value={doorAddress.entrance}
                  onChange={(e) => setDoorAddress((prev) => ({ ...prev, entrance: e.target.value }))}
                  className={cn(
                    'form-input min-h-[44px] w-full rounded-lg text-base',
                    isSprintTheme && 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400'
                  )}
                  placeholder="Необязательно"
                />
              </div>

              <div>
                <label
                  htmlFor="cdek-door-floor"
                  className={cn('mb-1 block text-sm font-medium', isSprintTheme ? 'text-slate-200' : 'text-gray-700')}
                >
                  Этаж
                </label>
                <input
                  id="cdek-door-floor"
                  type="text"
                  value={doorAddress.floor}
                  onChange={(e) => setDoorAddress((prev) => ({ ...prev, floor: e.target.value }))}
                  className={cn(
                    'form-input min-h-[44px] w-full rounded-lg text-base',
                    isSprintTheme && 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400'
                  )}
                  placeholder="Необязательно"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="cdek-door-intercom"
                  className={cn('mb-1 block text-sm font-medium', isSprintTheme ? 'text-slate-200' : 'text-gray-700')}
                >
                  Домофон
                </label>
                <input
                  id="cdek-door-intercom"
                  type="text"
                  value={doorAddress.intercom}
                  onChange={(e) => setDoorAddress((prev) => ({ ...prev, intercom: e.target.value }))}
                  className={cn(
                    'form-input min-h-[44px] w-full rounded-lg text-base',
                    isSprintTheme && 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400'
                  )}
                  placeholder="Необязательно"
                />
              </div>
            </div>
          </div>
        ) : null}

          <div className={cn('rounded-2xl border p-6 xl:p-8 2xl:p-10 3xl:p-12 4xl:p-16 5xl:p-20 6xl:p-24', isSprintTheme ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white')}>
            <Heading2 className={cn('mb-4 xl:mb-6 2xl:mb-8 3xl:mb-10 4xl:mb-12 5xl:mb-16 6xl:mb-20', isSprintTheme && 'text-slate-100')}>
              Контактные данные
            </Heading2>
            <div className="space-y-3 xl:space-y-4 2xl:space-y-5 3xl:space-y-6 4xl:space-y-7 5xl:space-y-8 6xl:space-y-10">
              <div>
                <label htmlFor="cart-full-name" className={cn('mb-1 block text-sm font-medium', isSprintTheme ? 'text-slate-200' : 'text-gray-700')}>Имя</label>
                <input
                  id="cart-full-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                  }}
                  className={cn(
                    'form-input min-h-[44px] w-full rounded-lg text-base',
                    isSprintTheme && 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400'
                  )}
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div>
                <label htmlFor="cart-phone" className={cn('mb-1 block text-sm font-medium', isSprintTheme ? 'text-slate-200' : 'text-gray-700')}>Телефон</label>
                <input
                  id="cart-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, phone: applyPhoneMask(e.target.value) }))
                    if (phoneError) setPhoneError(null)
                  }}
                  onBlur={() => {
                    const result = validatePhoneRu(formData.phone)
                    setPhoneError(
                      result.valid ? null : ('message' in result ? result.message : null)
                    )
                  }}
                  className={cn(
                    'form-input min-h-[44px] w-full rounded-lg text-base',
                    phoneError ? 'border-red-500 focus:ring-red-500' : '',
                    isSprintTheme && 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400'
                  )}
                  placeholder="+7 (999) 999-99-99"
                  aria-invalid={!!phoneError}
                  aria-describedby={phoneError ? 'cart-phone-error' : undefined}
                />
                {phoneError && (
                  <p id="cart-phone-error" className="mt-1 text-sm text-red-600" role="alert">
                    {phoneError}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="cart-email" className={cn('mb-1 block text-sm font-medium', isSprintTheme ? 'text-slate-200' : 'text-gray-700')}>Email</label>
                <input
                  id="cart-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                    if (emailError) setEmailError(null)
                  }}
                  onBlur={() => {
                    const result = validateEmail(formData.email)
                    setEmailError(
                      result.valid ? null : ('message' in result ? result.message : null)
                    )
                  }}
                  className={cn(
                    'form-input min-h-[44px] w-full rounded-lg text-base',
                    emailError ? 'border-red-500 focus:ring-red-500' : '',
                    isSprintTheme && 'border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400'
                  )}
                  placeholder="example@mail.ru"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'cart-email-error' : undefined}
                />
                {emailError && (
                  <p id="cart-email-error" className="mt-1 text-sm text-red-600" role="alert">
                    {emailError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={cn('rounded-2xl border p-6 xl:p-8 2xl:p-10 3xl:p-12 4xl:p-16 5xl:p-20 6xl:p-24', isSprintTheme ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-gray-200 bg-white')}>
            <Heading2 className={cn('mb-4 xl:mb-6 2xl:mb-8 3xl:mb-10 4xl:mb-12 5xl:mb-16 6xl:mb-20', isSprintTheme && 'text-slate-100')}>
              Итого
            </Heading2>
            <dl className="space-y-2 xl:space-y-3 2xl:space-y-4 3xl:space-y-5 4xl:space-y-6 5xl:space-y-8 6xl:space-y-10 text-sm">
              <div className="flex justify-between">
                <span className={cn(isSprintTheme ? 'text-slate-300' : 'text-gray-600')}>
                  {discount > 0 ? 'Стоимость товаров (до скидки)' : 'Товары'}
                </span>
                <span>{subtotal.toLocaleString('ru-RU')} ₽</span>
              </div>
              {discount > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Скидка по промокоду</span>
                    <span>-{discount.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className={cn('flex justify-between', isSprintTheme ? 'text-slate-300' : 'text-gray-600')}>
                    <span>Стоимость товаров со скидкой</span>
                    <span>{total.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </>
              )}
              {(deliveryMethod === 'cdek_pvz' || deliveryMethod === 'cdek_door') && (
                <>
                  <div className={cn('flex justify-between', isSprintTheme ? 'text-slate-300' : 'text-gray-600')}>
                    <span>
                      Доставка СДЭК ({deliveryMethod === 'cdek_pvz' ? 'до ПВЗ' : 'до двери'})
                    </span>
                    <span>
                      {selectedDeliveryTariff?.deliverySum != null
                        ? `${selectedDeliveryTariff.deliverySum.toLocaleString('ru-RU')} ₽`
                        : `${deliverySum.toLocaleString('ru-RU')} ₽`}
                    </span>
                  </div>
                  {cityCode != null && !deliveryError && (
                    <p
                      className={cn(
                        'mt-0.5 text-xs xl:mt-1 2xl:mt-1.5 3xl:mt-2 4xl:mt-2.5 5xl:mt-3 6xl:mt-4',
                        isSprintTheme ? 'text-slate-400' : 'text-gray-500'
                      )}
                    >
                      Стоимость доставки не зависит от скидки по промокоду.
                    </p>
                  )}
                </>
              )}
              <div className={cn('flex justify-between border-t pt-2 text-lg font-semibold', isSprintTheme ? 'border-slate-700' : 'border-gray-200')}>
                <span>К оплате</span>
                <span>{totalWithDelivery.toLocaleString('ru-RU')} ₽</span>
              </div>
            </dl>
          </div>

        {deliveryError ? (
          <p
            className={cn(
              'text-sm text-center',
              isSprintTheme ? 'text-red-300' : 'text-red-600'
            )}
            role="alert"
          >
            {deliveryError}
          </p>
        ) : null}

        <label className={cn('mb-3 flex items-center justify-center gap-2 text-sm xl:mb-4 xl:gap-3 2xl:mb-5 2xl:gap-4 3xl:mb-6 3xl:gap-5 4xl:mb-8 4xl:gap-6 5xl:mb-10 5xl:gap-8 6xl:mb-12 6xl:gap-10', isSprintTheme ? 'text-slate-200' : 'text-gray-700')}>
          <input
            type="checkbox"
            checked={isPrivacyAccepted}
            onChange={(e) => setIsPrivacyAccepted(e.target.checked)}
            required
            className={cn('h-4 w-4 shrink-0 rounded', isSprintTheme ? 'border-slate-500 bg-slate-800' : 'border-gray-300')}
          />
          <span>
            Ознакомлен(а) с{' '}
            <Link href="/privacy" className={cn('hover:underline', isSprintTheme ? 'text-[#7AA2FF]' : 'text-action-blue')}>
              политикой конфиденциальности
            </Link>
            .
          </span>
        </label>
        <button
          type="submit"
          disabled={submitting || !isPrivacyAccepted}
          className={cn(
            'min-h-[44px] w-full rounded-full py-3 font-medium disabled:opacity-50',
            isSprintTheme ? 'bg-[#7AA2FF] text-slate-950 hover:bg-[#9AB8FF]' : 'bg-action-blue text-gray-800 hover:bg-action-blue/90'
          )}
        >
          {submitting ? 'Оформление...' : 'Оформить заказ'}
        </button>
      </div>
    </form>
  )
}

function CartLineRow({
  line,
  lineTotalAfterPromo,
  isGift = false,
  isSprintTheme = false,
  onRemove,
  onQuantityChange,
}: {
  line: CartLine
  /** Сумма по строке после скидки по промокоду (если применена). */
  lineTotalAfterPromo: number
  isGift?: boolean
  isSprintTheme?: boolean
  onRemove: () => void
  onQuantityChange: (q: number) => void
}) {
  const lineTotalOriginal = (line.price ?? 0) * line.quantity
  const hasDiscount = lineTotalAfterPromo < lineTotalOriginal && lineTotalOriginal > 0
  return (
    <div className={cn('flex gap-4 rounded-xl border p-4 xl:gap-6 xl:p-6 2xl:gap-8 2xl:p-8 3xl:gap-10 3xl:p-10 4xl:gap-12 4xl:p-12 5xl:gap-16 5xl:p-16 6xl:gap-20 6xl:p-20', isSprintTheme ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white')}>
      <div
        className={cn(
          'relative w-20 shrink-0 overflow-hidden rounded-lg aspect-[3/4] border',
          isSprintTheme ? 'border-slate-700 bg-transparent' : 'border-gray-100 bg-transparent'
        )}
      >
        {line.photo ? (
          <Image
            src={line.photo.startsWith('/') ? line.photo : `/${line.photo.replace(/^\//, '')}`}
            alt={line.title ?? ''}
            fill
            className="object-cover object-center"
          />
        ) : (
          <span className="text-action-blue/40 text-2xl m-auto">?</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link
          href={line.slug ? `/product/${line.slug}` : `/product/id/${line.productId}`}
          className={cn('line-clamp-2 font-medium', isSprintTheme ? 'text-slate-100 hover:text-[#7AA2FF]' : 'text-text hover:text-action-blue')}
        >
          {line.title ?? 'Загрузка...'}
        </Link>
        {isGift ? (
          <span
            className={cn(
              'mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              isSprintTheme ? 'bg-emerald-900/40 text-emerald-200' : 'bg-emerald-50 text-emerald-700'
            )}
          >
            Подарок
          </span>
        ) : null}
        <div className="mt-1 flex items-center gap-3">
          <span className={cn(isSprintTheme ? 'text-slate-300' : 'text-gray-600')}>
            {line.price != null
              ? `${line.price.toLocaleString('ru-RU')} ₽ × `
              : '— × '}
            {isGift ? (
              <span className="inline-block w-14 text-center text-base">{line.quantity}</span>
            ) : (
              <input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className={cn('inline-block w-14 rounded border px-1 py-0.5 text-center text-base', isSprintTheme ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-gray-300')}
              />
            )}
          </span>
          {!isGift ? (
            <button type="button" onClick={onRemove} className="text-sm text-red-600 hover:underline">
              Удалить
            </button>
          ) : null}
        </div>
      </div>
      <div className={cn('text-right font-medium', isSprintTheme ? 'text-slate-100' : 'text-text')}>
        {hasDiscount ? (
          <span className="flex flex-col items-end gap-0.5">
            <span className={cn('text-sm line-through', isSprintTheme ? 'text-slate-500' : 'text-gray-400')}>
              {lineTotalOriginal.toLocaleString('ru-RU')} ₽
            </span>
            <span className="text-green-600">
              {lineTotalAfterPromo.toLocaleString('ru-RU')} ₽
            </span>
          </span>
        ) : (
          <span>{lineTotalOriginal.toLocaleString('ru-RU')} ₽</span>
        )}
      </div>
    </div>
  )
}
