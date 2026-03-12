/**
 * Тестовая страница для демонстрации и тестирования адаптивных компонентов
 * Доступна по адресу: /test/adaptive
 */

import { adaptiveTokens, getScaledSize } from '@/lib/adaptive-tokens'

export default function AdaptiveTestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[min(90rem,92vw)] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            🧪 Тестирование адаптивности
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Страница для проверки адаптивных компонентов на разных разрешениях
          </p>
        </div>
      </header>

      <main className="max-w-[min(90rem,92vw)] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Viewport Info */}
        <section className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">📐 Текущий Viewport</h2>
          <ViewportInfo />
        </section>

        {/* Breakpoints Table */}
        <section className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">📊 Брейкпоинты</h2>
          <BreakpointsTable />
        </section>

        {/* Scale Factors */}
        <section className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">📏 Коэффициенты масштабирования</h2>
          <ScaleFactorsDemo />
        </section>

        {/* Container Widths */}
        <section className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">📦 Ширина контейнеров</h2>
          <ContainerWidthsDemo />
        </section>

        {/* Typography Scale */}
        <section className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">🔤 Масштаб типографики</h2>
          <TypographyScaleDemo />
        </section>

        {/* Spacing Scale */}
        <section className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">↔️ Отступы и интервалы</h2>
          <SpacingScaleDemo />
        </section>

        {/* Grid Demo */}
        <section className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">🔲 Адаптивная сетка</h2>
          <GridDemo />
        </section>

        {/* Navigation Demo */}
        <section className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">🧭 Навигация</h2>
          <NavigationDemo />
        </section>

        {/* Touch Targets */}
        <section className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">👆 Touch Targets (44x44px)</h2>
          <TouchTargetsDemo />
        </section>

        {/* Responsive Images */}
        <section className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">🖼️ Адаптивные изображения</h2>
          <ResponsiveImagesDemo />
        </section>

        {/* CSS Variables */}
        <section className="mb-8 p-4 bg-white rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">🎨 CSS-переменные</h2>
          <CSSVariablesDemo />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-[min(90rem,92vw)] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-gray-500 text-center">
            Тестовая страница для проверки адаптивности • Inner Health
          </p>
        </div>
      </footer>
    </div>
  )
}

// ============================================
// КОМПОНЕНТЫ ДЕМО
// ============================================

function ViewportInfo() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-xs text-blue-600 font-medium">Ширина</div>
          <div className="text-xl font-bold text-blue-900" id="viewport-width">
            --
          </div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-xs text-green-600 font-medium">Высота</div>
          <div className="text-xl font-bold text-green-900" id="viewport-height">
            --
          </div>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <div className="text-xs text-purple-600 font-medium">DPR</div>
          <div className="text-xl font-bold text-purple-900" id="viewport-dpr">
            --
          </div>
        </div>
        <div className="p-3 bg-orange-50 rounded-lg">
          <div className="text-xs text-orange-600 font-medium">Брейкпоинт</div>
          <div className="text-xl font-bold text-orange-900" id="viewport-breakpoint">
            --
          </div>
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            function updateViewportInfo() {
              document.getElementById('viewport-width').textContent = window.innerWidth + 'px';
              document.getElementById('viewport-height').textContent = window.innerHeight + 'px';
              document.getElementById('viewport-dpr').textContent = window.devicePixelRatio.toFixed(2);
              
              let bp = 'mobile';
              if (window.innerWidth >= 2560) bp = '4xl';
              else if (window.innerWidth >= 1920) bp = '3xl';
              else if (window.innerWidth >= 1536) bp = '2xl';
              else if (window.innerWidth >= 1280) bp = 'xl';
              else if (window.innerWidth >= 1024) bp = 'lg';
              else if (window.innerWidth >= 768) bp = 'md';
              else if (window.innerWidth >= 640) bp = 'sm';
              
              document.getElementById('viewport-breakpoint').textContent = bp;
            }
            updateViewportInfo();
            window.addEventListener('resize', updateViewportInfo);
          `,
        }}
      />
    </div>
  )
}

function BreakpointsTable() {
  const breakpoints = Object.entries(adaptiveTokens.breakpoints)

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Значение</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Индикатор</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {breakpoints.map(([name, value]) => (
            <tr key={name}>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{name}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{value}px</td>
              <td className="px-4 py-3">
                <div
                  className={`h-2 rounded transition-all duration-300 ${
                    typeof window !== 'undefined' && window.innerWidth >= value
                      ? 'bg-green-500 w-full'
                      : 'bg-gray-200 w-1/4'
                  }`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ScaleFactorsDemo() {
  const factors = Object.entries(adaptiveTokens.scaleFactors)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {factors.map(([name, value]) => (
          <div key={name} className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="text-sm font-medium text-gray-600">{name}</div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div
              className="mt-2 bg-blue-500 rounded"
              style={{ height: `${value * 20}px`, width: `${value * 40}px`, margin: '0 auto' }}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <div className="text-sm font-medium mb-2">Пример масштабирования (база 16px):</div>
        <div className="flex flex-wrap gap-4">
          {factors.map(([name]) => (
            <div key={name} className="text-center">
              <div className="font-bold text-gray-900">
                {name}: {getScaledSize(16, name as 'base')}px
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ContainerWidthsDemo() {
  const widths = Object.entries(adaptiveTokens.containerFixedWidths)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {widths.map(([name, value]) => (
          <div key={name} className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-600">{name}</div>
            <div className="text-xl font-bold text-gray-900">{value}px</div>
            <div
              className="mt-2 bg-green-500 h-4 rounded"
              style={{ width: `${(value / 2560) * 100}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
        <div className="text-sm font-medium mb-2">CSS min() функции:</div>
        <code className="text-xs bg-white p-2 rounded block overflow-x-auto">
          {Object.entries(adaptiveTokens.containerWidths)
            .map(([k, v]) => `${k}: ${v}`)
            .join('; ')}
        </code>
      </div>
    </div>
  )
}

