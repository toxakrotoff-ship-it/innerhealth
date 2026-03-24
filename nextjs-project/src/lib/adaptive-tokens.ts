/**
 * Система токенов для адаптивного масштабирования на больших экранах
 * 
 * Токены определяют значения для различных брейкпоинтов, позволяя
 * единообразно масштабировать интерфейс на экранах 1920px+, 2560px+, 3840px+ и 5120px+
 * 
 * Поддержка сверхбольших экранов (5K+): 5143px × 3086px и выше
 */

export const adaptiveTokens = {
  // Брейкпоинты (в пикселях)
  // 5xl (3840px) - 4K UHD мониторы
  // 6xl (5120px) - 5K мониторы и сверхбольшие экраны
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
    '3xl': 1920,
    '4xl': 2560,
    '5xl': 3840, // Новый: 4K UHD
    '6xl': 5120, // Новый: 5K и сверхбольшие экраны
  },

  // Процентные ширины контейнеров для стабильных боковых полей.
  // На всех размерах экрана сохраняем одинаковую долю "воздуха" по краям.
  containerWidths: {
    default: '92vw',
    xl: 'min(92vw, 240vh)',
    '2xl': 'min(92vw, 235vh)',
    '3xl': 'min(92vw, 225vh)',
    '4xl': 'min(92vw, 215vh)',
    '5xl': 'min(92vw, 205vh)',
    '6xl': 'min(92vw, 195vh)',
  },

  // Фиксированные ширины контейнеров (в пикселях) согласно стратегии
  // Оптимальная ширина контента для комфортного чтения
  containerFixedWidths: {
    default: 1440,
    xl: 1440,
    '2xl': 1600,
    '3xl': 1920,
    '4xl': 2240,
    '5xl': 2880,  // Оптимально для 4K (3840px)
    '6xl': 3840,  // Оптимально для 5K (5120px)
  },

  // Коэффициенты масштабирования для типографики и отступов
  // Прогрессивное увеличение для сохранения пропорций
  scaleFactors: {
    base: 1,
    xl: 1.05,
    '2xl': 1.1,
    '3xl': 1.15,
    '4xl': 1.2,
    '5xl': 1.3,  // +30% на 4K экранах
    '6xl': 1.4,  // +40% на 5K экранах
  },

  // Адаптивные значения для типографики
  typography: {
    // Множители для базового размера шрифта (16px)
    fontSizeMultipliers: {
      xs: 0.75,    // 12px
      sm: 0.875,   // 14px
      base: 1,     // 16px
      lg: 1.125,   // 18px
      xl: 1.25,    // 20px
      '2xl': 1.5,  // 24px
      '3xl': 1.875, // 30px
      '4xl': 2.25,  // 36px
      '5xl': 3,     // 48px - для заголовков на 4K+
      '6xl': 3.75,  // 60px - для заголовков на 5K+
    },

    // Линейные высоты
    lineHeights: {
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },

  // Адаптивные отступы и промежутки
  spacing: {
    // Базовый шаг (4px)
    baseUnit: 4,

    // Множители для spacing scale
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
      72: 18,    // 72px -新增 для больших экранов
      80: 20,    // 80px -新增 для 4K+
      96: 24,    // 96px -新增 для 5K+
    },

    // Адаптивные увеличения для больших экранов (в пикселях)
    adaptiveIncrements: {
      xl: 1,
      '2xl': 2,
      '3xl': 4,
      '4xl': 8,
      '5xl': 16,  // +16px на 4K
      '6xl': 24,  // +24px на 5K
    },
  },

  // Цвета для адаптивных состояний
  colors: {
    background: {
      light: '#FFFFFF',
      dark: '#0F172A',
    },
    text: {
      primary: '#222222',
      secondary: '#6B7280',
    },
  },

  // Тени для больших экранов (более мягкие и размытые)
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
    '4xl': '0 45px 80px -20px rgba(0, 0, 0, 0.35)', //新增 для 4K+
    '5xl': '0 60px 100px -25px rgba(0, 0, 0, 0.4)', //新增 для 5K+
  },

  // Параметры сетки для больших экранов
  grid: {
    // Количество колонок для разных брейкпоинтов
    columns: {
      default: 12,
      '3xl': 12,
      '4xl': 16,  // Больше колонок на 4K+
      '5xl': 20,  // Еще больше на 5K+
      '6xl': 24,  // Максимум на сверхбольших
    },
    // Базовый gap для сетки
    baseGap: 24,
    // Множители gap для брейкпоинтов
    gapMultipliers: {
      base: 1,
      xl: 1.1,
      '2xl': 1.2,
      '3xl': 1.3,
      '4xl': 1.4,
      '5xl': 1.5,
      '6xl': 1.6,
    },
  },
} as const

