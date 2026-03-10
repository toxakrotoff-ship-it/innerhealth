# Система токенов для адаптивного масштабирования

## Обзор
Система токенов обеспечивает единообразное масштабирование интерфейса на больших экранах (1920px+ и 2560px+). Токены определяют значения для типографики, отступов, контейнеров и других визуальных свойств.

## Структура токенов

### Брейкпоинты
```typescript
breakpoints: {
  sm: 640,    // Мобильные (существующий)
  md: 768,    // Планшеты (существующий)
  lg: 1024,   // Ноутбуки (существующий)
  xl: 1280,   // Десктоп (существующий)
  '2xl': 1536, // Большие десктопы (существующий)
  '3xl': 1920, // Новый: Full HD+
  '4xl': 2560, // Новый: QHD/2K
}
```

### Ширины контейнеров
```typescript
containerWidths: {
  default: 'min(90rem, 92vw)',      // ~1440px на 1600px экране
  xl: 'min(100rem, 90vw)',          // ~1600px на 1920px экране
  '2xl': 'min(110rem, 85vw)',       // ~1760px на 2560px экране
  '3xl': 'min(120rem, 80vw)',       // ~1920px на 2560px экране
  '4xl': 'min(140rem, 75vw)',       // ~2240px на 3840px экране
}
```

### Коэффициенты масштабирования
```typescript
scaleFactors: {
  base: 1,    // Стандартный размер
  xl: 1.05,   // +5% на xl
  '2xl': 1.1, // +10% на 2xl
  '3xl': 1.15,// +15% на 3xl
  '4xl': 1.2, // +20% на 4xl
}
```

### Типографика
```typescript
typography: {
  fontSizeMultipliers: {
    xs: 0.75,    // 12px
    sm: 0.875,   // 14px
    base: 1,     // 16px
    lg: 1.125,   // 18px
    xl: 1.25,    // 20px
    '2xl': 1.5,  // 24px
    '3xl': 1.875, // 30px
    '4xl': 2.25,  // 36px
  },
  lineHeights: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
}
```

### Отступы
```typescript
spacing: {
  baseUnit: 4, // 4px базовый шаг
  scale: {
    0: 0,
    1: 0.25,   // 1px
    2: 0.5,    // 2px
    3: 0.75,   // 3px
    4: 1,      // 4px
    5: 1.25,   // 5px
    6: 1.5,    // 6px
    8: 2,      // 8px
    10: 2.5,   // 10px
    12: 3,     // 12px
    16: 4,     // 16px
    20: 5,     // 20px
    24: 6,     // 24px
    32: 8,     // 32px
    40: 10,    // 40px
    48: 12,    // 48px
    56: 14,    // 56px
    64: 16,    // 64px
  },
  adaptiveIncrements: {
    xl: 1,     // +1px на xl
    '2xl': 2,  // +2px на 2xl
    '3xl': 4,  // +4px на 3xl
    '4xl': 8,  // +8px на 4xl
  },
}
```

## Реализация

### 1. Файл с токенами
Создать файл `src/lib/adaptive-tokens.ts`:

```typescript
/**
 * Система токенов для адаптивного масштабирования на больших экранах
 */
export const adaptiveTokens = {
  // ... структура токенов как выше
} as const

// Утилитарные функции
export function getContainerWidth(breakpoint = 'default') {
  return adaptiveTokens.containerWidths[breakpoint]
}

export function getScaledSize(baseSize: number, breakpoint = 'base') {
  const factor = adaptiveTokens.scaleFactors[breakpoint]
  return Math.round(baseSize * factor)
}

// Генерация CSS переменных
export function generateCSSVariables() {
  const variables: Record<string, string> = {}
  // ... генерация переменных
  return variables
}
```

### 2. Интеграция с Tailwind
Обновить `tailwind.config.ts`:

```typescript
import { adaptiveTokens } from './src/lib/adaptive-tokens'

const config: Config = {
  theme: {
    extend: {
      screens: {
        '3xl': `${adaptiveTokens.breakpoints['3xl']}px`,
        '4xl': `${adaptiveTokens.breakpoints['4xl']}px`,
      },
      maxWidth: {
        'container-3xl': adaptiveTokens.containerWidths['3xl'],
        'container-4xl': adaptiveTokens.containerWidths['4xl'],
      },
      spacing: {
        // Добавить адаптивные отступы
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '38': '9.5rem',
      },
      fontSize: {
        // Адаптивные размеры шрифтов
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
    },
  },
}
```

### 3. CSS переменные
Добавить в `src/app/globals.css`:

