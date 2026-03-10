# Документация для разработчиков: Адаптивный UI для больших экранов

## Введение

Эта документация описывает систему адаптивного UI для больших экранов (1920px+ и 2560px+), внедренную в проекте Inner Health. Документ предназначен для разработчиков, которые будут создавать или модифицировать компоненты с учетом адаптивности на больших экранах.

## Быстрый старт

### 1. Установка и настройка

Система уже интегрирована в проект. Для начала работы:

1. Убедитесь, что у вас установлены зависимости:
```bash
npm install
```

2. Проверьте, что Tailwind конфигурация содержит новые брейкпоинты:
```javascript
// tailwind.config.ts
screens: {
  '3xl': '1920px',
  '4xl': '2560px',
}
```

3. Импортируйте необходимые компоненты:
```tsx
import { AdaptiveContainer } from '@/components/ui/adaptive-container'
import { FluidGrid } from '@/components/ui/fluid-grid'
import { ResponsiveText } from '@/components/ui/responsive-text'
import { ScalableSpacing } from '@/components/ui/scalable-spacing'
```

### 2. Базовый пример

```tsx
import { AdaptiveContainer, ResponsiveText } from '@/components/ui'

export default function ProductPage() {
  return (
    <AdaptiveContainer>
      <ResponsiveText as="h1" size="3xl" weight="bold">
        Название товара
      </ResponsiveText>
      
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-[1.2fr,1fr] gap-8">
        {/* Контент */}
      </div>
    </AdaptiveContainer>
  )
}
```

## Компоненты

### AdaptiveContainer

Умный контейнер с прогрессивным увеличением ширины.

#### Пропсы
| Пропс | Тип | По умолчанию | Описание |
|-------|-----|--------------|----------|
| `children` | `React.ReactNode` | - | Дочерние элементы |
| `className` | `string` | - | Дополнительные CSS классы |
| `fluid` | `boolean` | `false` | Полная ширина без ограничений |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Размер внутренних отступов |

#### Примеры использования

**Базовое использование:**
```tsx
<AdaptiveContainer>
  <p>Контент будет автоматически масштабироваться</p>
</AdaptiveContainer>
```

**Полноразмерный контейнер:**
```tsx
<AdaptiveContainer fluid padding="lg">
  <HeroSection /> // Занимает всю ширину с увеличенными отступами
</AdaptiveContainer>
```

**Кастомные стили:**
```tsx
<AdaptiveContainer className="bg-gray-50 rounded-xl">
  <SectionContent />
</AdaptiveContainer>
```

### FluidGrid

Адаптивная грид-система с автоматическим количеством колонок.

#### Пропсы
| Пропс | Тип | По умолчанию | Описание |
|-------|-----|--------------|----------|
| `children` | `React.ReactNode` | - | Дочерние элементы |
| `className` | `string` | - | Дополнительные CSS классы |
| `minItemWidth` | `string` | `'min(100%, 300px)'` | Минимальная ширина элемента |
| `gap` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Размер промежутков |
| `columns` | `object` | См. ниже | Количество колонок для разных брейкпоинтов |

**Значения columns по умолчанию:**
```typescript
{
  base: 1,    // < 640px
  sm: 2,      // ≥ 640px
  md: 2,      // ≥ 768px
  lg: 3,      // ≥ 1024px
  xl: 3,      // ≥ 1280px
  '2xl': 4,   // ≥ 1536px
  '3xl': 5,   // ≥ 1920px
  '4xl': 6,   // ≥ 2560px
}
```

#### Примеры использования

**Список товаров:**
```tsx
<FluidGrid
  minItemWidth="min(100%, 280px)"
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

**Галерея изображений:**
```tsx
<FluidGrid
  minItemWidth="min(100%, 200px)"
  gap="sm"
  columns={{
    base: 2,
    sm: 3,
    md: 4,
    lg: 5,
    xl: 6,
    '3xl': 8,
  }}
>
  {images.map(image => (
    <GalleryImage key={image.id} image={image} />
  ))}
</FluidGrid>
```

### ResponsiveText

Компонент для адаптивной типографики.

#### Пропсы
| Пропс | Тип | По умолчанию | Описание |
|-------|-----|--------------|----------|
| `children` | `React.ReactNode` | - | Текстовое содержимое |
| `as` | `'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6' \| 'p' \| 'span'` | `'p'` | HTML-элемент |
| `size` | `'xs' \| 'sm' \| 'base' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| '4xl'` | `'base'` | Размер текста |
| `weight` | `'light' \| 'normal' \| 'medium' \| 'semibold' \| 'bold'` | `'normal'` | Насыщенность шрифта |
| `align` | `'left' \| 'center' \| 'right' \| 'justify'` | `'left'` | Выравнивание текста |
| `color` | `'default' \| 'muted' \| 'primary' \| 'secondary' \| 'accent'` | `'default'` | Цвет текста |
| `className` | `string` | - | Дополнительные CSS классы |

#### Примеры использования

**Заголовок страницы:**
```tsx
<ResponsiveText 
  as="h1" 
  size="3xl" 
  weight="bold" 
  align="center"
  className="mb-8"
