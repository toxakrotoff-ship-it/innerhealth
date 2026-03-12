/**
 * Unit тесты для системы адаптивных токенов
 * Включает тесты для сверхбольших экранов (5xl: 3840px, 6xl: 5120px)
 */

import { describe, it, expect } from 'vitest'
import {
  adaptiveTokens,
  getContainerWidth,
  getContainerFixedWidth,
  getScaledSize,
  getAdaptiveSpacing,
  getGridGap,
  getGridColumns,
  generateCSSVariables,
  useAdaptiveTokens,
  type Breakpoint,
  type ContainerWidth,
  type ContainerFixedWidth,
  type ScaleFactor,
} from './adaptive-tokens'

describe('adaptiveTokens', () => {
  describe('breakpoints', () => {
    it('содержит все необходимые брейкпоинты', () => {
      expect(adaptiveTokens.breakpoints).toHaveProperty('sm')
      expect(adaptiveTokens.breakpoints).toHaveProperty('md')
      expect(adaptiveTokens.breakpoints).toHaveProperty('lg')
      expect(adaptiveTokens.breakpoints).toHaveProperty('xl')
      expect(adaptiveTokens.breakpoints).toHaveProperty('2xl')
      expect(adaptiveTokens.breakpoints).toHaveProperty('3xl')
      expect(adaptiveTokens.breakpoints).toHaveProperty('4xl')
      // Новые брейкпоинты для сверхбольших экранов
      expect(adaptiveTokens.breakpoints).toHaveProperty('5xl')
      expect(adaptiveTokens.breakpoints).toHaveProperty('6xl')
    })

    it('имеет корректные значения брейкпоинтов', () => {
      expect(adaptiveTokens.breakpoints.sm).toBe(640)
      expect(adaptiveTokens.breakpoints.md).toBe(768)
      expect(adaptiveTokens.breakpoints.lg).toBe(1024)
      expect(adaptiveTokens.breakpoints.xl).toBe(1280)
      expect(adaptiveTokens.breakpoints['2xl']).toBe(1536)
      expect(adaptiveTokens.breakpoints['3xl']).toBe(1920)
      expect(adaptiveTokens.breakpoints['4xl']).toBe(2560)
      // Новые брейкпоинты
      expect(adaptiveTokens.breakpoints['5xl']).toBe(3840)  // 4K UHD
      expect(adaptiveTokens.breakpoints['6xl']).toBe(5120)  // 5K
    })

    it('брейкпоинты идут в возрастающем порядке', () => {
      const values = Object.values(adaptiveTokens.breakpoints)
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1])
      }
    })

    it('поддерживает сверхбольшие экраны (5143px × 3086px)', () => {
      // Экран 5143px попадает в диапазон 6xl (5120px+)
      expect(adaptiveTokens.breakpoints['6xl']).toBeLessThanOrEqual(5143)
    })
  })

  describe('containerWidths', () => {
    it('содержит все необходимые ширины контейнеров', () => {
      expect(adaptiveTokens.containerWidths).toHaveProperty('default')
      expect(adaptiveTokens.containerWidths).toHaveProperty('xl')
      expect(adaptiveTokens.containerWidths).toHaveProperty('2xl')
      expect(adaptiveTokens.containerWidths).toHaveProperty('3xl')
      expect(adaptiveTokens.containerWidths).toHaveProperty('4xl')
      // Новые ширины для сверхбольших экранов
      expect(adaptiveTokens.containerWidths).toHaveProperty('5xl')
      expect(adaptiveTokens.containerWidths).toHaveProperty('6xl')
    })

    it('возвращает CSS min() функции для контейнеров', () => {
      expect(adaptiveTokens.containerWidths.default).toContain('min(')
      expect(adaptiveTokens.containerWidths.default).toContain('vw')
    })

    it('новые контейнеры используют корректные значения', () => {
      expect(adaptiveTokens.containerWidths['5xl']).toBe('min(180rem, 70vw)')
      expect(adaptiveTokens.containerWidths['6xl']).toBe('min(240rem, 65vw)')
    })
  })

  describe('containerFixedWidths', () => {
    it('содержит фиксированные ширины в пикселях', () => {
      expect(adaptiveTokens.containerFixedWidths.default).toBe(1440)
      expect(adaptiveTokens.containerFixedWidths.xl).toBe(1440)
      expect(adaptiveTokens.containerFixedWidths['2xl']).toBe(1600)
      expect(adaptiveTokens.containerFixedWidths['3xl']).toBe(1920)
      expect(adaptiveTokens.containerFixedWidths['4xl']).toBe(2240)
      // Новые фиксированные ширины
      expect(adaptiveTokens.containerFixedWidths['5xl']).toBe(2880)
      expect(adaptiveTokens.containerFixedWidths['6xl']).toBe(3840)
    })

    it('ширины контейнеров увеличиваются с ростом брейкпоинта', () => {
      const widths = adaptiveTokens.containerFixedWidths
      expect(widths['2xl']).toBeGreaterThan(widths.xl)
      expect(widths['3xl']).toBeGreaterThan(widths['2xl'])
      expect(widths['4xl']).toBeGreaterThan(widths['3xl'])
      expect(widths['5xl']).toBeGreaterThan(widths['4xl'])
      expect(widths['6xl']).toBeGreaterThan(widths['5xl'])
    })
  })

  describe('scaleFactors', () => {
    it('содержит все коэффициенты масштабирования', () => {
      expect(adaptiveTokens.scaleFactors).toHaveProperty('base')
      expect(adaptiveTokens.scaleFactors).toHaveProperty('xl')
      expect(adaptiveTokens.scaleFactors).toHaveProperty('2xl')
      expect(adaptiveTokens.scaleFactors).toHaveProperty('3xl')
      expect(adaptiveTokens.scaleFactors).toHaveProperty('4xl')
      // Новые коэффициенты
      expect(adaptiveTokens.scaleFactors).toHaveProperty('5xl')
      expect(adaptiveTokens.scaleFactors).toHaveProperty('6xl')
    })

    it('базовый коэффициент равен 1', () => {
      expect(adaptiveTokens.scaleFactors.base).toBe(1)
    })

    it('коэффициенты увеличиваются с ростом брейкпоинта', () => {
      const factors = adaptiveTokens.scaleFactors
      expect(factors.xl).toBeGreaterThan(factors.base)
      expect(factors['2xl']).toBeGreaterThan(factors.xl)
      expect(factors['3xl']).toBeGreaterThan(factors['2xl'])
      expect(factors['4xl']).toBeGreaterThan(factors['3xl'])
      expect(factors['5xl']).toBeGreaterThan(factors['4xl'])
      expect(factors['6xl']).toBeGreaterThan(factors['5xl'])
    })

    it('коэффициенты находятся в разумных пределах', () => {
      const factors = Object.values(adaptiveTokens.scaleFactors)
      factors.forEach(factor => {
        expect(factor).toBeGreaterThanOrEqual(1)
        expect(factor).toBeLessThanOrEqual(1.5) // Максимальное увеличение на 50%
      })
    })

    it('новые коэффициенты для 4K и 5K экранов', () => {
      expect(adaptiveTokens.scaleFactors['5xl']).toBe(1.3)  // +30% на 4K
      expect(adaptiveTokens.scaleFactors['6xl']).toBe(1.4)  // +40% на 5K
    })
  })

  describe('typography', () => {
    it('содержит множители размеров шрифта', () => {
      const multipliers = adaptiveTokens.typography.fontSizeMultipliers
      expect(multipliers.xs).toBe(0.75)
      expect(multipliers.base).toBe(1)
      expect(multipliers['4xl']).toBe(2.25)
      // Новые множители для больших экранов
      expect(multipliers['5xl']).toBe(3)     // 48px
      expect(multipliers['6xl']).toBe(3.75)  // 60px
    })

    it('содержит line-height значения', () => {
      const lineHeights = adaptiveTokens.typography.lineHeights
      expect(lineHeights.tight).toBe(1.25)
      expect(lineHeights.normal).toBe(1.5)
      expect(lineHeights.loose).toBe(2)
    })

    it('line-height значения находятся в допустимых пределах', () => {
      const lineHeights = Object.values(adaptiveTokens.typography.lineHeights)
      lineHeights.forEach(lh => {
        expect(lh).toBeGreaterThanOrEqual(1)
        expect(lh).toBeLessThanOrEqual(2.5)
      })
    })
  })

  describe('spacing', () => {
    it('базовая единица равна 4px', () => {
      expect(adaptiveTokens.spacing.baseUnit).toBe(4)
    })

    it('содержит scale для spacing', () => {
      const scale = adaptiveTokens.spacing.scale
      expect(scale[0]).toBe(0)
      expect(scale[4]).toBe(1)  // 4px
      expect(scale[8]).toBe(2)  // 8px
      expect(scale[16]).toBe(4) // 16px
    })

    it('содержит новые значения spacing для больших экранов', () => {
      const scale = adaptiveTokens.spacing.scale
      expect(scale[72]).toBe(18)  // 72px
      expect(scale[80]).toBe(20)  // 80px
      expect(scale[96]).toBe(24)  // 96px
    })

    it('содержит adaptiveIncrements для больших экранов', () => {
      const increments = adaptiveTokens.spacing.adaptiveIncrements
      expect(increments.xl).toBe(1)
      expect(increments['2xl']).toBe(2)
      expect(increments['3xl']).toBe(4)
      expect(increments['4xl']).toBe(8)
      // Новые инкременты
      expect(increments['5xl']).toBe(16)  // +16px на 4K
      expect(increments['6xl']).toBe(24)  // +24px на 5K
    })
  })

  describe('colors', () => {
    it('содержит цвета фона', () => {
      expect(adaptiveTokens.colors.background.light).toBe('#FFFFFF')
      expect(adaptiveTokens.colors.background.dark).toBe('#0F172A')
    })

    it('содержит цвета текста', () => {
      expect(adaptiveTokens.colors.text.primary).toBe('#222222')
      expect(adaptiveTokens.colors.text.secondary).toBe('#6B7280')
    })
  })

  describe('shadows', () => {
    it('содержит все уровни теней', () => {
      expect(adaptiveTokens.shadows).toHaveProperty('sm')
      expect(adaptiveTokens.shadows).toHaveProperty('md')
      expect(adaptiveTokens.shadows).toHaveProperty('lg')
      expect(adaptiveTokens.shadows).toHaveProperty('xl')
      expect(adaptiveTokens.shadows).toHaveProperty('2xl')
      expect(adaptiveTokens.shadows).toHaveProperty('3xl')
      // Новые тени для больших экранов
      expect(adaptiveTokens.shadows).toHaveProperty('4xl')
      expect(adaptiveTokens.shadows).toHaveProperty('5xl')
    })

    it('тени содержат корректные CSS значения', () => {
      const shadows = Object.values(adaptiveTokens.shadows)
      shadows.forEach(shadow => {
        expect(shadow).toContain('rgba')
        expect(shadow).toContain('px')
      })
    })
  })

  describe('grid', () => {
    it('содержит настройки сетки', () => {
      expect(adaptiveTokens.grid).toHaveProperty('columns')
      expect(adaptiveTokens.grid).toHaveProperty('baseGap')
      expect(adaptiveTokens.grid).toHaveProperty('gapMultipliers')
    })

    it('количество колонок увеличивается для больших экранов', () => {
      const columns = adaptiveTokens.grid.columns
      expect(columns.default).toBe(12)
      expect(columns['4xl']).toBe(16)
      expect(columns['5xl']).toBe(20)
      expect(columns['6xl']).toBe(24)
    })

    it('базовый gap равен 24', () => {
      expect(adaptiveTokens.grid.baseGap).toBe(24)
    })

    it('множители gap увеличиваются', () => {
      const multipliers = adaptiveTokens.grid.gapMultipliers
      expect(multipliers.base).toBe(1)
      expect(multipliers['6xl']).toBe(1.6)
    })
  })
})

