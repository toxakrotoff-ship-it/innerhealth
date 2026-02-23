'use client'

import { createContext, useContext, type ReactNode } from 'react'

export const AdminBasePathContext = createContext<string>('admin')

export function AdminBasePathProvider({
  value,
  children,
}: {
  value: string
  children: ReactNode
}) {
  return (
    <AdminBasePathContext.Provider value={value}>
      {children}
    </AdminBasePathContext.Provider>
  )
}

export function useAdminBasePath(): string {
  return useContext(AdminBasePathContext)
}
