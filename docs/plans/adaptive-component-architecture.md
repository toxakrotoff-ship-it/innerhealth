# Компонентная архитектура для адаптивных контейнеров

## Обзор
Архитектура предоставляет набор компонентов и утилит для создания адаптивных интерфейсов, которые оптимально используют пространство на больших экранах (1920px+ и 2560px+).

## Основные принципы

### 1. Прогрессивное улучшение
- Мобильная версия остается базовой
- Улучшения добавляются для больших экранов
- Обратная совместимость гарантирована

### 2. Компонентный подход
- Каждый компонент отвечает за свою область адаптивности
- Четкие интерфейсы и пропсы
- Переиспользование логики через хуки

### 3. Производительность
- Минимальное количество медиа-запросов
- CSS-переменные для динамических значений
- Избегание layout thrashing

## Компоненты

### 1. AdaptiveContainer
Умный контейнер с прогрессивным увеличением ширины.

```tsx
// src/components/ui/adaptive-container.tsx
import { cn } from '@/lib/utils'

interface AdaptiveContainerProps {
  children: React.ReactNode
  className?: string
  fluid?: boolean // Полная ширина без ограничений
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
}

export function AdaptiveContainer({
  children,
  className,
  fluid = false,
  padding = 'md',
}: AdaptiveContainerProps) {
  const paddingClasses = {
    none: 'px-0',
    sm: 'px-2 sm:px-4',
    md: 'px-4 sm:px-6 lg:px-8',
    lg: 'px-6 sm:px-8 lg:px-10',
    xl: 'px-8 sm:px-10 lg:px-12',
  }

  return (
    <div
      className={cn(
        'mx-auto',
        paddingClasses[padding],
        fluid
          ? 'w-full'
          : 'max-w-[min(90rem,92vw)] xl:max-w-[min(100rem,90vw)] 2xl:max-w-[min(110rem,85vw)] 3xl:max-w-[min(120rem,80vw)] 4xl:max-w-[min(140rem,75vw)]',
        className
      )}
    >
      {children}
    </div>
  )
}
```

**Использование:**
```tsx
<AdaptiveContainer>
  <h1>Заголовок</h1>
  <p>Контент автоматически масштабируется</p>
</AdaptiveContainer>

<AdaptiveContainer fluid padding="lg">
  <HeroSection /> // Полноразмерный герой с увеличенными отступами
</AdaptiveContainer>
```

### 2. FluidGrid
Адаптивная грид-система с автоматическим количеством колонок.

```tsx
// src/components/ui/fluid-grid.tsx
import { cn } from '@/lib/utils'

interface FluidGridProps {
  children: React.ReactNode
  className?: string
  minItemWidth?: string // Минимальная ширина элемента
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  columns?: {
    base?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    '2xl'?: number
    '3xl'?: number
    '4xl'?: number
  }
}

export function FluidGrid({
  children,
  className,
  minItemWidth = 'min(100%, 300px)',
  gap = 'md',
  columns = {
    base: 1,
    sm: 2,
    md: 2,
    lg: 3,
    xl: 3,
    '2xl': 4,
    '3xl': 5,
    '4xl': 6,
  },
}: FluidGridProps) {
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  }

  // Генерация классов для колонок
  const columnClasses = Object.entries(columns)
    .map(([breakpoint, count]) => {
      if (breakpoint === 'base') return `grid-cols-${count}`
      return `${breakpoint}:grid-cols-${count}`
    })
    .join(' ')

  return (
    <div
      className={cn(
        'grid',
        columnClasses,
        gapClasses[gap],
        className
      )}
      style={
        {
          '--min-item-width': minItemWidth,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}
```

**Использование:**
```tsx
  gap="md"
  columns={{
    base: 2,
    sm: 3,
    lg: 4,
    xl: 5,
    '3xl': 6,
  }}
>
  {relatedProducts.map(product => (
    <ProductCard key={product.id} product={product} />
  ))}
</FluidGrid>
</section>
)}
</AdaptiveContainer>
)
}
```