>
  Каталог товаров
</ResponsiveText>
```

**Текст параграфа:**
```tsx
<ResponsiveText 
  size="lg" 
  color="muted" 
  className="leading-relaxed"
>
  Этот текст будет автоматически увеличиваться на больших экранах,
  обеспечивая комфортное чтение.
</ResponsiveText>
```

**Мелкий текст:**
```tsx
<ResponsiveText 
  as="span" 
  size="sm" 
  color="secondary"
>
  Дополнительная информация
</ResponsiveText>
```

### ScalableSpacing

Компонент для адаптивных отступов и промежутков.

#### Пропсы
| Пропс | Тип | По умолчанию | Описание |
|-------|-----|--------------|----------|
| `children` | `React.ReactNode` | - | Дочерние элементы |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'` | `'md'` | Размер отступов |
| `axis` | `'x' \| 'y' \| 'both'` | `'both'` | Ось отступов |
| `as` | `keyof JSX.IntrinsicElements` | `'div'` | HTML-элемент |
| `className` | `string` | - | Дополнительные CSS классы |

#### Примеры использования

**Секция с отступами:**
```tsx
<ScalableSpacing size="xl" as="section">
  <HeroContent />
</ScalableSpacing>
```

**Вертикальные отступы:**
```tsx
<ScalableSpacing size="lg" axis="y">
  <ProductDescription />
</ScalableSpacing>
```

**Горизонтальные отступы:**
```tsx
<ScalableSpacing size="md" axis="x" as="nav">
  <NavigationLinks />
</ScalableSpacing>
```

## Хуки

### useBreakpoint

Хук для определения текущего брейкпоинта.

```tsx
import { useBreakpoint, useIsAboveBreakpoint } from '@/hooks/use-breakpoint'

function MyComponent() {
  const breakpoint = useBreakpoint()
  const isLargeScreen = useIsAboveBreakpoint('xl')
  const isVeryLargeScreen = useIsAboveBreakpoint('3xl')

  return (
    <div>
      <p>Текущий брейкпоинт: {breakpoint}</p>
      {isVeryLargeScreen && <LargeScreenOnlyContent />}
    </div>
  )
}
```

### useAdaptiveValue

Хук для адаптивных значений на основе брейкпоинтов.

```tsx
import { useAdaptiveValue } from '@/hooks/use-adaptive-value'

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

  return (
    <div className={`${padding} ${fontSize} bg-white rounded-lg`}>
      Адаптивный контент
    </div>
  )
}
```

## Утилитарные CSS классы

### Контейнеры
```css
.container-adaptive        /* Адаптивный контейнер */
.container-fluid          /* Полноразмерный контейнер */
```

### Отступы
```css
.scale-padding            /* Адаптивные отступы: clamp(1rem, 2vw, 2rem) */
.scale-padding-lg         /* Большие адаптивные отступы */
.scale-padding-xl         /* Очень большие адаптивные отступы */
```

### Гриды
```css
.grid-adaptive            /* Адаптивная сетка с auto-fit */
```

### Текст
```css
.text-scale               /* Адаптивный размер текста */
.text-scale-lg            /* Большой адаптивный текст */
.text-scale-xl            /* Очень большой адаптивный текст */
```

## Практические примеры

### Пример 1: Карточка товара

