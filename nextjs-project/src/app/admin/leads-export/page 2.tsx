'use client'

export default function AdminLeadsExportPage() {
  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Выгрузка лидов</h1>
        <p className="text-gray-500 mb-6">
          Скачайте единый CSV со всеми лидами: заявки с формы «Сотрудничество», заявки с Тильды и быстрые заявки «Купить в 1 клик». В файле: ФИО, email, телефон, адрес, роль, комментарий, товар, промокод, дата и др.
        </p>

        <div className="card max-w-xl">
          <a
            href="/api/admin/leads/export"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Выгрузить всех лидов (CSV)
          </a>
          <p className="mt-3 text-sm text-gray-500">
            Файл будет сохранён как leads-YYYY-MM-DD.csv в кодировке UTF-8.
          </p>
        </div>
      </div>
    </div>
  )
}
