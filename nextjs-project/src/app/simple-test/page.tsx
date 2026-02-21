'use client'

export default function SimpleTestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Простой тест стилей</h1>
      <p className="text-text mb-4">Этот текст должен использовать глобальные стили</p>
      <button className="btn btn-primary">Тестовая кнопка</button>
    </div>
  )
}