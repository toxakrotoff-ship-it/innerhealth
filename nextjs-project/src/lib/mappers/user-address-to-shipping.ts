import type { CdekCityOption, CdekPvzOption, DeliveryMethod } from '@/components/site/delivery-section'

export interface UserAddressForCheckout {
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

export interface MappedCheckoutAddress {
  selectedCity: CdekCityOption
  deliveryMethod: DeliveryMethod
  selectedPvz: CdekPvzOption | null
  doorAddress: {
    street: string
    house: string
    apartment: string
    entrance: string
    floor: string
    intercom: string
  }
  formPatch: {
    address: string
    city: string
    zipCode: string
  }
}

export function mapUserAddressToShipping(address: UserAddressForCheckout): MappedCheckoutAddress {
  const selectedPvz: CdekPvzOption | null =
    address.deliveryMethod === 'cdek_pvz'
      ? {
          code: address.cdekPvzCode ?? undefined,
          full_address: address.addressLine,
          address: address.addressLine,
          name: address.label,
        }
      : null

  return {
    selectedCity: {
      code: address.cdekCityCode,
      city: address.city,
      ...(address.cdekCityUuid ? { city_uuid: address.cdekCityUuid } : {}),
    },
    deliveryMethod: address.deliveryMethod,
    selectedPvz,
    doorAddress: {
      street: address.street ?? '',
      house: address.house ?? '',
      apartment: address.apartment ?? '',
      entrance: address.entrance ?? '',
      floor: address.floor ?? '',
      intercom: address.intercom ?? '',
    },
    formPatch: {
      address: address.addressLine,
      city: address.city,
      zipCode: address.postalCode ?? '',
    },
  }
}
