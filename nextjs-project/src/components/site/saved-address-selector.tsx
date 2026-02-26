'use client'

import Button from '@/components/ui/button'

export interface SavedAddressOption {
  id: string
  label: string
  city: string
  addressLine: string
  deliveryMethod: 'cdek_pvz' | 'cdek_door'
}

interface SavedAddressSelectorProps {
  addresses: SavedAddressOption[]
  selectedAddressId: string | null
  usingSavedAddress: boolean
  onSelectAddress: (addressId: string) => void
  onUseSavedAddress: () => void
  onUseAnotherAddress: () => void
}

export function SavedAddressSelector({
  addresses,
  selectedAddressId,
  usingSavedAddress,
  onSelectAddress,
  onUseSavedAddress,
  onUseAnotherAddress,
}: SavedAddressSelectorProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <h2 className="font-semibold text-text text-lg">Сохранённый адрес</h2>

      <select
        value={selectedAddressId ?? ''}
        onChange={(event) => onSelectAddress(event.target.value)}
        className="h-11 w-full rounded-[16px] border border-input bg-white px-3 text-sm"
      >
        <option value="" disabled>
          Выберите адрес
        </option>
        {addresses.map((address) => (
          <option key={address.id} value={address.id}>
            {address.label} — {address.city}, {address.addressLine}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap gap-2">
        {!usingSavedAddress ? (
          <Button
            type="button"
            onClick={onUseSavedAddress}
            disabled={!selectedAddressId}
          >
            Использовать сохранённый адрес
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={onUseAnotherAddress}>
            Использовать другой адрес
          </Button>
        )}
      </div>
    </div>
  )
}
