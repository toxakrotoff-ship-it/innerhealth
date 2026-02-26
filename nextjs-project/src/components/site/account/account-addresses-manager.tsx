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

export function AccountAddressesManager({ initialAddresses }: { initialAddresses: AccountAddress[] }) {
  const [addresses, setAddresses] = useState<AccountAddress[]>(initialAddresses)
  const [createForm, setCreateForm] = useState<AddressFormState>(initialFormState)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<AddressFormState>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const reachedAddressLimit = useMemo(() => addresses.length >= 3, [addresses.length])

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
  }

  function renderForm(
    form: AddressFormState,
    setForm: Dispatch<SetStateAction<AddressFormState>>
  ) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={form.label}
          onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
          placeholder="Название (Дом, Офис...)"
        />
        <Input
          value={form.city}
          onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
          placeholder="Город"
        />
        <Input
          value={form.cdekCityCode}
          onChange={(event) => setForm((prev) => ({ ...prev, cdekCityCode: event.target.value }))}
          placeholder="Код города CDEK"
        />
        <Input
          value={form.addressLine}
          onChange={(event) => setForm((prev) => ({ ...prev, addressLine: event.target.value }))}
          placeholder="Адрес строкой"
        />

        <label className="flex flex-col gap-1 text-sm text-gray-600">
          Способ доставки
          <select
            value={form.deliveryMethod}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                deliveryMethod: event.target.value as 'cdek_pvz' | 'cdek_door',
              }))
            }
            className="h-10 rounded-[16px] border border-input bg-white px-3 text-sm"
          >
            <option value="cdek_pvz">CDEK ПВЗ</option>
            <option value="cdek_door">CDEK до двери</option>
          </select>
        </label>

        <Input
          value={form.cdekPvzCode}
          onChange={(event) => setForm((prev) => ({ ...prev, cdekPvzCode: event.target.value }))}
          placeholder="Код ПВЗ (для cdek_pvz)"
        />

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
          {renderForm(createForm, setCreateForm)}
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
                  {renderForm(editForm, setEditForm)}
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
