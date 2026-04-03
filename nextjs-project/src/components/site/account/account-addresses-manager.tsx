'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  cdekCityUuid: string | null
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
  cdekCityUuid: string
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
  city_uuid?: string
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
  cdekCityUuid: '',
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
    cdekCityUuid: address.cdekCityUuid ?? '',
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
  const composedDoorAddressLine =
    form.deliveryMethod === 'cdek_door'
      ? [form.street, form.house, form.apartment].map((x) => x.trim()).filter(Boolean).join(', ')
      : ''
  const addressLine =
    form.deliveryMethod === 'cdek_door'
      ? (form.addressLine.trim() || composedDoorAddressLine)
      : form.addressLine.trim()

  return {
    label: form.label.trim(),
    city: form.city.trim(),
    postalCode: form.postalCode.trim() || undefined,
    addressLine,
    deliveryMethod: form.deliveryMethod,
    cdekCityCode: Number(form.cdekCityCode),
    cdekCityUuid: form.cdekCityUuid.trim() || undefined,
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
  const createCityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editCityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  function applySelectedCity(params: {
    city: CdekCityOption
    setForm: Dispatch<SetStateAction<AddressFormState>>
    setLookup: Dispatch<SetStateAction<CdekLookupUiState>>
  }) {
    const { city, setForm, setLookup } = params
    setForm((prev) => ({
      ...prev,
      city: city.city ?? prev.city,
      cdekCityCode: String(city.code),
      cdekCityUuid: city.city_uuid ?? '',
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
  }

  function renderComputedDoorAddressLine(form: AddressFormState): string {
    return [form.street, form.house, form.apartment].map((x) => x.trim()).filter(Boolean).join(', ')
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
          <div className="relative">
            <Input
              value={lookup.cityQuery}
              onChange={(event) =>
                setLookup((prev) => ({ ...prev, cityQuery: event.target.value, cityOptions: [] }))
              }
              placeholder="Город (начните вводить, подберём через CDEK)"
            />
            {lookup.isCitiesLoading ? (
              <div className="mt-1 text-xs text-gray-500">Поиск городов…</div>
            ) : null}
            {lookup.cityOptions.length > 0 ? (
              <div className="absolute z-10 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow">
                {lookup.cityOptions.map((city) => (
                  <button
                    key={`${city.code}-${city.city ?? 'city'}`}
                    type="button"
                    onClick={() => applySelectedCity({ city, setForm, setLookup })}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium">{city.city ?? 'Без названия'}</span>
                    <span className="ml-2 text-xs text-gray-500">({city.code})</span>
                    {city.region ? <span className="ml-2 text-xs text-gray-500">{city.region}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {form.cdekCityCode ? (
            <div className="text-xs text-gray-600">
              Выбран: <span className="font-medium">{form.city || lookup.cityQuery}</span> (код CDEK: {form.cdekCityCode})
            </div>
          ) : null}
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
            </div>
            {lookup.isPvzLoading ? <p className="text-xs text-gray-500">Загружаем ПВЗ…</p> : null}
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
            {form.cdekPvzCode ? (
              <div className="text-xs text-gray-600">
                Выбран ПВЗ: <span className="font-medium">{form.cdekPvzCode}</span>
              </div>
            ) : null}
            <Input value={form.addressLine} readOnly placeholder="Адрес ПВЗ (заполнится после выбора)" />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={form.street}
                onChange={(event) => setForm((prev) => ({ ...prev, street: event.target.value }))}
                placeholder="Улица"
              />
              <Input
                value={form.house}
                onChange={(event) => setForm((prev) => ({ ...prev, house: event.target.value }))}
                placeholder="Дом"
              />
            </div>
            <Input
              value={form.apartment}
              onChange={(event) => setForm((prev) => ({ ...prev, apartment: event.target.value }))}
              placeholder="Квартира / офис (необязательно)"
            />
            <Input
              value={form.addressLine || renderComputedDoorAddressLine(form)}
              readOnly
              placeholder="Адрес (будет сохранён автоматически)"
            />
          </div>
        )}
      </div>
    )
  }

  useEffect(() => {
    if (createCityDebounceRef.current) clearTimeout(createCityDebounceRef.current)
    const q = createLookup.cityQuery.trim()
    if (q.length < 2) {
      setCreateLookup((prev) => ({ ...prev, cityOptions: [], isCitiesLoading: false }))
      return
    }
    createCityDebounceRef.current = setTimeout(() => {
      void runCitySearch({ ...createLookup, cityQuery: q }, setCreateLookup)
    }, 250)
    return () => {
      if (createCityDebounceRef.current) clearTimeout(createCityDebounceRef.current)
    }
  }, [createLookup.cityQuery])

  useEffect(() => {
    if (editCityDebounceRef.current) clearTimeout(editCityDebounceRef.current)
    const q = editLookup.cityQuery.trim()
    if (q.length < 2) {
      setEditLookup((prev) => ({ ...prev, cityOptions: [], isCitiesLoading: false }))
      return
    }
    editCityDebounceRef.current = setTimeout(() => {
      void runCitySearch({ ...editLookup, cityQuery: q }, setEditLookup)
    }, 250)
    return () => {
      if (editCityDebounceRef.current) clearTimeout(editCityDebounceRef.current)
    }
  }, [editLookup.cityQuery])

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-6">
        <h1 className="text-xl font-semibold text-text sm:text-2xl">Мои адреса</h1>
        <p className="mt-2 text-sm text-gray-600">
          Можно сохранить до 3 адресов для быстрого оформления заказа.
        </p>

        <div className="mt-4 space-y-3">
          {renderForm(createForm, setCreateForm, createLookup, setCreateLookup)}
          <Button
            type="button"
            onClick={createAddress}
            disabled={isSubmitting || reachedAddressLimit}
            className="w-full sm:w-auto"
          >
            {reachedAddressLimit ? 'Лимит адресов достигнут' : 'Добавить адрес'}
          </Button>
        </div>

        {errorMessage ? <p className="mt-3 break-words text-sm text-red-600">{errorMessage}</p> : null}
      </div>

      <div className="space-y-3">
        {addresses.map((address) => {
          const isEditing = editingAddressId === address.id
          return (
            <div key={address.id} className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-5">
              {isEditing ? (
                <div className="space-y-3">
                  {renderForm(editForm, setEditForm, editLookup, setEditLookup)}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      onClick={() => saveEditedAddress(address.id)}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      Сохранить
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingAddressId(null)}
                      className="w-full sm:w-auto"
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-text">{address.label}</p>
                    <p className="text-sm text-gray-700">{address.city}</p>
                    <p className="break-words text-sm text-gray-600">{address.addressLine}</p>
                    <p className="text-xs text-gray-500">Метод: {address.deliveryMethod}</p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => startEditing(address)}
                      className="w-full sm:w-auto"
                    >
                      Редактировать
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => deleteAddress(address.id)}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto"
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
