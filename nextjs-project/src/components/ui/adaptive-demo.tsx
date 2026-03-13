'use client'

import { AdaptiveContainer } from './adaptive-container'
import { FluidGrid } from './fluid-grid'
import { ResponsiveText, Heading1, Heading2, Heading3, TextBase, TextLG } from './responsive-text'
import { SpacingVertical } from './scalable-spacing'

export function AdaptiveDemo() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <AdaptiveContainer maxWidth="4xl" className="py-8">
        <Heading1 className="mb-8 text-center">
          Демонстрация адаптивной системы
        </Heading1>
        
        <ResponsiveText variant="lg" align="center" className="mb-12 text-gray-600">
          Тестирование компонентов адаптивности на разных разрешениях экрана
        </ResponsiveText>

        {/* Секция 1: Адаптивные контейнеры */}
        <section className="mb-16">
          <Heading2 className="mb-6">Адаптивные контейнеры</Heading2>
          <TextBase className="mb-8 text-gray-600">
            Контейнеры с разной максимальной шириной для больших экранов
          </TextBase>

          <div className="space-y-8">
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <TextLG weight="semibold">Контейнер по умолчанию (1440px)</TextLG>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                  desktop
                </span>
              </div>
              <AdaptiveContainer maxWidth="default" className="bg-white p-6 shadow-md">
                <div className="h-24 rounded-lg bg-linear-to-r from-blue-100 to-cyan-100 flex items-center justify-center">
                  <TextBase>Содержимое контейнера</TextBase>
                </div>
              </AdaptiveContainer>
            </div>

            <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <TextLG weight="semibold">Контейнер 2XL (1600px)</TextLG>
                <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800">
                  2xl (1536px+)
                </span>
              </div>
              <AdaptiveContainer maxWidth="2xl" className="bg-white p-6 shadow-md">
                <div className="h-24 rounded-lg bg-linear-to-r from-purple-100 to-pink-100 flex items-center justify-center">
                  <TextBase>Более широкий контейнер для больших экранов</TextBase>
                </div>
              </AdaptiveContainer>
            </div>

            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <TextLG weight="semibold">Контейнер 4XL (2240px)</TextLG>
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                  4xl (2560px+)
                </span>
              </div>
              <AdaptiveContainer maxWidth="4xl" className="bg-white p-6 shadow-md">
                <div className="h-24 rounded-lg bg-linear-to-r from-green-100 to-emerald-100 flex items-center justify-center">
                  <TextBase>Максимально широкий контейнер для экранов 4K</TextBase>
                </div>
              </AdaptiveContainer>
            </div>
          </div>
        </section>

        {/* Секция 2: Адаптивная сетка */}
        <section className="mb-16">
          <Heading2 className="mb-6">Адаптивная сетка (FluidGrid)</Heading2>
          <TextBase className="mb-8 text-gray-600">
            Количество колонок автоматически увеличивается на больших экранах
          </TextBase>

          <FluidGrid
            cols={1}
            colsTablet={2}
            colsDesktop={3}
            colsXl={4}
            cols2xl={5}
            cols3xl={6}
            cols4xl={8}
            gap={4}
            adaptiveGap
            className="mb-8"
          >
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-linear-to-br from-orange-100 to-amber-100 flex items-center justify-center p-4 shadow-sm"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-800">{i + 1}</div>
                  <TextBase className="text-amber-700">Элемент</TextBase>
                </div>
              </div>
            ))}
          </FluidGrid>

          <div className="rounded-lg bg-gray-800 p-6 text-gray-100">
            <TextLG weight="semibold" className="mb-4">
              Конфигурация сетки:
            </TextLG>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="w-32 text-gray-400">Мобильные:</span>
                <span className="font-mono">1 колонка</span>
              </li>
              <li className="flex items-center">
                <span className="w-32 text-gray-400">Планшет:</span>
                <span className="font-mono">2 колонки (≥768px)</span>
              </li>
              <li className="flex items-center">
                <span className="w-32 text-gray-400">Десктоп:</span>
                <span className="font-mono">3 колонки (≥1024px)</span>
              </li>
              <li className="flex items-center">
                <span className="w-32 text-gray-400">XL:</span>
                <span className="font-mono">4 колонки (≥1280px)</span>
              </li>
              <li className="flex items-center">
                <span className="w-32 text-gray-400">2XL:</span>
                <span className="font-mono">5 колонок (≥1536px)</span>
              </li>
              <li className="flex items-center">
                <span className="w-32 text-gray-400">3XL:</span>
                <span className="font-mono">6 колонок (≥1920px)</span>
              </li>
              <li className="flex items-center">
                <span className="w-32 text-gray-400">4XL:</span>
                <span className="font-mono">8 колонок (≥2560px)</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Секция 3: Адаптивный текст */}
        <section className="mb-16">
          <Heading2 className="mb-6">Адаптивный текст</Heading2>
          <TextBase className="mb-8 text-gray-600">
            Размер текста увеличивается на больших экранах с помощью CSS-переменных
          </TextBase>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <TextLG weight="semibold" className="mb-4">
                С адаптивным масштабированием
              </TextLG>
              <ResponsiveText variant="base" adaptive className="mb-4">
                Этот текст будет увеличиваться на больших экранах. На экране 1920px он будет на 15% больше, а на 2560px — на 20% больше.
              </ResponsiveText>
              <div className="mt-6 rounded-lg bg-blue-50 p-4">
                <TextBase className="font-mono text-blue-800">
                  Использует: --scale-xl: 1.05, --scale-2xl: 1.1, --scale-3xl: 1.15, --scale-4xl: 1.2
                </TextBase>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <TextLG weight="semibold" className="mb-4">
                Без адаптивного масштабирования
              </TextLG>
              <ResponsiveText variant="base" adaptive={false} className="mb-4">
                Этот текст сохраняет фиксированный размер на всех экранах. На больших экранах он может выглядеть слишком мелко.
              </ResponsiveText>
              <div className="mt-6 rounded-lg bg-gray-100 p-4">
                <TextBase className="font-mono text-gray-800">
                  Размер фиксирован: 16px на всех разрешениях
                </TextBase>
              </div>
            </div>
          </div>

          <SpacingVertical size={8} />

          <div className="rounded-xl border border-gray-300 bg-linear-to-r from-gray-50 to-white p-8">
            <Heading3 className="mb-6 text-center">Примеры типографики</Heading3>
            <div className="space-y-6">
              <div className="border-b pb-4">
                <ResponsiveText variant="xs" className="text-gray-500">
                  Очень мелкий текст (12px) → увеличивается на больших экранах
                </ResponsiveText>
              </div>
              <div className="border-b pb-4">
                <ResponsiveText variant="sm" className="text-gray-600">
                  Мелкий текст (14px) → увеличивается на больших экранах
                </ResponsiveText>
              </div>
              <div className="border-b pb-4">
                <ResponsiveText variant="base" className="text-gray-700">
                  Основной текст (16px) → увеличивается на больших экранах
                </ResponsiveText>
              </div>
              <div className="border-b pb-4">
                <ResponsiveText variant="lg" className="text-gray-800">
                  Крупный текст (18px) → увеличивается на больших экранах
                </ResponsiveText>
              </div>
              <div className="border-b pb-4">
                <ResponsiveText variant="xl" weight="semibold" className="text-gray-900">
                  Заголовочный текст (20px) → увеличивается на больших экранах
                </ResponsiveText>
              </div>
              <div>
                <ResponsiveText variant="4xl" weight="bold" className="bg-linear-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Огромный текст (36px) → увеличивается на больших экранах
                </ResponsiveText>
              </div>
            </div>
          </div>
        </section>

        {/* Секция 4: Информация о брейкпоинтах */}
        <section className="rounded-2xl bg-linear-to-br from-gray-900 to-black p-8 text-white">
          <Heading2 className="mb-6 text-white">Система брейкпоинтов</Heading2>
          <TextBase className="mb-8 text-gray-300">
            Новые брейкпоинты для больших экранов, добавленные в Фазе 1
          </TextBase>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-gray-800 p-6">
              <div className="mb-2 text-sm text-gray-400">Брейкпоинт</div>
              <div className="mb-1 font-mono text-xl font-bold">3xl</div>
              <div className="mb-4 text-lg font-semibold">1920px</div>
              <div className="text-sm text-gray-300">Экраны Full HD+ и 2K</div>
            </div>
            
            <div className="rounded-lg bg-gray-800 p-6">
              <div className="mb-2 text-sm text-gray-400">Брейкпоинт</div>
              <div className="mb-1 font-mono text-xl font-bold">4xl</div>
              <div className="mb-4 text-lg font-semibold">2560px</div>
              <div className="text-sm text-gray-300">Экраны QHD и 4K</div>
            </div>
            
            <div className="rounded-lg bg-gray-800 p-6">
              <div className="mb-2 text-sm text-gray-400">Масштаб текста</div>
              <div className="mb-1 font-mono text-xl font-bold">+15%</div>
              <div className="mb-4 text-lg font-semibold">на 3xl</div>
              <div className="text-sm text-gray-300">Увеличение на больших экранах</div>
            </div>
            
            <div className="rounded-lg bg-gray-800 p-6">
              <div className="mb-2 text-sm text-gray-400">Масштаб текста</div>
              <div className="mb-1 font-mono text-xl font-bold">+20%</div>
              <div className="mb-4 text-lg font-semibold">на 4xl</div>
              <div className="text-sm text-gray-300">Максимальное увеличение</div>
            </div>
          </div>
        </section>

        {/* Секция 5: Рекомендации */}
        <section className="mt-16 rounded-2xl bg-linear-to-r from-blue-50 to-cyan-50 p-8">
          <Heading2 className="mb-6">Рекомендации по тестированию</Heading2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <Heading3 className="mb-4">Что проверять</Heading3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="mr-2 mt-1 h-2 w-2 rounded-full bg-blue-500"></span>
                  <TextBase>Контейнеры не должны быть слишком широкими на мобильных</TextBase>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1 h-2 w-2 rounded-full bg-blue-500"></span>
                  <TextBase>Текст должен быть читаемым на всех разрешениях</TextBase>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1 h-2 w-2 rounded-full bg-blue-500"></span>
                  <TextBase>Сетка должна правильно адаптироваться</TextBase>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1 h-2 w-2 rounded-full bg-blue-500"></span>
                  <TextBase>Отступы должны увеличиваться на больших экранах</TextBase>
                </li>
              </ul>
            </div>
            
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <Heading3 className="mb-4">Инструменты тестирования</Heading3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="mr-2 mt-1 h-2 w-2 rounded-full bg-green-500"></span>
                  <TextBase>Инструменты разработчика Chrome/Firefox</TextBase>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1 h-2 w-2 rounded-full bg-green-500"></span>
                  <TextBase>Режим адаптивного дизайна</TextBase>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1 h-2 w-2 rounded-full bg-green-500"></span>
                  <TextBase>Тестирование на реальных устройствах</TextBase>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 mt-1 h-2 w-2 rounded-full bg-green-500"></span>
                  <TextBase>Проверка производительности</TextBase>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </AdaptiveContainer>
    </div>
  )
}