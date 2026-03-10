'use client'

import { useState } from 'react'

export default function TestStylesPage() {
  const [activeTab, setActiveTab] = useState('catalog')

  return (
    <div className="min-h-screen bg-soft-background">
      <header className="admin-header">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-text">Тест стилей</h1>
        </div>
      </header>
      
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex">
              <button
                onClick={() => setActiveTab('catalog')}
                className={`inline-flex items-center px-1 pt-1 border-b-2 ${activeTab === 'catalog' ? 'border-action-blue' : 'border-transparent'} text-sm font-medium ${activeTab === 'catalog' ? 'text-text' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Управление каталогом
              </button>
              <button
                onClick={() => setActiveTab('news')}
                className={`ml-8 inline-flex items-center px-1 pt-1 border-b-2 ${activeTab === 'news' ? 'border-action-blue' : 'border-transparent'} text-sm font-medium ${activeTab === 'news' ? 'text-text' : 'text-gray-500 hover:text-gray-700'}`}
              >
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
            <h2 className="text-xl font-bold text-text mb-4">Тестирование стилей</h2>
            <p className="text-text mb-4">Эта страница демонстрирует применение стилей к навигационному элементу.</p>
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