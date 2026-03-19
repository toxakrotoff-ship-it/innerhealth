# Тестирование адаптивности

Комплексная система тестирования адаптивных компонентов Inner Health.

## Структура

```
├── tests/
│   └── adaptive/
│       └── adaptive.spec.ts      # Playwright E2E тесты
├── nextjs-project/
│   ├── src/
│   │   ├── lib/
│   │   │   └── adaptive-tokens.test.ts    # Vitest unit тесты токенов
│   │   ├── hooks/
│   │   │   └── use-overlap-detection.test.ts  # Vitest тесты хуков
│   │   ├── test/
│   │   │   └── setup.ts           # Настройка тестового окружения
│   │   └── app/
│   │       └── test/
│   │           └── adaptive/
│   │               └── page.tsx   # Тестовая страница /test/adaptive
│   └── scripts/
│       └── test-adaptive-enhanced.js  # Скрипт проверки
├── playwright.config.ts           # Конфигурация Playwright
└── vitest.config.ts              # Конфигурация Vitest
```

## Запуск тестов

### Vitest (Unit тесты)

```bash
# Все тесты
npm run test

# Только адаптивные тесты
npm run test:adaptive

# Watch режим
npm run test:watch
```

### Playwright (E2E тесты)

```bash
# Все Playwright тесты
npm run test:playwright

# Только адаптивные тесты
npm run test:playwright:adaptive

# UI режим для отладки
npm run test:playwright:ui
```

### Скрипт проверки

```bash
# Базовая проверка
npm run test:adaptive:check

# Подробный вывод
npm run test:adaptive:verbose
```

## Покрываемые разрешения

| Название | Ширина | Высота | Описание |
|----------|--------|--------|----------|
| mobile | 320px | 568px | iPhone SE |
| tablet | 768px | 1024px | iPad |
| desktop | 1024px | 768px | Малый десктоп |
| xl | 1280px | 720px | Стандартный десктоп |
| 2xl | 1536px | 864px | Большой десктоп |
| 3xl | 1920px | 1080px | Full HD |
| 4xl | 2560px | 1440px | QHD |

## Тестируемые компоненты

### 1. Навигация
- Переключение между мобильным и десктопным меню
- Корректность отображения на разных брейкпоинтах
- Отсутствие одновременного показа обоих меню

### 2. Контейнеры
- Адаптивная ширина контейнеров
- Корректные отступы (padding)
- Масштабирование на больших экранах

### 3. Типографика
- Масштабирование размеров шрифтов
- Корректные line-height
- Читаемость на всех разрешениях

### 4. Сетка (Grid)
- Количество колонок на разных брейкпоинтах
- Адаптивные отступы между элементами
- Fluid grid поведение

### 5. Touch Targets
- Минимальный размер интерактивных элементов (44x44px)
- Доступность на мобильных устройствах

### 6. Overlap Detection
- Обнаружение наложения элементов
- Корректная работа хука useMediaConflictDetection
- Обработка DPI масштабирования

## Тестовая страница

Доступна по адресу: `/test/adaptive`

Содержит:
- Информацию о текущем viewport
- Таблицу брейкпоинтов
- Демонстрацию масштабирования
- Примеры адаптивной сетки
- Проверку touch targets
- CSS-переменные

## Написание новых тестов

### Playwright тест

```typescript
import { test, expect } from '@playwright/test'

test('Мой адаптивный тест', async ({ page }) => {
  // Установка viewport
  await page.setViewportSize({ width: 768, height: 1024 })
  
  // Навигация
  await page.goto('/test/adaptive')
  
  // Проверка
  await expect(page.locator('.my-element')).toBeVisible()
})
```

### Vitest тест

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMyHook } from './my-hook'

describe('Мой хук', () => {
  it('работает корректно', () => {
    const { result } = renderHook(() => useMyHook())
    expect(result.current).toBe(true)
  })
})
```

## Скриншотные тесты

Для визуальной регрессии используются скриншотные тесты:

```typescript
await expect(page.locator('header')).toHaveScreenshot('header-mobile.png', {
  maxDiffPixels: 1000,
  threshold: 0.2,
})
```

## CI/CD интеграция

Тесты автоматически запускаются в CI:

```yaml
- name: Run adaptive tests
  run: npm run test:adaptive:check
  
- name: Run Playwright tests
  run: npm run test:playwright:adaptive
```

## Отладка

### Локальная отладка Playwright

```bash
# UI режим
npm run test:playwright:ui

# Debug режим
npx playwright test --debug

# Конкретный тест
npx playwright test tests/adaptive/adaptive.spec.ts --project=adaptive-mobile
```

### Просмотр отчетов

```bash
# HTML отчет Playwright
npx playwright show-report

# Vitest coverage
npm run test -- --coverage
```

## Лучшие практики

1. **Тестируйте на реальных устройствах** - эмуляторы не всегда точны
2. **Проверяйте touch targets** - минимум 44x44px для мобильных
3. **Тестируйте с высоким DPI** - 1.5x, 2x масштабирование
4. **Проверяйте landscape ориентацию** - особенно для планшетов
5. **Используйте скриншотные тесты** - для визуальной регрессии

## Известные проблемы

### 1. Конфликт медиа-запросов (1024-1279px)
В этом диапазоне могут одновременно показываться мобильное и десктопное меню. Решено через `useMediaConflictDetection`.

### 2. DPI масштабирование
При масштабировании 133-150% на ширине до 1400px возможны конфликты.

## Ссылки

> **Архив:** длинные отчёты (`adaptive-testing-final-report`, `adaptive-test-coverage-expansion-report`, `mobile-desktop-testing-report`, `adaptive-ui-testing-report`) удалены как устаревшие дубликаты; актуальное состояние смотрите по результатам команд тестов выше (обновлено 19.03.2026).

- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [WCAG 2.1 Touch Targets](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
