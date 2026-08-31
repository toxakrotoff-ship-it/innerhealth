'use client'

import Button from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  isSprintTheme?: boolean
}

export function SavedAddressSelector({
  addresses,
  selectedAddressId,
  usingSavedAddress,
  onSelectAddress,
  onUseSavedAddress,
  onUseAnotherAddress,
  isSprintTheme,
}: SavedAddressSelectorProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-6 space-y-4',
        isSprintTheme ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-white'
      )}
    >
      <h2 className={cn('font-semibold text-text text-lg', isSprintTheme && 'text-slate-100')}>
        Сохранённый адрес
      </h2>

      <select
        value={selectedAddressId ?? ''}
        onChange={(event) => onSelectAddress(event.target.value)}
        className={cn(
          'h-11 w-full rounded-[16px] border border-input px-3 text-sm',
          isSprintTheme ? 'border-slate-600 bg-slate-800 text-slate-100' : 'bg-white'
        )}
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
