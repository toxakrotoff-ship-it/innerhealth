'use client'

export default function AdminLeadsExportPage() {
  return (
    <div className="admin-container">
      <div className="admin-content">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Выгрузка лидов</h1>
        <p className="text-gray-500 mb-6">
          Скачайте единый CSV с лидами за выбранный период: заявки с формы «Сотрудничество», заявки с Тильды и быстрые заявки «Купить в 1 клик». В файле: источник, витрина, ФИО, email, телефон, адрес, роль, комментарий, товар, промокод, дата и др. По умолчанию выгрузка соответствует активному бренду в переключателе админки; при необходимости включите все витрины одной выгрузкой.
        </p>

        <div className="card max-w-xl space-y-4">
          <form
            method="GET"
            action="/api/admin/leads/export"
            className="space-y-4"
          >
            <div className="flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <input
                id="leads-export-all-brands"
                type="checkbox"
                name="allBrands"
                value="1"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="leads-export-all-brands" className="text-sm text-gray-700">
                <span className="font-medium">Все витрины</span>
                <span className="block text-xs text-gray-500">
                  Включить лиды Inner Health и Sprint Power в один файл (колонка «Витрина»). Если выключено — только активный бренд в шапке админки.
                </span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Быстрый выбор периода</label>
              <select
                name="preset"
                defaultValue="all"
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">За всё время</option>
                <option value="today">Сегодня</option>
                <option value="last7">За последние 7 дней</option>
                <option value="last30">За последние 30 дней</option>
                <option value="thisMonth">Текущий месяц</option>
                <option value="prevMonth">Прошлый месяц</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Произвольный период</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="block text-xs text-gray-500">С даты (включительно)</span>
                  <input
                    type="date"
                    name="from"
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-xs text-gray-500">По дату (включительно)</span>
                  <input
                    type="date"
                    name="to"
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Можно использовать только пресет, только период или оба вместе. Если выбран пресет, он имеет приоритет над ручным периодом.
              </p>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Выгрузить лидов (CSV)
            </button>
          </form>

          <p className="mt-1 text-sm text-gray-500">
            Файл будет сохранён как leads-YYYY-MM-DD.csv в кодировке UTF-8. Диапазон дат считается по локальному времени, границы включительно.
          </p>
        </div>
      </div>
    </div>
  )
}
