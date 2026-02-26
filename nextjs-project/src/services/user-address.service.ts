import 'server-only'
import { prisma } from '@/lib/prisma'

const MAX_USER_ADDRESSES = 3

export const USER_ADDRESS_ERROR_CODES = {
  addressLimitExceeded: 'ADDRESS_LIMIT_EXCEEDED',
  addressNotFound: 'ADDRESS_NOT_FOUND',
} as const

export interface UserAddressServiceError extends Error {
  code: (typeof USER_ADDRESS_ERROR_CODES)[keyof typeof USER_ADDRESS_ERROR_CODES]
}

export interface CreateUserAddressInput {
  label: string
  city: string
  postalCode?: string
  addressLine: string
  deliveryMethod: 'cdek_pvz' | 'cdek_door'
  cdekCityCode: number
  cdekPvzCode?: string
  street?: string
  house?: string
  apartment?: string
  entrance?: string
  floor?: string
  intercom?: string
}

export interface UpdateUserAddressInput {
  label?: string
  city?: string
  postalCode?: string
  addressLine?: string
  deliveryMethod?: 'cdek_pvz' | 'cdek_door'
  cdekCityCode?: number
  cdekPvzCode?: string
  street?: string
  house?: string
  apartment?: string
  entrance?: string
  floor?: string
  intercom?: string
}

function createUserAddressError(
  code: UserAddressServiceError['code'],
  message: string
): UserAddressServiceError {
  return Object.assign(new Error(message), { code })
}

export async function listUserAddresses(userId: string) {
  return prisma.userAddress.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function createUserAddress(userId: string, input: CreateUserAddressInput) {
  const total = await prisma.userAddress.count({ where: { userId } })
  if (total >= MAX_USER_ADDRESSES) {
    throw createUserAddressError(
      USER_ADDRESS_ERROR_CODES.addressLimitExceeded,
      'User address limit reached'
    )
  }

  return prisma.userAddress.create({
    data: {
      userId,
      label: input.label,
      city: input.city,
      postalCode: input.postalCode,
      addressLine: input.addressLine,
      deliveryMethod: input.deliveryMethod,
      cdekCityCode: input.cdekCityCode,
      cdekPvzCode: input.cdekPvzCode,
      street: input.street,
      house: input.house,
      apartment: input.apartment,
      entrance: input.entrance,
      floor: input.floor,
      intercom: input.intercom,
    },
  })
}

export async function updateUserAddress(userId: string, addressId: string, input: UpdateUserAddressInput) {
  const existingAddress = await prisma.userAddress.findFirst({
    where: {
      id: addressId,
      userId,
    },
    select: { id: true },
  })

  if (!existingAddress) {
    throw createUserAddressError(USER_ADDRESS_ERROR_CODES.addressNotFound, 'User address not found')
  }

  return prisma.userAddress.update({
    where: { id: addressId },
    data: {
      label: input.label,
      city: input.city,
      postalCode: input.postalCode,
      addressLine: input.addressLine,
      deliveryMethod: input.deliveryMethod,
      cdekCityCode: input.cdekCityCode,
      cdekPvzCode: input.cdekPvzCode,
      street: input.street,
      house: input.house,
      apartment: input.apartment,
      entrance: input.entrance,
      floor: input.floor,
      intercom: input.intercom,
    },
  })
}

export async function deleteUserAddress(userId: string, addressId: string) {
  const existingAddress = await prisma.userAddress.findFirst({
    where: {
      id: addressId,
      userId,
    },
    select: { id: true },
  })

  if (!existingAddress) {
    throw createUserAddressError(USER_ADDRESS_ERROR_CODES.addressNotFound, 'User address not found')
  }

  return prisma.userAddress.delete({
    where: { id: addressId },
  })
}
