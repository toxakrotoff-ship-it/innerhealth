'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()

  useEffect(() => {
    // Перенаправляем на страницу каталога при заходе на /admin
    router.push('/admin/catalog')
  }, [router])

  return null
}