/**
 * Утилитарные функции для работы с адаптивными токенами
 */

/**
 * Возвращает значение контейнера для текущего брейкпоинта
 */
export function getContainerWidth(breakpoint: keyof typeof adaptiveTokens.containerWidths = 'default'): string {
  return adaptiveTokens.containerWidths[breakpoint]
}

/**
 * Возвращает фиксированную ширину контейнера для текущего брейкпоинта
 */
export function getContainerFixedWidth(breakpoint: keyof typeof adaptiveTokens.containerFixedWidths = 'default'): number {
  return adaptiveTokens.containerFixedWidths[breakpoint]
}

/**
 * Рассчитывает адаптивный размер с учетом коэффициента масштабирования
 */
export function getScaledSize(baseSize: number, breakpoint: keyof typeof adaptiveTokens.scaleFactors = 'base'): number {
  const factor = adaptiveTokens.scaleFactors[breakpoint]
  return Math.round(baseSize * factor)
}

/**
 * Рассчитывает адаптивный отступ с учетом инкремента для брейкпоинта
 * @param baseSpacing - базовый отступ в пикселях
 * @param breakpoint - брейкпоинт (null или undefined для base)
 */
export function getAdaptiveSpacing(
  baseSpacing: number,
  breakpoint?: keyof typeof adaptiveTokens.spacing.adaptiveIncrements | null
): number {
  if (!breakpoint) return baseSpacing
  const increment = adaptiveTokens.spacing.adaptiveIncrements[breakpoint]
  return baseSpacing + increment
}

/**
 * Возвращает gap для сетки на указанном брейкпоинте
 */
export function getGridGap(breakpoint: keyof typeof adaptiveTokens.grid.gapMultipliers = 'base'): number {
  const multiplier = adaptiveTokens.grid.gapMultipliers[breakpoint]
  return Math.round(adaptiveTokens.grid.baseGap * multiplier)
}

/**
 * Возвращает количество колонок для сетки на указанном брейкпоинте
 */
export function getGridColumns(breakpoint: keyof typeof adaptiveTokens.grid.columns = 'default'): number {
  return adaptiveTokens.grid.columns[breakpoint]
}

/**
 * Генерирует CSS-переменные для использования в глобальных стилях
 */
export function generateCSSVariables(): Record<string, string> {
  const variables: Record<string, string> = {}

  // Контейнеры
  Object.entries(adaptiveTokens.containerWidths).forEach(([key, value]) => {
    variables[`--container-${key}`] = value
  })

  // Фиксированные ширины контейнеров
  Object.entries(adaptiveTokens.containerFixedWidths).forEach(([key, value]) => {
    variables[`--container-fixed-${key}`] = `${value}px`
  })

  // Коэффициенты масштабирования
  Object.entries(adaptiveTokens.scaleFactors).forEach(([key, value]) => {
    variables[`--scale-${key}`] = value.toString()
  })

  // Цвета
  Object.entries(adaptiveTokens.colors.background).forEach(([key, value]) => {
    variables[`--color-background-${key}`] = value
  })

  Object.entries(adaptiveTokens.colors.text).forEach(([key, value]) => {
    variables[`--color-text-${key}`] = value
  })

  // Адаптивные отступы
  Object.entries(adaptiveTokens.spacing.adaptiveIncrements).forEach(([key, value]) => {
    variables[`--spacing-adaptive-${key}`] = `${value}px`
  })

  // Параметры сетки
  Object.entries(adaptiveTokens.grid.columns).forEach(([key, value]) => {
    variables[`--grid-columns-${key}`] = value.toString()
  })

  return variables
}

/**
 * Хук для использования адаптивных токенов в React компонентах
 */
export function useAdaptiveTokens() {
  return {
    tokens: adaptiveTokens,
    getContainerWidth,
    getContainerFixedWidth,
    getScaledSize,
    getAdaptiveSpacing,
    getGridGap,
    getGridColumns,
  }
}

/**
 * Типы для TypeScript
 */
export type Breakpoint = keyof typeof adaptiveTokens.breakpoints
export type ContainerWidth = keyof typeof adaptiveTokens.containerWidths
export type ContainerFixedWidth = keyof typeof adaptiveTokens.containerFixedWidths
export type ScaleFactor = keyof typeof adaptiveTokens.scaleFactors
export type SpacingScale = keyof typeof adaptiveTokens.spacing.scale
export type GridColumns = keyof typeof adaptiveTokens.grid.columns

// Экспорт типов для использования в других модулях
