'use client'

import React, { useState, useEffect } from 'react'

interface PartnershipLead {
  id: string
  name: string
  email: string
  phone: string
  role: string | null
  socialLinks: string | null
  message: string | null
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  doctor: 'Врач',
  nutritionist: 'Нутрициолог',
  health_coach: 'Health-coach',
  helping_profession: 'Специалист помогающих профессий',
  fitness_trainer: 'Фитнес-тренер',
  cosmetologist: 'Косметолог',
  other: 'Другое',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function roleLabel(role: string | null): string {
  if (!role) return '—'
  return ROLE_LABELS[role] ?? role
}

export default function AdminPartnershipPage() {
  const [leads, setLeads] = useState<PartnershipLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/partnership')
      if (!res.ok) throw new Error('Не удалось загрузить заявки')
      const data = await res.json()
      setLeads(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm) ||
      (l.role && ROLE_LABELS[l.role]?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <p className="text-gray-500">Загрузка заявок...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="admin-content">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Сотрудничество</h1>
        <p className="text-gray-500 mb-6">
          Заявки на сотрудничество с сайта. Имя, контакты, направление и ссылки на соцсети.
        </p>

        <div className="card mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Поиск</label>
          <input
            type="text"
            placeholder="Имя, email, телефон, направление"
            className="form-input w-full max-w-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="card overflow-hidden">
          <div className="table-responsive">
            <table className="table table-horizontal">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Дата
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Имя
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Контакты
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Направление
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20" />
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Нет заявок
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <React.Fragment key={lead.id}>
                      <tr className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(lead.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{lead.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-action-blue hover:underline"
                          >
                            {lead.email}
                          </a>
                          <br />
                          <a href={`tel:${lead.phone.replace(/\s|\(|\)|-/g, '')}`} className="text-gray-600 hover:underline">
                            {lead.phone}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {roleLabel(lead.role)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(expandedId === lead.id ? null : lead.id)
                            }
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            {expandedId === lead.id ? 'Свернуть' : 'Подробнее'}
                          </button>
                        </td>
                      </tr>
                      {expandedId === lead.id && (
                        <tr key={`${lead.id}-detail`} className="bg-gray-50/80">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="grid gap-6 sm:grid-cols-2 text-sm">
                              {lead.socialLinks && (
                                <div>
                                  <h3 className="font-semibold text-gray-700 mb-1">
                                    Ссылки на соцсети
                                  </h3>
                                  <p className="text-gray-600 whitespace-pre-wrap break-all">
                                    {lead.socialLinks}
                                  </p>
                                </div>
                              )}
                              {lead.message && (
                                <div>
                                  <h3 className="font-semibold text-gray-700 mb-1">Сообщение</h3>
                                  <p className="text-gray-600 whitespace-pre-wrap">
                                    {lead.message}
                                  </p>
                                </div>
                              )}
                              {!lead.socialLinks && !lead.message && (
                                <p className="text-gray-400">Дополнительных данных нет</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