### 2. CatalogControls
```tsx
// Обновленная версия с адаптивными улучшениями
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { useBreakpoint } from '@/hooks/use-breakpoint'

export function CatalogControls({ /* пропсы */ }) {
const breakpoint = useBreakpoint()
const isVeryLargeScreen = breakpoint === '3xl' || breakpoint === '4xl'

return (
<AdaptiveContainer>
<div className="mb-8">
<div className="mb-3 flex justify-end">
<button className="...">
  Поиск и фильтры
</button>
</div>

{isOpen && (
<section className="rounded-2xl bg-white p-6 3xl:p-8 shadow-sm">
  {/* Адаптивная сетка фильтров */}
  <div className="grid grid-cols-1 gap-4
                lg:grid-cols-[1.4fr,1fr,1fr,1fr,auto]
                xl:grid-cols-[1.6fr,1fr,1fr,1fr,auto]
                3xl:grid-cols-[1.8fr,1fr,1fr,1fr,auto]">
    {/* Поля фильтров с увеличенными размерами на больших экранах */}
    <div className="3xl:space-y-2">
      <label className="block text-sm 3xl:text-base font-medium text-gray-600">
        Поиск по названию и SKU
      </label>
      <input className="form-input w-full h-10 3xl:h-12" />
    </div>
    
    {/* Остальные поля фильтров */}
  </div>

  {/* Бренды с адаптивным расположением */}
  <div className="mt-6 3xl:mt-8">
    <p className="text-sm 3xl:text-base font-medium text-gray-600 mb-3">
      Бренд
    </p>
    <div className="flex flex-wrap gap-2 3xl:gap-3">
      {brandOptions.map(brand => (
        <button
          key={brand}
          className={`px-4 py-2 3xl:px-5 3xl:py-2.5 text-sm 3xl:text-base rounded-full border ${/* стили */}`}
        >
          {brand}
        </button>
      ))}
    </div>
  </div>

  {/* Кнопки с увеличенными размерами */}
  <div className="mt-6 3xl:mt-8 flex flex-wrap gap-3 3xl:gap-4">
    <button className="px-5 py-2.5 3xl:px-6 3xl:py-3 text-sm 3xl:text-base">
      Сбросить фильтры
    </button>
    <button className="px-5 py-2.5 3xl:px-6 3xl:py-3 text-sm 3xl:text-base">
      Применить
    </button>
  </div>
</section>
)}
</div>
</AdaptiveContainer>
)
}
```

### 3. SiteHeader
```tsx
// Обновленный хедер с адаптивными улучшениями
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { ResponsiveText } from '@/components/ui/responsive-text'

export async function SiteHeader() {
return (
<header className="sticky top-0 z-100 w-full border-b bg-white/70 backdrop-blur-md">
<AdaptiveContainer>
<div className="h-16 3xl:h-20 flex items-center justify-between">
{/* Логотип с адаптивным размером */}
<div className="flex items-center gap-8 lg:gap-12 3xl:gap-16">
  <ResponsiveText
    as="span"
    size="lg"
    weight="semibold"
    className="uppercase tracking-tighter"
  >
    INNER HEALTH
  </ResponsiveText>
  
  {/* Навигация с увеличенными отступами */}
  <nav className="hidden lg:flex items-center gap-8 3xl:gap-12">
    {NAV_LINKS.map(({ label, href }) => (
      <a
        key={href}
        href={href}
        className="text-xs 3xl:text-sm font-medium uppercase tracking-widest hover:text-slate-900"
      >
        {label}
      </a>
    ))}
  </nav>
</div>

{/* Контакты и иконки с адаптивными размерами */}
<div className="flex items-center gap-3 sm:gap-4 3xl:gap-6">
  <div className="hidden sm:flex flex-col items-end mr-4 3xl:mr-6">
    <a href="tel:..." className="text-sm 3xl:text-base font-medium">
      +7 (989) 103-91-92
    </a>
    <span className="text-xs 3xl:text-sm text-slate-400">
      Ежедневно 9:00 — 21:00
    </span>
  </div>
  
  <div className="flex items-center gap-1 3xl:gap-2">
    {/* Иконки с увеличенными размерами на 3xl+ */}
    <a className="p-2 3xl:p-3 rounded-full hover:bg-slate-100">
      <PhoneIcon className="w-5 h-5 3xl:w-6 3xl:h-6" />
    </a>
    {/* ... другие иконки */}
  </div>
  
  <HeaderCartButton />
  <HeaderProfileMenu />
</div>
</div>
</AdaptiveContainer>
</header>
)
}
```