describe('getContainerWidth', () => {
  it('возвращает ширину для default брейкпоинта', () => {
    const width = getContainerWidth('default')
    expect(width).toBe('min(90rem, 92vw)')
  })

  it('возвращает ширину для xl брейкпоинта', () => {
    const width = getContainerWidth('xl')
    expect(width).toBe('min(100rem, 90vw)')
  })

  it('возвращает ширину для 4xl брейкпоинта', () => {
    const width = getContainerWidth('4xl')
    expect(width).toBe('min(140rem, 75vw)')
  })

  it('возвращает ширину для 5xl брейкпоинта (4K)', () => {
    const width = getContainerWidth('5xl')
    expect(width).toBe('min(180rem, 70vw)')
  })

  it('возвращает ширину для 6xl брейкпоинта (5K)', () => {
    const width = getContainerWidth('6xl')
    expect(width).toBe('min(240rem, 65vw)')
  })

  it('по умолчанию возвращает default ширину', () => {
    const width = getContainerWidth()
    expect(width).toBe(adaptiveTokens.containerWidths.default)
  })
})

describe('getContainerFixedWidth', () => {
  it('возвращает фиксированную ширину для default', () => {
    expect(getContainerFixedWidth('default')).toBe(1440)
  })

  it('возвращает фиксированную ширину для 5xl', () => {
    expect(getContainerFixedWidth('5xl')).toBe(2880)
  })

  it('возвращает фиксированную ширину для 6xl', () => {
    expect(getContainerFixedWidth('6xl')).toBe(3840)
  })

  it('по умолчанию возвращает default ширину', () => {
    expect(getContainerFixedWidth()).toBe(1440)
  })
})

