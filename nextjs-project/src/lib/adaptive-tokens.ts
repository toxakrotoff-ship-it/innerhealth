/**
 * Система токенов для адаптивного масштабирования на больших экранах
 * 
 * Токены определяют значения для различных брейкпоинтов, позволяя
 * единообразно масштабировать интерфейс на экранах 1920px+ и 2560px+
 */

export const adaptiveTokens = {
  // Брейкпоинты (в пикселях)
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
    '3xl': 1920,
    '4xl': 2560,
  },

  // Максимальные ширины контейнеров для каждого брейкпоинта
  containerWidths: {
    default: 'min(90rem, 92vw)',      // ~1440px на 1600px экране
    xl: 'min(100rem, 90vw)',          // ~1600px на 1920px экране
    '2xl': 'min(110rem, 85vw)',       // ~1760px на 2560px экране
    '3xl': 'min(120rem, 80vw)',       // ~1920px на 2560px экране
    '4xl': 'min(140rem, 75vw)',       // ~2240px на 3840px экране
  },

  // Фиксированные ширины контейнеров (в пикселях) согласно стратегии
  containerFixedWidths: {
    default: 1440,
    xl: 1440,
    '2xl': 1600,
    '3xl': 1920,
    '4xl': 2240,
  },

  // Коэффициенты масштабирования для типографики и отступов
  scaleFactors: {
    base: 1,
    xl: 1.05,
    '2xl': 1.1,
    '3xl': 1.15,
    '4xl': 1.2,
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
    },

    // Адаптивные увеличения для больших экранов
    adaptiveIncrements: {
      xl: 1,
      '2xl': 2,
      '3xl': 4,
      '4xl': 8,
    },
  },

  // Цвета для адаптивных состояний (если нужны)
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
 * Рассчитывает адаптивный размер с учетом коэффициента масштабирования
 */
export function getScaledSize(baseSize: number, breakpoint: keyof typeof adaptiveTokens.scaleFactors = 'base'): number {
  const factor = adaptiveTokens.scaleFactors[breakpoint]
  return Math.round(baseSize * factor)
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

  return variables
}

/**
 * Хук для использования адаптивных токенов в React компонентах
 */
export function useAdaptiveTokens() {
  return {
    tokens: adaptiveTokens,
    getContainerWidth,
    getScaledSize,
  }
}

/**
 * Типы для TypeScript
 */
export type Breakpoint = keyof typeof adaptiveTokens.breakpoints
export type ContainerWidth = keyof typeof adaptiveTokens.containerWidths
export type ScaleFactor = keyof typeof adaptiveTokens.scaleFactors

// Экспорт типов для использования в других модулях