```css
:root {
  /* Контейнеры */
  --container-default: min(90rem, 92vw);
  --container-xl: min(100rem, 90vw);
  --container-2xl: min(110rem, 85vw);
  --container-3xl: min(120rem, 80vw);
  --container-4xl: min(140rem, 75vw);
  
  /* Коэффициенты масштабирования */
  --scale-base: 1;
  --scale-xl: 1.05;
  --scale-2xl: 1.1;
  --scale-3xl: 1.15;
  --scale-4xl: 1.2;
  
  /* Адаптивные отступы */
  --spacing-adaptive-xl: 1px;
  --spacing-adaptive-2xl: 2px;
  --spacing-adaptive-3xl: 4px;
  --spacing-adaptive-4xl: 8px;
}

/* Адаптивные утилитарные классы */
.scale-text {
  font-size: calc(1rem * var(--scale-base));
}

@media (min-width: 1920px) {
  .scale-text {
    font-size: calc(1rem * var(--scale-3xl));
  }
}

@media (min-width: 2560px) {
  .scale-text {
    font-size: calc(1rem * var(--scale-4xl));
  }
}
```

## Использование в компонентах

### Пример 1: Адаптивный контейнер
```tsx
import { adaptiveTokens } from '@/lib/adaptive-tokens'

function AdaptiveContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-[--container-default] 
                    xl:max-w-[--container-xl] 
                    2xl:max-w-[--container-2xl] 
                    3xl:max-w-[--container-3xl] 
                    4xl:max-w-[--container-4xl]">
      {children}
    </div>
  )
}
```

### Пример 2: Адаптивная типографика
```tsx
function ProductTitle({ title }: { title: string }) {
  return (
    <h1 className="text-2xl lg:text-3xl 3xl:text-4xl 4xl:text-[2.5rem] 
                   leading-tight 3xl:leading-snug">
      {title}
    </h1>
  )
}
```

### Пример 3: Адаптивные отступы
```tsx
function ProductCard({ product }: { product: Product }) {
  return (
    <div className="p-4 lg:p-6 3xl:p-8 4xl:p-10 
                    gap-3 lg:gap-4 3xl:gap-6">
      {/* Контент карточки */}
    </div>
  )
}
```

## Правила применения

### 1. Прогрессивное улучшение
- Все изменения должны быть аддитивными (добавлять новые стили, а не заменять существующие)
- Мобильная версия остается неизменной
- Изменения применяются только на соответствующих брейкпоинтах

### 2. Консистентность
- Использовать одни и те же токены для одинаковых элементов
- Применять одинаковые коэффициенты масштабирования для родственных компонентов
- Документировать исключения из правил

### 3. Производительность
- Избегать сложных вычислений в CSS (использовать предварительно рассчитанные значения)
- Минимизировать количество медиа-запросов
- Использовать CSS переменные для динамических значений

## Тестирование токенов

### 1. Визуальное тестирование
```typescript
// Тест на соответствие значений
import { adaptiveTokens } from '@/lib/adaptive-tokens'

describe('Adaptive Tokens', () => {
  test('container widths should increase progressively', () => {
    const widths = Object.values(adaptiveTokens.containerWidths)
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeGreaterThan(widths[i - 1])
    }
  })
})
```

### 2. Регрессионное тестирование
- Скриншотные тесты на разных разрешениях
- Проверка отсутствия горизонтального скролла
- Валидация доступности (контрастность, размер текста)

### 3. Интеграционное тестирование
```typescript
// Проверка интеграции с Tailwind
import config from '../tailwind.config'

test('Tailwind config includes custom breakpoints', () => {
  expect(config.theme.extend.screens['3xl']).toBe('1920px')
  expect(config.theme.extend.screens['4xl']).toBe('2560px')
})
```

## Миграционный план

### Этап 1: Подготовка
1. Создать файл с токенами
2. Обновить Tailwind конфигурацию
3. Добавить CSS переменные

### Этап 2: Пилотное внедрение
1. Обновить 1-2 ключевых компонента (ProductPageContent, SiteHeader)
2. Провести тестирование на разных разрешениях
3. Собрать обратную связь

### Этап 3: Полное внедрение
1. Постепенно обновить остальные компоненты
2. Создать документацию для разработчиков
3. Интегрировать в процесс сборки

## Часто задаваемые вопросы

### Q: Как добавить новый брейкпоинт?
A: Добавить значение в `breakpoints`, обновить `containerWidths` и `scaleFactors`, добавить экран в Tailwind конфигурацию.

### Q: Что делать, если элемент не должен масштабироваться?
A: Использовать класс `scale-100` или явно указать фиксированные размеры.

### Q: Как тестировать на реальных устройствах?
A: Использовать DevTools Device Mode с кастомными разрешениями, либо физические мониторы с соответствующими разрешениями.

### Q: Как обрабатывать очень большие экраны (5K+)?
A: Добавить брейкпоинт `5xl` в систему токенов с соответствующими значениями.

## Заключение
Система токенов обеспечивает структурированный подход к адаптивному масштабированию. Ключевые преимущества:
- **Единообразие**: Все компоненты используют одни и те же токены
- **Поддерживаемость**: Легко обновлять значения в одном месте
- **Масштабируемость**: Просто добавлять новые брейкпоинты
- **Производительность**: Оптимизированные CSS-решения

Рекомендуется начать с базовой реализации и постепенно расширять систему по мере необходимости.