describe('getScaledSize', () => {
  it('возвращает базовый размер для base scaleFactor', () => {
    const size = getScaledSize(16, 'base')
    expect(size).toBe(16)
  })

  it('масштабирует размер для xl scaleFactor', () => {
    const size = getScaledSize(16, 'xl')
    expect(size).toBe(Math.round(16 * 1.05)) // 17
  })

  it('масштабирует размер для 4xl scaleFactor', () => {
    const size = getScaledSize(16, '4xl')
    expect(size).toBe(Math.round(16 * 1.2)) // 19
  })

  it('масштабирует размер для 5xl scaleFactor (4K)', () => {
    const size = getScaledSize(16, '5xl')
    expect(size).toBe(Math.round(16 * 1.3)) // 21
  })

  it('масштабирует размер для 6xl scaleFactor (5K)', () => {
    const size = getScaledSize(16, '6xl')
    expect(size).toBe(Math.round(16 * 1.4)) // 22
  })

  it('корректно масштабирует дробные размеры', () => {
    const size = getScaledSize(14, '2xl')
    expect(size).toBe(Math.round(14 * 1.1)) // 15
  })

  it('возвращает целое число', () => {
    const size = getScaledSize(13, '3xl')
    expect(Number.isInteger(size)).toBe(true)
  })

  it('по умолчанию использует base scaleFactor', () => {
    const size = getScaledSize(20)
    expect(size).toBe(20)
  })
})