## Стратегия внедрения

### Этап 1: Базовые компоненты
1. Создать `AdaptiveContainer` и интегрировать его в корневой layout
2. Обновить Tailwind конфигурацию с новыми брейкпоинтами
3. Добавить CSS переменные для адаптивных значений

### Этап 2: Критичные страницы
1. Обновить `ProductPageContent` с использованием новых компонентов
2. Модернизировать `CatalogControls` для больших экранов
3. Улучшить `SiteHeader` и `SiteFooter`

### Этап 3: Второстепенные компоненты
1. Обновить `ProductCard` с адаптивными размерами
2. Модернизировать списки товаров и категорий
3. Оптимизировать административные интерфейсы

### Этап 4: Оптимизация и тестирование
1. Провести тестирование на разных разрешениях
2. Оптимизировать производительность
3. Создать документацию для разработчиков

## Правила использования

### 1. Когда использовать компоненты
- **AdaptiveContainer**: Для всех основных секций и layout контейнеров
- **FluidGrid**: Для списков товаров, карточек, галерей
- **ScalableSpacing**: Для секций с адаптивными отступами
- **ResponsiveText**: Для всей типографики, особенно заголовков

### 2. Когда использовать хуки
- **useBreakpoint**: Когда нужна логика, зависящая от размера экрана
- **useAdaptiveValue**: Для динамических значений в компонентах

### 3. Когда использовать CSS классы
- Для мелких, одноразовых адаптивных изменений
- Для утилитарных стилей, которые используются в нескольких местах
- Для быстрых прототипов и экспериментов

## Производительность

### Оптимизации
1. **Минимизация медиа-запросов**: Использовать CSS переменные вместо множества медиа-запросов
2. **Ленивая загрузка**: Динамически импортировать компоненты для больших экранов только когда нужно
3. **Кэширование**: Кэшировать вычисления брейкпоинтов в хуках
4. **CSS-в-JS**: Использовать CSS-in-JS решения для динамических стилей только когда необходимо

### Мониторинг
1. **Core Web Vitals**: Отслеживать CLS, LCP, FID на разных разрешениях
2. **Производительность рендеринга**: Мониторить FPS на анимациях при ресайзе
3. **Использование памяти**: Контролировать утечки памяти в хуках

## Заключение

Предложенная компонентная архитектура обеспечивает:

### Преимущества
1. **Консистентность**: Все компоненты используют единую систему токенов
2. **Поддерживаемость**: Четкое разделение ответственности между компонентами
3. **Масштабируемость**: Легко добавлять новые брейкпоинты и адаптивные поведения
4. **Производительность**: Оптимизированные решения для больших экранов

### Рекомендации по внедрению
1. Начинать с наиболее посещаемых страниц (главная, карточка товара, каталог)
2. Проводить A/B тестирование ключевых метрик (конверсия, время на сайте)
3. Собирать обратную связь от пользователей с большими мониторами
4. Постепенно расширять покрытие, отслеживая производительность

### Дальнейшее развитие
1. Добавить поддержку темной темы с адаптивными цветами
2. Интегрировать с дизайн-системой (Storybook, Chromatic)
3. Создать визуальный редактор для настройки адаптивных параметров
4. Добавить автоматическое тестирование на разных разрешениях

Архитектура готова к немедленному внедрению и обеспечит значительное улучшение пользовательского опыта на больших экранах.
  gap="lg"
  columns={{
    base: 1,
    sm: 2,
    lg: 3,
    xl: 4,
    '3xl': 5,
    '4xl': 6,
  }}
>
  {products.map(product => (
    <ProductCard key={product.id} product={product} />
  ))}
</FluidGrid>
```

### 3. ScalableSpacing
Компонент для адаптивных отступов и промежутков.

```tsx
// src/components/ui/scalable-spacing.tsx
import { cn } from '@/lib/utils'

interface ScalableSpacingProps {
  children?: React.ReactNode
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  axis?: 'x' | 'y' | 'both'
  as?: keyof JSX.IntrinsicElements
}

