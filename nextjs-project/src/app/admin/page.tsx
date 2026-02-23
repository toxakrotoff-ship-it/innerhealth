'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminBasePath } from '@/app/admin/context/admin-base-path'

export default function AdminPage() {
  const router = useRouter()
  const base = useAdminBasePath()

  useEffect(() => {
    router.push(`/${base}/catalog`)
  }, [router, base])

  return null
}