```tsx
import { ResponsiveText } from '@/components/ui/responsive-text'

function ProductCard({ product }) {
  return (
    <div className="group block h-full w-full">
      <article className="relative flex h-full flex-col rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
        {/* Изображение */}
        <div className="relative aspect-square bg-highlight-blue">
          <Image src={product.image} alt={product.title} fill className="object-contain p-4" />
        </div>
        
        {/* Контент */}
        <div className="flex flex-1 flex-col p-4 lg:p-5 3xl:p-6">
          <ResponsiveText 
            as="h3" 
            size="base" 
            weight="medium"
            className="line-clamp-2 group-hover:text-action-blue"
          >
            {product.title}
          </ResponsiveText>
          
          <ResponsiveText 
            size="sm" 
            color="muted"
            className="mt-1 line-clamp-1"
          >
            {product.brand}
          </ResponsiveText>
          
          <div className="mt-3 lg:mt-4 3xl:mt-5">
            <ResponsiveText 
              as="span" 
              size="lg" 
              weight="semibold"
            >
              {product.price.toLocaleString('ru-RU')} ₽
            </ResponsiveText>
          </div>
          
          {/* Кнопки */}
          <div className="mt-4 lg:mt-5 3xl:mt-6 flex flex-wrap gap-2">
            <button className="px-3 py-2 lg:px-4 lg:py-2.5 3xl:px-5 3xl:py-3 text-sm lg:text-base rounded-full bg-action-blue text-white">
              В корзину
            </button>
            <button className="px-3 py-2 lg:px-4 lg:py-2.5 3xl:px-5 3xl:py-3 text-sm lg:text-base rounded-full border border-gray-300">
              Подробнее
            </button>
          </div>
        </div>
      </article>
    </div>
  )
}
```

### Пример 2: Фильтры каталога

```tsx
import { useBreakpoint } from '@/hooks/use-breakpoint'

function CatalogFilters() {
  const breakpoint = useBreakpoint()
  const isVeryLargeScreen = breakpoint === '3xl' || breakpoint === '4xl'

  return (
    <div className="rounded-2xl bg-white p-4 lg:p-6 3xl:p-8 shadow-sm">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4 3xl:grid-cols-5">
        {/* Поиск - занимает больше места на больших экранах */}
        <div className={isVeryLargeScreen ? 'col-span-2' : 'lg:col-span-2 xl:col-span-2'}>
          <label className="block text-sm 3xl:text-base font-medium text-gray-600 mb-2">
            Поиск товаров
          </label>
          <input 
            type="text" 
            className="w-full h-10 lg:h-11 3xl:h-12 px-4 rounded-lg border border-gray-300"
            placeholder="Название или SKU"
          />
        </div>
        
        {/* Остальные фильтры */}
        <div>
          <label className="block text-sm 3xl:text-base font-medium text-gray-600 mb-2">
            Цена от
          </label>
          <input 
            type="number" 
            className="w-full h-10 lg:h-11 3xl:h-12 px-4 rounded-lg border border-gray-300"
          />
        </div>
        
        {/* ... другие фильтры */}
      </div>
      
      {/* Кнопки фильтров с адаптивными размерами */}
      <div className="mt-6 lg:mt-8 flex flex-wrap gap-3 3xl:gap-4">
        <button className="px-4 py-2.5 lg:px-5 lg:py-3 3xl:px-6 3xl:py-3.5 text-sm lg:text-base rounded-full border border-gray-300">
          Сбросить
        </button>
        <button className="px-4 py-2.5 lg:px-5 lg:py-3 3xl:px-6 3xl:py-3.5 text-sm lg:text-base rounded-full bg-action-blue text-white">
          Применить
        </button>
      </div>
    </div>
  )
}
```

## Лучшие практики

### 1. Прогрессивное улучшение
- Всегда начинайте с мобильной версии
- Добавляйте улучшения для больших экранов через медиа-запросы
- Используйте `@apply` или компоненты для повторяющихся стилей

### 2. Производительность
- Избегайте избыточных медиа-запросов
- Используйте CSS переменные для динамических значений
- Минимизируйте количество перерисовок при ресайзе

### 3. Консистентность
- Используйте одни и те же токены для одинаковых элементов
- Соблюдайте установленные пропорции и соотношения
- Документируйте исключения из правил

### 4. Доступность
- Сохраняйте минимальный размер кликабельных элементов 44×44px
- Обеспечьте достаточный контраст на всех разрешениях
- Тестируйте с увеличением текста до 200%

## Отладка

### 1. DevTools для адаптивности
- Используйте Chrome DevTools → Device Toolbar
- Добавьте кастомные разрешения: 1920×1080, 2560×1440
- Включите эмуляцию медиа-запросов

### 2. Полезные расширения
- **Responsively App**: Одновременный просмотр на всех разрешениях
- **Window Resizer**: Быстрое изменение размера окна браузера
- **VisBug**: Визуальное редактирование и инспектирование