function TypographyScaleDemo() {
  const sizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'] as const
  const multipliers = adaptiveTokens.typography.fontSizeMultipliers

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {sizes.map((size) => (
          <div key={size} className="flex items-center gap-4 p-2 bg-gray-50 rounded">
            <div className="w-16 text-sm font-mono text-gray-500">{size}</div>
            <div className="flex-1">
              <span
                className={`font-medium text-gray-900 ${
                  size === 'xs'
                    ? 'text-xs'
                    : size === 'sm'
                      ? 'text-sm'
                      : size === 'base'
                        ? 'text-base'
                        : size === 'lg'
                          ? 'text-lg'
                          : size === 'xl'
                            ? 'text-xl'
                            : size === '2xl'
                              ? 'text-2xl'
                              : size === '3xl'
                                ? 'text-3xl'
                                : 'text-4xl'
                }`}
              >
                Inner Health
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {multipliers[size]} × 16px = {multipliers[size] * 16}px
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <div className="text-sm font-medium mb-2">Line Heights:</div>
        <div className="flex flex-wrap gap-4">
          {Object.entries(adaptiveTokens.typography.lineHeights).map(([name, value]) => (
            <div key={name} className="text-center p-2 bg-white rounded">
              <div className="text-xs text-gray-500">{name}</div>
              <div className="font-bold">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SpacingScaleDemo() {
  const scale = adaptiveTokens.spacing.scale
  const baseUnit = adaptiveTokens.spacing.baseUnit

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {Object.entries(scale).slice(0, 16).map(([key, multiplier]) => (
          <div key={key} className="text-center">
            <div className="text-xs text-gray-500 mb-1">{key}</div>
            <div
              className="bg-blue-500 rounded mx-auto"
              style={{
                width: `${Math.max(multiplier * baseUnit, 2)}px`,
                height: `${Math.max(multiplier * baseUnit, 2)}px`,
              }}
            />
            <div className="text-xs text-gray-400 mt-1">{multiplier * baseUnit}px</div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <div className="text-sm font-medium mb-2">Adaptive Increments:</div>
        <div className="flex flex-wrap gap-4">
          {Object.entries(adaptiveTokens.spacing.adaptiveIncrements).map(([name, value]) => (
            <div key={name} className="text-center p-3 bg-white rounded">
              <div className="text-xs text-gray-500">{name}</div>
              <div className="font-bold text-lg">+{value}px</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GridDemo() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Сетка 1-4 колонки (mobile → desktop)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 bg-blue-100 rounded-lg text-center">
              <div className="font-bold text-blue-900">Item {i + 1}</div>
              <div className="text-xs text-blue-600">grid-cols responsive</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Auto-fit grid (minmax)</h3>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 bg-green-100 rounded-lg text-center">
              <div className="font-bold text-green-900">Auto {i + 1}</div>
              <div className="text-xs text-green-600">minmax(200px, 1fr)</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Fluid grid с адаптивными колонками</h3>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="p-4 bg-purple-100 rounded-lg text-center">
              <div className="font-bold text-purple-900">Fluid {i + 1}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NavigationDemo() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Десктопная навигация (xl+)</h3>
        <nav className="hidden xl:flex items-center gap-8 p-4 bg-gray-100 rounded-lg">
          {['Каталог', 'О нас', 'Акции', 'Статьи', 'Контакты'].map((item) => (
            <a key={item} href="#" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              {item}
            </a>
          ))}
        </nav>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Мобильная навигация (меньше xl)</h3>
        <div className="xl:hidden p-4 bg-gray-100 rounded-lg">
          <button className="p-2 bg-white rounded shadow text-sm">
            ☰ Меню (видно на меньше чем 1280px)
          </button>
        </div>
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg">
        <div className="text-sm text-yellow-800">
          💡 <strong>Подсказка:</strong> Измените ширину окна, чтобы увидеть переключение между
          мобильной и десктопной навигацией.
        </div>
      </div>
    </div>
  )
}

function TouchTargetsDemo() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <button className="p-2 bg-red-100 text-red-900 rounded text-sm">24px (мало)</button>
        <button className="p-3 bg-yellow-100 text-yellow-900 rounded text-sm">36px (норма)</button>
        <button className="p-4 bg-green-100 text-green-900 rounded text-sm">44px ✓</button>
        <button className="p-5 bg-green-100 text-green-900 rounded text-sm">52px ✓</button>
      </div>

      <div className="p-4 bg-gray-100 rounded-lg">
        <div className="text-sm text-gray-600">
          Минимальный размер touch target: <strong>44×44px</strong> (WCAG 2.1)
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { size: 32, status: 'error' },
          { size: 40, status: 'warning' },
          { size: 44, status: 'success' },
          { size: 48, status: 'success' },
        ].map(({ size, status }) => (
          <div key={size} className="flex flex-col items-center">
            <button
              className={`rounded ${
                status === 'error'
                  ? 'bg-red-500'
                  : status === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
              style={{ width: size, height: size }}
            />
            <div className="mt-2 text-xs text-gray-500">{size}×{size}px</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResponsiveImagesDemo() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Адаптивное изображение</div>
          <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">16:9 aspect ratio</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Квадрат</div>
          <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">1:1 aspect ratio</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-100 rounded-lg">
        <div className="text-sm font-medium mb-2">Размеры на разных брейкпоинтах:</div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>• mobile (320px): ширина 100%</div>
          <div>• tablet (768px): ширина 50%</div>
          <div>• desktop (1024px): ширина 33.333%</div>
          <div>• xl (1280px): ширина 25%</div>
        </div>
      </div>
    </div>
  )
}

function CSSVariablesDemo() {
  const cssVars = [
    { name: '--scale-base', value: '1' },
    { name: '--scale-xl', value: '1.05' },
    { name: '--scale-2xl', value: '1.1' },
    { name: '--scale-3xl', value: '1.15' },
    { name: '--scale-4xl', value: '1.2' },
    { name: '--container-default', value: 'min(90rem, 92vw)' },
    { name: '--container-xl', value: 'min(100rem, 90vw)' },
    { name: '--color-text-primary', value: '#222222' },
    { name: '--color-text-secondary', value: '#6B7280' },
  ]

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Переменная
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Значение
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cssVars.map(({ name, value }) => (
              <tr key={name}>
                <td className="px-4 py-3 text-sm font-mono text-blue-600">{name}</td>
                <td className="px-4 py-3 text-sm font-mono text-gray-900">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-gray-900 rounded-lg">
        <div className="text-sm font-medium text-white mb-2">Пример использования:</div>
        <code className="text-xs text-green-400">
          {`.element {
  font-size: calc(16px * var(--scale-xl));
  max-width: var(--container-xl);
}`}
        </code>
      </div>
    </div>
  )
}