describe('getAdaptiveSpacing', () => {
  it('возвращает базовый отступ без брейкпоинта', () => {
    expect(getAdaptiveSpacing(16)).toBe(16)
  })

  it('возвращает базовый отступ с null', () => {
    expect(getAdaptiveSpacing(16, null)).toBe(16)
  })

  it('добавляет инкремент для xl', () => {
    expect(getAdaptiveSpacing(16, 'xl')).toBe(17) // 16 + 1
  })

  it('добавляет инкремент для 4xl', () => {
    expect(getAdaptiveSpacing(16, '4xl')).toBe(24) // 16 + 8
  })

  it('добавляет инкремент для 5xl', () => {
    expect(getAdaptiveSpacing(16, '5xl')).toBe(32) // 16 + 16
  })

  it('добавляет инкремент для 6xl', () => {
    expect(getAdaptiveSpacing(16, '6xl')).toBe(40) // 16 + 24
  })
})

describe('getGridGap', () => {
  it('возвращает базовый gap для base', () => {
    expect(getGridGap('base')).toBe(24)
  })

  it('возвращает увеличенный gap для 6xl', () => {
    expect(getGridGap('6xl')).toBe(Math.round(24 * 1.6)) // 38
  })
})

describe('getGridColumns', () => {
  it('возвращает 12 колонок для default', () => {
    expect(getGridColumns('default')).toBe(12)
  })

  it('возвращает 24 колонки для 6xl', () => {
    expect(getGridColumns('6xl')).toBe(24)
  })
})