export function ScalableSpacing({
  children,
  className,
  size = 'md',
  axis = 'both',
  as: Component = 'div',
}: ScalableSpacingProps) {
  const sizeClasses = {
    xs: 'p-1 sm:p-2 lg:p-3',
    sm: 'p-2 sm:p-3 lg:p-4',
    md: 'p-4 sm:p-5 lg:p-6 3xl:p-8',
    lg: 'p-6 sm:p-7 lg:p-8 3xl:p-10 4xl:p-12',
    xl: 'p-8 sm:p-9 lg:p-10 3xl:p-12 4xl:p-16',
    '2xl': 'p-10 sm:p-12 lg:p-14 3xl:p-16 4xl:p-20',
  }

  const axisClasses = {
    x: 'py-0',
    y: 'px-0',
    both: '',
  }

  return (
    <Component
      className={cn(
        sizeClasses[size],
        axisClasses[axis],
        className
      )}
    >
      {children}
    </Component>
  )
}
```

**Использование:**
```tsx
<ScalableSpacing size="lg" axis="y">
  <SectionContent /> // Вертикальные отступы увеличиваются на больших экранах
</ScalableSpacing>

<ScalableSpacing as="section" size="xl">
  <HeroSection /> // Отступы со всех сторон
</ScalableSpacing>
```

### 4. ResponsiveText
Компонент для адаптивной типографики.

```tsx
// src/components/ui/responsive-text.tsx
import { cn } from '@/lib/utils'

interface ResponsiveTextProps {
  children: React.ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
  align?: 'left' | 'center' | 'right' | 'justify'
  color?: 'default' | 'muted' | 'primary' | 'secondary' | 'accent'
}

export function ResponsiveText({
  children,
  className,
  as: Component = 'p',
  size = 'base',
  weight = 'normal',
  align = 'left',
  color = 'default',
}: ResponsiveTextProps) {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base lg:text-lg 3xl:text-xl',
    lg: 'text-lg lg:text-xl 3xl:text-2xl',
    xl: 'text-xl lg:text-2xl 3xl:text-3xl',
    '2xl': 'text-2xl lg:text-3xl 3xl:text-4xl',
    '3xl': 'text-3xl lg:text-4xl 3xl:text-[2.5rem]',
    '4xl': 'text-4xl lg:text-[2.5rem] 3xl:text-[3rem]',
  }

  const weightClasses = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  }

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  }

  const colorClasses = {
    default: 'text-text',
    muted: 'text-gray-600',
    primary: 'text-action-blue',
    secondary: 'text-gray-700',
    accent: 'text-orange-600',
  }

  return (
    <Component
      className={cn(
        sizeClasses[size],
        weightClasses[weight],
        alignClasses[align],
        colorClasses[color],
        className
      )}
    >
      {children}
    </Component>
  )
}
```

**Использование:**
```tsx
<ResponsiveText as="h1" size="3xl" weight="bold" align="center">
  Заголовок увеличивается на больших экранах
</ResponsiveText>

<ResponsiveText size="lg" color="muted">
  Текст параграфа с адаптивным размером
</ResponsiveText>
```

## Хуки

### 1. useBreakpoint
Хук для определения текущего брейкпоинта.

```tsx
// src/hooks/use-breakpoint.ts
import { useEffect, useState } from 'react'

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
  '4xl': 2560,
} as const

type Breakpoint = keyof typeof breakpoints

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('sm')

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      let current: Breakpoint = 'sm'

      for (const [key, value] of Object.entries(breakpoints)) {
        if (width >= value) {
          current = key as Breakpoint
        }
      }

      setBreakpoint(current)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return breakpoint
}

// Дополнительные утилиты
export function useIsAboveBreakpoint(breakpoint: Breakpoint): boolean {
  const current = useBreakpoint()
  const breakpointValues = Object.keys(breakpoints) as Breakpoint[]
  const currentIndex = breakpointValues.indexOf(current)
  const targetIndex = breakpointValues.indexOf(breakpoint)
  return currentIndex >= targetIndex
}

