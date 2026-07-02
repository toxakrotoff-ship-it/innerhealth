'use client'

import React, { useState, useEffect } from 'react'

interface B2bLead {
  id: string
  name: string
  email: string
  phone: string
  createdAt: string
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

export default function AdminB2bPage() {
  const [leads, setLeads] = useState<B2bLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/b2b')
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
      l.phone.includes(searchTerm)
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
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">B2B</h1>
        <p className="text-gray-500 mb-6">
          Заявки на получение оптовых прайс-листов с сайта.
        </p>

        <div className="card mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Поиск</label>
          <input
            type="text"
            placeholder="Имя, email, телефон"
            className="form-input w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {filteredLeads.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">Нет заявок</div>
        ) : (
          <>
            <div className="md:hidden space-y-4">
              {filteredLeads.map((lead) => (
                <div key={lead.id} className="card p-4">
                  <p className="text-sm text-gray-500">{formatDate(lead.createdAt)}</p>
                  <p className="font-medium text-gray-900 mt-0.5">{lead.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    <a href={`mailto:${lead.email}`} className="text-action-blue hover:underline block">
                      {lead.email}
                    </a>
                    <a
                      href={`tel:${lead.phone.replace(/\s|\(|\)|-/g, '')}`}
                      className="text-gray-600 hover:underline block"
                    >
                      {lead.phone}
                    </a>
                  </p>
                </div>
              ))}
            </div>

            <div className="hidden md:block card overflow-hidden">
              <div className="table-responsive">
                <table className="table table-horizontal">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Имя</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Контакты</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(lead.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{lead.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <a href={`mailto:${lead.email}`} className="text-action-blue hover:underline">
                            {lead.email}
                          </a>
                          <br />
                          <a
                            href={`tel:${lead.phone.replace(/\s|\(|\)|-/g, '')}`}
                            className="text-gray-600 hover:underline"
                          >
                            {lead.phone}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