describe('generateCSSVariables', () => {
  it('генерирует CSS переменные для контейнеров', () => {
    const vars = generateCSSVariables()
    expect(vars).toHaveProperty('--container-default')
    expect(vars).toHaveProperty('--container-xl')
    expect(vars).toHaveProperty('--container-2xl')
    expect(vars).toHaveProperty('--container-3xl')
    expect(vars).toHaveProperty('--container-4xl')
    // Новые переменные
    expect(vars).toHaveProperty('--container-5xl')
    expect(vars).toHaveProperty('--container-6xl')
  })

  it('генерирует CSS переменные для фиксированных контейнеров', () => {
    const vars = generateCSSVariables()
    expect(vars).toHaveProperty('--container-fixed-default')
    expect(vars).toHaveProperty('--container-fixed-5xl')
    expect(vars).toHaveProperty('--container-fixed-6xl')
  })

  it('генерирует CSS переменные для scale factors', () => {
    const vars = generateCSSVariables()
    expect(vars).toHaveProperty('--scale-base')
    expect(vars).toHaveProperty('--scale-xl')
    expect(vars).toHaveProperty('--scale-2xl')
    expect(vars).toHaveProperty('--scale-3xl')
    expect(vars).toHaveProperty('--scale-4xl')
    // Новые переменные
    expect(vars).toHaveProperty('--scale-5xl')
    expect(vars).toHaveProperty('--scale-6xl')
  })

  it('генерирует CSS переменные для цветов', () => {
    const vars = generateCSSVariables()
    expect(vars).toHaveProperty('--color-background-light')
    expect(vars).toHaveProperty('--color-background-dark')
    expect(vars).toHaveProperty('--color-text-primary')
    expect(vars).toHaveProperty('--color-text-secondary')
  })

  it('генерирует CSS переменные для адаптивных отступов', () => {
    const vars = generateCSSVariables()
    expect(vars).toHaveProperty('--spacing-adaptive-xl')
    expect(vars).toHaveProperty('--spacing-adaptive-5xl')
    expect(vars).toHaveProperty('--spacing-adaptive-6xl')
  })

  it('генерирует CSS переменные для сетки', () => {
    const vars = generateCSSVariables()
    expect(vars).toHaveProperty('--grid-columns-default')
    expect(vars).toHaveProperty('--grid-columns-6xl')
  })

  it('возвращает строковые значения', () => {
    const vars = generateCSSVariables()
    Object.values(vars).forEach(value => {
      expect(typeof value).toBe('string')
    })
  })

  it('scale переменные содержат числовые значения', () => {
    const vars = generateCSSVariables()
    expect(vars['--scale-base']).toBe('1')
    expect(vars['--scale-xl']).toBe('1.05')
    expect(vars['--scale-5xl']).toBe('1.3')
    expect(vars['--scale-6xl']).toBe('1.4')
  })
})

describe('useAdaptiveTokens', () => {
  it('возвращает объект с tokens', () => {
    const { tokens } = useAdaptiveTokens()
    expect(tokens).toBe(adaptiveTokens)
  })

  it('возвращает функцию getContainerWidth', () => {
    const { getContainerWidth: fn } = useAdaptiveTokens()
    expect(typeof fn).toBe('function')
    expect(fn('default')).toBe(getContainerWidth('default'))
  })

  it('возвращает функцию getScaledSize', () => {
    const { getScaledSize: fn } = useAdaptiveTokens()
    expect(typeof fn).toBe('function')
    expect(fn(16, 'base')).toBe(getScaledSize(16, 'base'))
  })

  it('возвращает новые функции', () => {
    const hook = useAdaptiveTokens()
    expect(typeof hook.getContainerFixedWidth).toBe('function')
    expect(typeof hook.getAdaptiveSpacing).toBe('function')
    expect(typeof hook.getGridGap).toBe('function')
    expect(typeof hook.getGridColumns).toBe('function')
  })
})