export function useIsBelowBreakpoint(breakpoint: Breakpoint): boolean {
  return !useIsAboveBreakpoint(breakpoint)
}
```

**Использование:**
```tsx
function MyComponent() {
  const breakpoint = useBreakpoint()
  const isLargeScreen = useIsAboveBreakpoint('xl')
  const isVeryLargeScreen = useIsAboveBreakpoint('3xl')

  return (
    <div>
      <p>Текущий брейкпоинт: {breakpoint}</p>
      {isVeryLargeScreen && <LargeScreenContent />}
    </div>
  )
}
```

### 2. useAdaptiveValue
Хук для адаптивных значений на основе брейкпоинтов.

```tsx
// src/hooks/use-adaptive-value.ts
import { useBreakpoint } from './use-breakpoint'

type AdaptiveValues<T> = Partial<Record<Breakpoint, T>> & { default: T }

export function useAdaptiveValue<T>(values: AdaptiveValues<T>): T {
  const breakpoint = useBreakpoint()
  return values[breakpoint] || values.default
}

// Пример использования
function MyComponent() {
  const padding = useAdaptiveValue({
    default: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
    '3xl': 'p-10',
    '4xl': 'p-12',
  })

  const fontSize = useAdaptiveValue({
    default: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '3xl': 'text-2xl',
  })

  return <div className={`${padding} ${fontSize}`}>Контент</div>
}
```

## Утилитарные CSS классы

### Глобальные стили
Добавить в `src/app/globals.css`:

```css
/* Адаптивные контейнеры */
.container-adaptive {
  @apply mx-auto px-4 sm:px-6 lg:px-8;
  max-width: min(90rem, 92vw);
}

@screen xl {
  .container-adaptive {
    max-width: min(100rem, 90vw);
  }
}

@screen 2xl {
  .container-adaptive {
    max-width: min(110rem, 85vw);
  }
}

@screen 3xl {
  .container-adaptive {
    max-width: min(120rem, 80vw);
  }
}

@screen 4xl {
  .container-adaptive {
    max-width: min(140rem, 75vw);
  }
}

/* Адаптивные отступы */
.scale-padding {
  padding: clamp(1rem, 2vw, 2rem);
}

.scale-padding-lg {
  padding: clamp(1.5rem, 3vw, 3rem);
}

.scale-padding-xl {
  padding: clamp(2rem, 4vw, 4rem);
}

/* Адаптивные гриды */
.grid-adaptive {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: clamp(1rem, 2vw, 2rem);
}

@screen 3xl {
  .grid-adaptive {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 350px), 1fr));
  }
}

@screen 4xl {
  .grid-adaptive {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
  }
}

/* Адаптивная типографика */
.text-scale {
  font-size: clamp(1rem, 1vw, 1.25rem);
}

.text-scale-lg {
  font-size: clamp(1.25rem, 1.5vw, 1.75rem);
}

.text-scale-xl {
  font-size: clamp(1.5rem, 2vw, 2.5rem);
}
```

## Примеры интеграции

### 1. ProductPageContent
```tsx
// Обновленная версия с использованием новых компонентов
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ResponsiveText } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'

export function ProductPageContent({ product, relatedProducts }) {
  return (
    <AdaptiveContainer>
      <ScalableSpacing size="lg" axis="y">
        <div className="grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-[1.2fr,1fr] gap-8 3xl:gap-12">
          {/* Левая колонка: галерея */}
          <ProductMediaGallery />
          
          {/* Правая колонка: информация */}
          <div>
            <ResponsiveText as="h1" size="3xl" weight="bold">
              {product.title}
            </ResponsiveText>
            
            <ResponsiveText size="lg" color="muted" className="mt-4">
              {product.description}
            </ResponsiveText>
            
            {/* Кнопки и действия */}
            <div className="mt-8 flex flex-wrap gap-4 3xl:gap-6">
              <AddToCartButton />
              <WishlistButton />
            </div>
          </div>
        </div>
      </ScalableSpacing>

      {/* Связанные товары */}
      {relatedProducts.length > 0 && (
        <section className="mt-12 3xl:mt-16">
          <ResponsiveText as="h2" size="2xl" weight="semibold" className="mb-6 3xl:mb-8">
            С этим товаром покупают
          </ResponsiveText>
          
          <FluidGrid
            minItemWidth="min(100%, 280px)"
