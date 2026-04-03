'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { BrandId } from '@/lib/brand/brand'

const AdminBrandContext = createContext<BrandId | null>(null)

export function AdminBrandProvider({
  value,
  children,
}: {
  value: BrandId
  children: ReactNode
}) {
  return <AdminBrandContext.Provider value={value}>{children}</AdminBrandContext.Provider>
}

export function useAdminBrand(): BrandId {
  const value = useContext(AdminBrandContext)
  if (!value) {
    throw new Error('useAdminBrand must be used within AdminBrandProvider')
  }
  return value
}
