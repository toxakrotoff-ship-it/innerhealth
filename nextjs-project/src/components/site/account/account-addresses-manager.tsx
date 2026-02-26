'use client'

import { useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import Input from '@/components/ui/input'
import Button from '@/components/ui/button'

export interface AccountAddress {
  id: string
  label: string
  city: string
  postalCode: string | null
  addressLine: string
  deliveryMethod: 'cdek_pvz' | 'cdek_door'
  cdekCityCode: number
  cdekPvzCode: string | null
  street: string | null
  house: string | null
  apartment: string | null
  entrance: string | null
  floor: string | null
  intercom: string | null
}

interface AddressFormState {
  label: string
  city: string
  postalCode: string
  addressLine: string
  deliveryMethod: 'cdek_pvz' | 'cdek_door'
  cdekCityCode: string
  cdekPvzCode: string
  street: string
  house: string
  apartment: string
  entrance: string
  floor: string
  intercom: string
}

interface CdekCityOption {
  code: number
  city?: string
  region?: string
}

interface CdekPvzOption {
  code?: string
  name?: string
  address?: string
  full_address?: string
}

interface CdekLookupUiState {
  cityQuery: string
  cityOptions: CdekCityOption[]
  isCitiesLoading: boolean
  pvzQuery: string
  pvzOptions: CdekPvzOption[]
  isPvzLoading: boolean
  pvzError: string | null
}

const initialFormState: AddressFormState = {
  label: '',
  city: '',
  postalCode: '',
  addressLine: '',
  deliveryMethod: 'cdek_pvz',
  cdekCityCode: '',
  cdekPvzCode: '',
  street: '',
  house: '',
  apartment: '',
  entrance: '',
  floor: '',
  intercom: '',
}

function mapAddressToForm(address: AccountAddress): AddressFormState {
  return {
    label: address.label,
    city: address.city,
    postalCode: address.postalCode ?? '',
    addressLine: address.addressLine,
    deliveryMethod: address.deliveryMethod,
    cdekCityCode: String(address.cdekCityCode),
    cdekPvzCode: address.cdekPvzCode ?? '',
    street: address.street ?? '',
    house: address.house ?? '',
    apartment: address.apartment ?? '',
    entrance: address.entrance ?? '',
    floor: address.floor ?? '',
    intercom: address.intercom ?? '',
  }
}

function mapFormToPayload(form: AddressFormState) {
  return {
    label: form.label.trim(),
    city: form.city.trim(),
    postalCode: form.postalCode.trim() || undefined,
    addressLine: form.addressLine.trim(),
    deliveryMethod: form.deliveryMethod,
    cdekCityCode: Number(form.cdekCityCode),
    cdekPvzCode: form.cdekPvzCode.trim() || undefined,
    street: form.street.trim() || undefined,
    house: form.house.trim() || undefined,
    apartment: form.apartment.trim() || undefined,
    entrance: form.entrance.trim() || undefined,
    floor: form.floor.trim() || undefined,
    intercom: form.intercom.trim() || undefined,
  }
}

async function searchCdekCities(query: string): Promise<CdekCityOption[]> {
  if (!query.trim()) return []
  const response = await fetch(`/api/cdek/cities?q=${encodeURIComponent(query.trim())}&size=15`)
  if (!response.ok) return []
  const data = (await response.json().catch(() => null)) as { cities?: CdekCityOption[] } | null
  return Array.isArray(data?.cities) ? data.cities : []
}

async function fetchCdekDeliveryPoints(cityCode: string): Promise<CdekPvzOption[]> {
  if (!cityCode.trim()) return []
  const response = await fetch(
    `/api/cdek/deliverypoints?cityCode=${encodeURIComponent(cityCode)}&type=PVZ&size=50`
  )
  if (!response.ok) return []
  const data = (await response.json().catch(() => null)) as { deliveryPoints?: CdekPvzOption[] } | null
  return Array.isArray(data?.deliveryPoints) ? data.deliveryPoints : []
}

export function AccountAddressesManager({ initialAddresses }: { initialAddresses: AccountAddress[] }) {
  const [addresses, setAddresses] = useState<AccountAddress[]>(initialAddresses)
  const [createForm, setCreateForm] = useState<AddressFormState>(initialFormState)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<AddressFormState>(initialFormState)
  const [createLookup, setCreateLookup] = useState<CdekLookupUiState>({
    cityQuery: '',
    cityOptions: [],
    isCitiesLoading: false,
    pvzQuery: '',
    pvzOptions: [],
    isPvzLoading: false,
    pvzError: null,
  })
  const [editLookup, setEditLookup] = useState<CdekLookupUiState>({
    cityQuery: '',
    cityOptions: [],
    isCitiesLoading: false,
    pvzQuery: '',
    pvzOptions: [],
    isPvzLoading: false,
    pvzError: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const reachedAddressLimit = useMemo(() => addresses.length >= 3, [addresses.length])

  async function runCitySearch(
    lookup: CdekLookupUiState,
    setLookup: Dispatch<SetStateAction<CdekLookupUiState>>
  ) {
    setLookup((prev) => ({ ...prev, isCitiesLoading: true, cityOptions: [] }))
    const options = await searchCdekCities(lookup.cityQuery)
    setLookup((prev) => ({ ...prev, cityOptions: options, isCitiesLoading: false }))
  }

  async function loadPvzOptions(
    cityCode: string,
    setLookup: Dispatch<SetStateAction<CdekLookupUiState>>
  ) {
    setLookup((prev) => ({ ...prev, isPvzLoading: true, pvzError: null, pvzOptions: [] }))
    const points = await fetchCdekDeliveryPoints(cityCode)
    setLookup((prev) => ({
      ...prev,
      pvzOptions: points,
      isPvzLoading: false,
      pvzError: points.length === 0 ? 'Пункты выдачи не найдены для выбранного города.' : null,
    }))
  }

  async function createAddress() {
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const response = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapFormToPayload(createForm)),
      })
      const payload = (await response.json().catch(() => null)) as AccountAddress | { error?: string } | null
      if (!response.ok) {
        const message = payload && 'error' in payload ? payload.error : 'Не удалось создать адрес'
        setErrorMessage(message ?? 'Не удалось создать адрес')
        return
      }
      if (payload && 'id' in payload) {
        setAddresses((prev) => [payload, ...prev])
        setCreateForm(initialFormState)
        setCreateLookup({
          cityQuery: '',
          cityOptions: [],
          isCitiesLoading: false,
          pvzQuery: '',
          pvzOptions: [],
          isPvzLoading: false,
          pvzError: null,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function deleteAddress(addressId: string) {
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/account/addresses/${addressId}`, { method: 'DELETE' })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        setErrorMessage(payload?.error ?? 'Не удалось удалить адрес')
        return
      }
      setAddresses((prev) => prev.filter((address) => address.id !== addressId))
      if (editingAddressId === addressId) {
        setEditingAddressId(null)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function saveEditedAddress(addressId: string) {
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/account/addresses/${addressId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapFormToPayload(editForm)),
      })
      const payload = (await response.json().catch(() => null)) as AccountAddress | { error?: string } | null
      if (!response.ok) {
        const message = payload && 'error' in payload ? payload.error : 'Не удалось обновить адрес'
        setErrorMessage(message ?? 'Не удалось обновить адрес')
        return
      }
      if (payload && 'id' in payload) {
        setAddresses((prev) => prev.map((address) => (address.id === payload.id ? payload : address)))
        setEditingAddressId(null)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function startEditing(address: AccountAddress) {
    setEditingAddressId(address.id)
    setEditForm(mapAddressToForm(address))
    setEditLookup({
      cityQuery: address.city,
      cityOptions: [],
      isCitiesLoading: false,
      pvzQuery: '',
      pvzOptions: [],
      isPvzLoading: false,
      pvzError: null,
    })
    if (address.deliveryMethod === 'cdek_pvz' && address.cdekCityCode > 0) {
      void loadPvzOptions(String(address.cdekCityCode), setEditLookup)
    }
  }

  function renderForm(
    form: AddressFormState,
    setForm: Dispatch<SetStateAction<AddressFormState>>,
    lookup: CdekLookupUiState,
    setLookup: Dispatch<SetStateAction<CdekLookupUiState>>
  ) {
    const filteredPvzOptions = lookup.pvzQuery.trim()
      ? lookup.pvzOptions.filter((point) => {
          const q = lookup.pvzQuery.trim().toLowerCase()
          const name = (point.name ?? '').toLowerCase()
          const address = (point.address ?? '').toLowerCase()
          const fullAddress = (point.full_address ?? '').toLowerCase()
          const code = (point.code ?? '').toLowerCase()
          return name.includes(q) || address.includes(q) || fullAddress.includes(q) || code.includes(q)
        })
      : lookup.pvzOptions

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={form.label}
          onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
          placeholder="Название (Дом, Офис...)"
        />
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={lookup.cityQuery}
              onChange={(event) =>
                setLookup((prev) => ({ ...prev, cityQuery: event.target.value, cityOptions: [] }))
              }
              placeholder="Город (поиск через CDEK)"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => runCitySearch(lookup, setLookup)}
              disabled={lookup.isCitiesLoading}
            >
              {lookup.isCitiesLoading ? '...' : 'Найти'}
            </Button>
          </div>
          {lookup.cityOptions.length > 0 ? (
            <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2">
              {lookup.cityOptions.map((city) => (
                <button
                  key={`${city.code}-${city.city ?? 'city'}`}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      city: city.city ?? prev.city,
                      cdekCityCode: String(city.code),
                      cdekPvzCode: '',
                      addressLine: '',
                    }))
                    setLookup((prev) => ({
                      ...prev,
                      cityQuery: city.city ?? prev.cityQuery,
                      cityOptions: [],
                      pvzQuery: '',
                    }))
                    void loadPvzOptions(String(city.code), setLookup)
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white"
                >
                  <span className="font-medium">{city.city ?? 'Без названия'}</span>
                  <span className="ml-2 text-xs text-gray-500">({city.code})</span>
                  {city.region ? <span className="ml-2 text-xs text-gray-500">{city.region}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={form.city} readOnly placeholder="Выбранный город" />
            <Input value={form.cdekCityCode} readOnly placeholder="Код города CDEK" />
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Способ доставки
          <select
            value={form.deliveryMethod}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                deliveryMethod: event.target.value as 'cdek_pvz' | 'cdek_door',
                cdekPvzCode: event.target.value === 'cdek_pvz' ? prev.cdekPvzCode : '',
              }))
            }
            className="h-10 rounded-[16px] border border-input bg-white px-3 text-sm"
          >
            <option value="cdek_pvz">CDEK ПВЗ</option>
            <option value="cdek_door">CDEK до двери</option>
          </select>
        </label>

        {form.deliveryMethod === 'cdek_pvz' ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={lookup.pvzQuery}
                onChange={(event) => setLookup((prev) => ({ ...prev, pvzQuery: event.target.value }))}
                placeholder="Поиск ПВЗ (код/название/адрес)"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => loadPvzOptions(form.cdekCityCode, setLookup)}
                disabled={!form.cdekCityCode || lookup.isPvzLoading}
              >
                {lookup.isPvzLoading ? '...' : 'Обновить'}
              </Button>
            </div>
            {lookup.pvzError ? <p className="text-xs text-red-600">{lookup.pvzError}</p> : null}
            {filteredPvzOptions.length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2">
                {filteredPvzOptions.map((point) => {
                  const pointAddress =
                    point.full_address || point.address || point.name || 'Адрес недоступен'
                  return (
                    <button
                      key={`${point.code ?? 'pvz'}-${pointAddress}`}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          cdekPvzCode: point.code ?? '',
                          addressLine: pointAddress,
                        }))
                      }
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white"
                    >
                      <div className="font-medium">{point.name ?? point.code ?? 'ПВЗ'}</div>
                      <div className="text-xs text-gray-600">{pointAddress}</div>
                      {point.code ? <div className="text-xs text-gray-500">Код: {point.code}</div> : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
            <Input value={form.cdekPvzCode} readOnly placeholder="Код ПВЗ" />
            <Input value={form.addressLine} readOnly placeholder="Адрес ПВЗ" />
          </div>
        ) : (
          <Input
            value={form.addressLine}
            onChange={(event) => setForm((prev) => ({ ...prev, addressLine: event.target.value }))}
            placeholder="Адрес строкой"
          />
        )}

        <Input
          value={form.street}
          onChange={(event) => setForm((prev) => ({ ...prev, street: event.target.value }))}
          placeholder="Улица (для cdek_door)"
        />
        <Input
          value={form.house}
          onChange={(event) => setForm((prev) => ({ ...prev, house: event.target.value }))}
          placeholder="Дом (для cdek_door)"
        />
      </div>
    )
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
        <h1 className="text-2xl font-semibold text-text">Мои адреса</h1>
        <p className="mt-2 text-sm text-gray-600">
          Можно сохранить до 3 адресов для быстрого оформления заказа.
        </p>

        <div className="mt-4 space-y-3">
          {renderForm(createForm, setCreateForm, createLookup, setCreateLookup)}
          <Button
            type="button"
            onClick={createAddress}
            disabled={isSubmitting || reachedAddressLimit}
          >
            {reachedAddressLimit ? 'Лимит адресов достигнут' : 'Добавить адрес'}
          </Button>
        </div>

        {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
      </div>

      <div className="space-y-3">
        {addresses.map((address) => {
          const isEditing = editingAddressId === address.id
          return (
            <div key={address.id} className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-5">
              {isEditing ? (
                <div className="space-y-3">
                  {renderForm(editForm, setEditForm, editLookup, setEditLookup)}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => saveEditedAddress(address.id)}
                      disabled={isSubmitting}
                    >
                      Сохранить
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditingAddressId(null)}>
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-text">{address.label}</p>
                    <p className="text-sm text-gray-700">{address.city}</p>
                    <p className="text-sm text-gray-600">{address.addressLine}</p>
                    <p className="text-xs text-gray-500">Метод: {address.deliveryMethod}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => startEditing(address)}>
                      Редактировать
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => deleteAddress(address.id)}
                      disabled={isSubmitting}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
