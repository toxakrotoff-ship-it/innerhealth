'use client'

import Link from 'next/link'
import { useAdminBasePath } from '@/app/admin/context/admin-base-path'

const sections = [
  { path: 'orders', label: 'Заказы (CRM)', description: 'Заказы из корзины' },
  { path: 'quick-orders', label: 'Быстрые заявки', description: 'Заявки «Купить в 1 клик»' },
  { path: 'tilda-leads', label: 'Заявки с Тильды', description: 'Лиды с форм Тильды' },
  { path: 'partnership', label: 'Сотрудничество', description: 'Заявки на сотрудничество' },
  { path: 'leads-export', label: 'Выгрузка лидов', description: 'Экспорт лидов' },
  { path: 'orders-statistics', label: 'Статистика заказов', description: 'Аналитика по заказам' },
]

export default function AdminCrmDashboardPage() {
  const base = useAdminBasePath()

  return (
    <div className="admin-container">
      <div className="admin-page-header">
        <h1>CRM / Заявки и заказы</h1>
        <p>Обзор разделов заявок и заказов</p>
      </div>
      <div className="admin-content">
        <div className="crm-dashboard-grid">
          {sections.map((section) => (
            <Link
              key={section.path}
              href={`/${base}/${section.path}`}
              className="crm-dashboard-card"
            >
              <span className="crm-dashboard-card-title">{section.label}</span>
              <span className="crm-dashboard-card-desc">{section.description}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
