'use client'

export default function DebugStylesPage() {
  return (
    <div className="min-h-screen bg-soft-background">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex">
              {/* Тестовые кнопки без использования Link */}
              <button className="inline-flex items-center px-1 pt-1 border-b-2 border-action-blue text-sm font-medium text-text">
                Управление каталогом
              </button>
              <button className="ml-8 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-gray-300 text-sm font-medium text-gray-500 hover:text-gray-700">
                Лента новостей
              </button>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-text mr-4">Test User</span>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-text mb-4">Отладка стилей</h2>
            <p className="text-text mb-4">Проверяем применение стилей к элементам.</p>
            <div className="flex space-x-4">
              <div className="bg-highlight-blue text-text px-4 py-2 rounded-full">Тестовый элемент с цветом</div>
              <div className="border border-action-blue text-text px-4 py-2 rounded-full">Тестовая граница</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}