### 3. Логирование брейкпоинтов
```typescript
// Добавьте в глобальные стили для отладки
.debug-breakpoint::after {
  content: 'mobile';
  position: fixed;
  bottom: 10px;
  right: 10px;
  background: red;
  color: white;
  padding: 5px;
  z-index: 9999;
}

@media (min-width: 640px) {
  .debug-breakpoint::after { content: 'sm'; background: orange; }
}

@media (min-width: 768px) {
  .debug-breakpoint::after { content: 'md'; background: yellow; color: black; }
}

@media (min-width: 1024px) {
  .debug-breakpoint::after { content: 'lg'; background: green; }
}

@media (min-width: 1280px) {
  .debug-breakpoint::after { content: 'xl'; background: blue; }
}

@media (min-width: 1536px) {
  .debug-breakpoint::after { content: '2xl'; background: indigo; }
}

@media (min-width: 1920px) {
  .debug-breakpoint::after { content: '3xl'; background: violet; }
}

@media (min-width: 2560px) {
  .debug-breakpoint::after { content: '4xl'; background: purple; }
}
```

## Часто задаваемые вопросы

### Q: Как добавить новый брейкпоинт?
A:
1. Добавьте брейкпоинт в `tailwind.config.ts`:
```javascript
screens: {
  '5xl': '3840px', // 4K
}
```
2. Обновите систему токенов в `src/lib/adaptive-tokens.ts`
3. Добавьте соответствующие CSS переменные
4. Протестируйте на всех компонентах

### Q: Что делать, если компонент не должен масштабироваться?
A: Используйте класс `scale-100` или явно задайте фиксированные размеры:
```tsx
<div className="w-64 h-64"> {/* Фиксированный размер */} </div>
```

### Q: Как тестировать на реальных устройствах?
A:
1. Используйте BrowserStack или LambdaTest для доступа к реальным устройствам
2. Настройте remote debugging через Chrome DevTools
3. Используйте физические мониторы с разными разрешениями

### Q: Как оптимизировать производительность на больших экранах?
A:
1. Используйте `will-change` для элементов с анимациями
2. Минимизируйте количество перерисовок при ресайзе
3. Используйте `contain: layout` для изолированных областей
4. Лениво загружайте тяжелые компоненты для больших экранов

### Q: Как интегрировать с существующими компонентами?
A:
1. Оберните существующий компонент в `AdaptiveContainer`
2. Замените фиксированные размеры на адаптивные классы
3. Используйте `ResponsiveText` вместо `<p>`, `<h1>` и т.д.
4. Постепенно модернизируйте, начиная с наиболее критичных компонентов

## Миграция существующих компонентов

### Шаг 1: Анализ
1. Определите, какие компоненты наиболее критичны для больших экранов
2. Проанализируйте текущие стили и медиа-запросы
3. Составьте план миграции по приоритетам

### Шаг 2: Подготовка
1. Убедитесь, что все зависимости установлены
2. Создайте ветку для миграции
3. Настройте инструменты тестирования

### Шаг 3: Миграция
1. Начните с корневых layout компонентов
2. Постепенно двигайтесь к leaf компонентам
3. После каждого компонента запускайте тесты

### Шаг 4: Тестирование
1. Проведите визуальное тестирование на всех разрешениях
2. Запустите автоматические тесты
3. Соберите обратную связь от пользователей

## Ресурсы

### Документация
- [Tailwind CSS: Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries)
- [Web.dev: Responsive Design](https://web.dev/responsive-web-design-basics/)

### Инструменты
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [Responsively App](https://responsively.app/)
- [BrowserStack](https://www.browserstack.com/)

### Примеры кода
- [Примеры адаптивных компонентов](/examples/adaptive)
- [Тестовые страницы](/test-styles)
- [Storybook компонентов](/storybook)

## Поддержка

### Внутренние каналы
- **Slack**: #frontend-adaptive
- **GitHub**: Issues с тегом `adaptive-ui`
- **Документация**: Конfluence пространство "Адаптивный UI"

### Процесс внесения изменений
1. Создайте issue с описанием изменения
2. Создайте PR с изменениями
3. Пройдите ревью кода
4. Запустите все тесты
5. Получите approval от ответственного

### Экстренные ситуации
При обнаружении критических проблем:
1. Создайте hotfix ветку
2. Исправьте проблему
3. Протестируйте на всех разрешениях
4. Создайте PR с высоким приоритетом

## Заключение

Система адаптивного UI предоставляет мощные инструменты для создания интерфейсов, которые оптимально используют пространство на больших экранах. Следуя рекомендациям из этой документации, вы сможете:

1. **Быстро начать** использовать готовые компоненты
2. **Эффективно разрабатывать** новые адаптивные интерфейсы
3. **Легко поддерживать** существующий код
4. **Гарантировать качество** через автоматическое тестирование

Помните, что адаптивный дизайн — это не только про CSS, но и про пользовательский опыт. Всегда тестируйте свои решения с реальными пользователями и собирайте обратную связь для постоянного улучшения.

Удачи в разработке! 🚀