describe('TypeScript типы', () => {
  it('Breakpoint тип включает все ключи', () => {
    const breakpoint: Breakpoint = 'sm'
    expect(['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl']).toContain(breakpoint)
  })

  it('ContainerWidth тип включает все ключи', () => {
    const width: ContainerWidth = 'default'
    expect(['default', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl']).toContain(width)
  })

  it('ScaleFactor тип включает все ключи', () => {
    const factor: ScaleFactor = 'base'
    expect(['base', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl']).toContain(factor)
  })

  it('ContainerFixedWidth тип включает все ключи', () => {
    const width: ContainerFixedWidth = '5xl'
    expect(['default', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl']).toContain(width)
  })
})

describe('Интеграционные тесты', () => {
  it('рассчитывает размер заголовка для разных брейкпоинтов', () => {
    const baseFontSize = 24
    
    const mobileSize = getScaledSize(baseFontSize, 'base')
    const desktopSize = getScaledSize(baseFontSize, 'xl')
    const largeDesktopSize = getScaledSize(baseFontSize, '4xl')
    const ultraSize = getScaledSize(baseFontSize, '6xl')

    expect(mobileSize).toBe(24)
    expect(desktopSize).toBeGreaterThan(mobileSize)
    expect(largeDesktopSize).toBeGreaterThan(desktopSize)
    expect(ultraSize).toBeGreaterThan(largeDesktopSize)
  })

  it('рассчитывает отступы с учетом adaptiveIncrements', () => {
    const basePadding = 16 // px
    
    const xlPadding = getAdaptiveSpacing(basePadding, 'xl')
    const xxlPadding = getAdaptiveSpacing(basePadding, '2xl')
    const xxxlPadding = getAdaptiveSpacing(basePadding, '3xl')
    const ultraPadding = getAdaptiveSpacing(basePadding, '6xl')

    expect(xlPadding).toBe(17)
    expect(xxlPadding).toBe(18)
    expect(xxxlPadding).toBe(20)
    expect(ultraPadding).toBe(40)
  })

    it('проверяет консистентность токенов', () => {
      // Все брейкпоинты должны иметь соответствующие scale factors
      const breakpointKeys = Object.keys(adaptiveTokens.breakpoints)
      const scaleFactorKeys = Object.keys(adaptiveTokens.scaleFactors)
      
      // scale factors должны быть подмножеством брейкпоинтов + base
      expect(scaleFactorKeys).toContain('base')
      
      // Проверяем что xl, 2xl, 3xl, 4xl, 5xl, 6xl есть в обоих наборах
      ;['xl', '2xl', '3xl', '4xl', '5xl', '6xl'].forEach(key => {
        expect(scaleFactorKeys).toContain(key)
        expect(breakpointKeys).toContain(key)
      })
    })

  it('проверяет поддержку экрана 5143px × 3086px', () => {
    // Для экрана 5143px должен использоваться брейкпоинт 6xl
    const screenWidth = 5143
    const breakpoint6xl = adaptiveTokens.breakpoints['6xl']
    
    expect(screenWidth).toBeGreaterThanOrEqual(breakpoint6xl)
    
    // Проверяем что контейнер и масштабирование подходят
    const containerWidth = getContainerWidth('6xl')
    const scaleFactor = adaptiveTokens.scaleFactors['6xl']
    
    expect(containerWidth).toContain('65vw') // 65% от ширины экрана
    expect(scaleFactor).toBe(1.4) // +40% масштабирование
  })

  it('проверяет обратную совместимость', () => {
    // Существующие функции должны работать как раньше
    expect(getContainerWidth('default')).toBe('min(90rem, 92vw)')
    expect(getScaledSize(16, 'base')).toBe(16)
    expect(getScaledSize(16, '4xl')).toBe(19)
    
    // Существующие токены должны быть на месте
    expect(adaptiveTokens.breakpoints['3xl']).toBe(1920)
    expect(adaptiveTokens.breakpoints['4xl']).toBe(2560)
    expect(adaptiveTokens.scaleFactors['4xl']).toBe(1.2)
  })
})
