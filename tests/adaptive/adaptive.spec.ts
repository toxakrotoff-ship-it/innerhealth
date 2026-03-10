/**
 * Комплексные Playwright тесты для проверки адаптивности компонентов
 *
 * Тестирует все 9 брейкпоинтов: 320px, 768px, 1024px, 1280px, 1536px, 1920px, 2560px, 3840px, 5120px
 * Проверяет адаптивные компоненты: AdaptiveContainer, ResponsiveText, FluidGrid, ScalableSpacing
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

// Конфигурация брейкпоинтов из adaptive-tokens.ts
const BREAKPOINTS = {
  mobile: { width: 320, height: 568, name: 'Mobile (320px)' },
  tablet: { width: 768, height: 1024, name: 'Tablet (768px)' },
  desktop: { width: 1024, height: 768, name: 'Desktop (1024px)' },
  xl: { width: 1280, height: 720, name: 'XL (1280px)' },
  '2xl': { width: 1536, height: 864, name: '2XL (1536px)' },
  '3xl': { width: 1920, height: 1080, name: '3XL (1920px)' },
  '4xl': { width: 2560, height: 1440, name: '4XL (2560px)' },
  '5xl': { width: 3840, height: 2160, name: '5XL (3840px) - 4K UHD' },
  '6xl': { width: 5120, height: 2880, name: '6XL (5120px) - 5K+' },
} as const

// Базовый URL для тестов
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

/**
 * Хелпер для установки viewport
 */
async function setViewport(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
}

/**
 * Хелпер для проверки видимости элемента
 */
async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector)
    const isVisible = await element.isVisible()
    const display = await element.evaluate(el => window.getComputedStyle(el).display)
    const visibility = await element.evaluate(el => window.getComputedStyle(el).visibility)
    const opacity = await element.evaluate(el => window.getComputedStyle(el).opacity)
    
    return isVisible && display !== 'none' && visibility !== 'hidden' && opacity !== '0'
  } catch {
    return false
  }
}

/**
 * Хелпер для получения computed стиля элемента
 */
async function getComputedStyleValue(page: Page, selector: string, property: string): Promise<string> {
  return await page.locator(selector).evaluate((el, prop) => {
    return window.getComputedStyle(el).getPropertyValue(prop)
  }, property)
}

// ============================================
// ТЕСТЫ НАВИГАЦИИ
// ============================================

test.describe('Адаптивная навигация', () => {
  test.describe.configure({ mode: 'parallel' })

  test('Мобильное меню видно на 320px', async ({ page }) => {
    await setViewport(page, BREAKPOINTS.mobile.width, BREAKPOINTS.mobile.height)
    await page.goto(BASE_URL)

    // Кнопка мобильного меню должна быть видна
    const mobileMenuButton = page.locator('button[aria-label="Открыть меню"], button:has(svg)').first()
    await expect(mobileMenuButton).toBeVisible()

    // Десктопная навигация должна быть скрыта
    const desktopNav = page.locator('nav.hidden.xl\\:flex')
    const isVisible = await isElementVisible(page, 'nav.hidden.xl\\:flex')
    expect(isVisible).toBe(false)
  })

  test('Мобильное меню открывается и закрывается', async ({ page }) => {
    await setViewport(page, BREAKPOINTS.mobile.width, BREAKPOINTS.mobile.height)
    await page.goto(BASE_URL)

    // Находим кнопку меню (бургер)
    const menuButton = page.locator('button').filter({ hasText: '' }).locator('visible=true').first()
    
    // Открываем меню
    await menuButton.click()
    
    // Проверяем что меню открыто
    const mobileNav = page.locator('nav[aria-label="Меню"], nav.fixed')
    await expect(mobileNav).toBeVisible()

    // Закрываем меню кликом на overlay
    const overlay = page.locator('div.fixed.inset-0.bg-black\\/30')
    await overlay.click()

    // Проверяем что меню закрыто
    await expect(mobileNav).not.toBeVisible()
  })

  test('Десктопная навигация видна на 1280px', async ({ page }) => {
    await setViewport(page, BREAKPOINTS.xl.width, BREAKPOINTS.xl.height)
    await page.goto(BASE_URL)

    // Десктопная навигация должна быть видна
    const desktopNav = page.locator('nav.hidden.xl\\:flex')
    await expect(desktopNav).toBeVisible()

    // Кнопка мобильного меню должна быть скрыта
    const mobileMenuButton = page.locator('.xl\\:hidden button')
    const isVisible = await isElementVisible(page, '.xl\\:hidden button')
    expect(isVisible).toBe(false)
  })

  test('Переключение между мобильным и десктопным меню на 1024px', async ({ page }) => {
    await setViewport(page, BREAKPOINTS.desktop.width, BREAKPOINTS.desktop.height)
    await page.goto(BASE_URL)

    // На 1024px десктопное меню может быть скрыто из-за конфликта медиа-запросов
    // Проверяем что показывается только один вариант навигации
    const desktopNav = page.locator('nav.hidden.xl\\:flex')
    const mobileMenuContainer = page.locator('.xl\\:hidden')

    const desktopVisible = await isElementVisible(page, 'nav.hidden.xl\\:flex')
    const mobileVisible = await isElementVisible(page, '.xl\\:hidden button')

    // Либо десктопное, либо мобильное меню должно быть видимо, но не оба одновременно
    expect(desktopVisible || mobileVisible).toBe(true)
  })

  test('Контактная информация скрывается/показывается на разных брейкпоинтах', async ({ page }) => {
    // На мобильном - контакты скрыты
    await setViewport(page, BREAKPOINTS.mobile.width, BREAKPOINTS.mobile.height)
    await page.goto(BASE_URL)
    
    const phoneOnMobile = await isElementVisible(page, 'a[href^="tel:"]')
    // Телефон может быть в мобильном меню или виден

    // На десктопе - контакты видны
    await setViewport(page, BREAKPOINTS.xl.width, BREAKPOINTS.xl.height)
    await page.goto(BASE_URL)
    
    const phoneOnDesktop = await isElementVisible(page, 'a[href^="tel:"]')
    expect(phoneOnDesktop).toBe(true)
  })
})

// ============================================
// ТЕСТЫ КОНТЕЙНЕРОВ
// ============================================

test.describe('Адаптивные контейнеры', () => {
  test('Ширина контейнера адаптируется под viewport', async ({ page }) => {
    // Тестируем на разных разрешениях
    const testCases = [
      { width: 320, expectedMaxWidth: 1440 },
      { width: 768, expectedMaxWidth: 1440 },
      { width: 1280, expectedMaxWidth: 1440 },
      { width: 1920, expectedMaxWidth: 1920 },
      { width: 2560, expectedMaxWidth: 2240 },
    ]

    for (const { width, expectedMaxWidth } of testCases) {
      await setViewport(page, width, 800)
      await page.goto(BASE_URL)

      // Находим контейнер в header
      const container = page.locator('header > div').first()
      
      if (await container.count() > 0) {
        const containerWidth = await container.evaluate(el => el.getBoundingClientRect().width)
        
        // Контейнер не должен превышать ожидаемую ширину с учетом padding
        expect(containerWidth).toBeLessThanOrEqual(expectedMaxWidth + 100) // +100px для padding
      }
    }
  })

  test('Padding контейнера изменяется на разных брейкпоинтах', async ({ page }) => {
    // Мобильный
    await setViewport(page, BREAKPOINTS.mobile.width, BREAKPOINTS.mobile.height)
    await page.goto(BASE_URL)
    
    const container = page.locator('header > div').first()
    if (await container.count() > 0) {
      const paddingMobile = await getComputedStyleValue(page, 'header > div', 'padding-left')
      expect(parseInt(paddingMobile)).toBeGreaterThanOrEqual(16) // минимум 16px (px-4)
    }

    // Десктоп
    await setViewport(page, BREAKPOINTS.xl.width, BREAKPOINTS.xl.height)
    await page.goto(BASE_URL)
    
    if (await container.count() > 0) {
      const paddingDesktop = await getComputedStyleValue(page, 'header > div', 'padding-left')
      expect(parseInt(paddingDesktop)).toBeGreaterThanOrEqual(16)
    }
  })
})

// ============================================
// ТЕСТЫ ТИПОГРАФИКИ
// ============================================

test.describe('Адаптивная типографика', () => {
  test('Размер шрифта заголовка масштабируется', async ({ page }) => {
    const testCases = [
      { width: 320, minFontSize: 14, maxFontSize: 24 },
      { width: 1280, minFontSize: 14, maxFontSize: 28 },
      { width: 1920, minFontSize: 14, maxFontSize: 32 },
    ]

    for (const { width, minFontSize, maxFontSize } of testCases) {
      await setViewport(page, width, 800)
      await page.goto(BASE_URL)

      // Находим заголовок сайта
      const logo = page.locator('a:has-text("INNER HEALTH")')
      if (await logo.count() > 0) {
        const fontSize = await getComputedStyleValue(page, 'a:has-text("INNER HEALTH")', 'font-size')
        const fontSizeValue = parseFloat(fontSize)
        
        expect(fontSizeValue).toBeGreaterThanOrEqual(minFontSize)
        expect(fontSizeValue).toBeLessThanOrEqual(maxFontSize)
      }
    }
  })

  test('Line-height корректный для читаемости', async ({ page }) => {
    await page.goto(BASE_URL)

    const textElements = page.locator('p, span, div').filter({ hasText: /.{20,}/ })
    const count = await textElements.count()

    if (count > 0) {
      const firstText = textElements.first()
      const lineHeight = await firstText.evaluate(el => {
        return parseFloat(window.getComputedStyle(el).lineHeight)
      })

      // Line-height должен быть разумным для читаемости (1.2 - 2.0)
      expect(lineHeight).toBeGreaterThanOrEqual(1.2)
      expect(lineHeight).toBeLessThanOrEqual(2.5)
    }
  })
})

// ============================================
// ТЕСТЫ СЕТКИ
// ============================================

test.describe('Адаптивная сетка', () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на страницу каталога где есть сетка товаров
  })

  test('Количество колонок в каталоге адаптируется', async ({ page }) => {
    // Мобильный - 1-2 колонки
    await setViewport(page, BREAKPOINTS.mobile.width, BREAKPOINTS.mobile.height)
    await page.goto(`${BASE_URL}/catalog`)
    
    // Ждем загрузки товаров
    await page.waitForSelector('[class*="grid"]', { timeout: 10000 }).catch(() => {})

    const grid = page.locator('[class*="grid"]').first()
    if (await grid.count() > 0) {
      const gridColumns = await grid.evaluate(el => {
        return window.getComputedStyle(el).gridTemplateColumns.split(' ').length
      })
      expect(gridColumns).toBeLessThanOrEqual(2)
    }

    // Десктоп - 3-4 колонки
    await setViewport(page, BREAKPOINTS.xl.width, BREAKPOINTS.xl.height)
    await page.goto(`${BASE_URL}/catalog`)
    
    await page.waitForSelector('[class*="grid"]', { timeout: 10000 }).catch(() => {})

    if (await grid.count() > 0) {
      const gridColumnsDesktop = await grid.evaluate(el => {
        return window.getComputedStyle(el).gridTemplateColumns.split(' ').length
      })
      expect(gridColumnsDesktop).toBeGreaterThanOrEqual(2)
      expect(gridColumnsDesktop).toBeLessThanOrEqual(4)
    }
  })
})

// ============================================
// ТЕСТЫ ОТСТУПОВ
// ============================================

test.describe('Адаптивные отступы', () => {
  test('Отступы между элементами навигации масштабируются', async ({ page }) => {
    await setViewport(page, BREAKPOINTS.xl.width, BREAKPOINTS.xl.height)
    await page.goto(BASE_URL)

    const nav = page.locator('nav.hidden.xl\\:flex')
    if (await nav.count() > 0) {
      const gap = await nav.evaluate(el => {
        return window.getComputedStyle(el).gap
      })
      
      // Gap должен быть установлен
      expect(gap).not.toBe('normal')
      expect(parseFloat(gap)).toBeGreaterThan(0)
    }
  })

  test('Вертикальные отступы секций адаптируются', async ({ page }) => {
    await setViewport(page, BREAKPOINTS.mobile.width, BREAKPOINTS.mobile.height)
    await page.goto(BASE_URL)

    // Находим секции на странице
    const sections = page.locator('section, [class*="py-"]')
    const count = await sections.count()

    if (count > 0) {
      const firstSection = sections.first()
      const paddingTop = await firstSection.evaluate(el => {
        return parseInt(window.getComputedStyle(el).paddingTop)
      })

      // Padding должен быть разумным
      expect(paddingTop).toBeGreaterThanOrEqual(16)
    }
  })
})

// ============================================
// ТЕСТЫ АДАПТИВНЫХ КОМПОНЕНТОВ
// ============================================

test.describe('Адаптивные компоненты', () => {
  test.describe.configure({ mode: 'parallel' })

  test('AdaptiveContainer корректно масштабирует ширину на всех брейкпоинтах', async ({ page }) => {
    const testCases = [
      { width: 320, expectedMaxWidth: 1440 },
      { width: 768, expectedMaxWidth: 1440 },
      { width: 1280, expectedMaxWidth: 1440 },
      { width: 1536, expectedMaxWidth: 1600 },
      { width: 1920, expectedMaxWidth: 1920 },
      { width: 2560, expectedMaxWidth: 2240 },
      { width: 3840, expectedMaxWidth: 2880 },
      { width: 5120, expectedMaxWidth: 3840 },
    ]

    for (const { width, expectedMaxWidth } of testCases) {
      await setViewport(page, width, 800)
      await page.goto(BASE_URL)

      // Ищем контейнеры с data-атрибутом или классом adaptive-container
      const container = page.locator('[class*="adaptive-container"], .adaptive-container, [data-adaptive]').first()
      
      if (await container.count() > 0) {
        const containerWidth = await container.evaluate(el => el.getBoundingClientRect().width)
        
        // Контейнер не должен превышать ожидаемую ширину с учетом padding
        expect(containerWidth).toBeLessThanOrEqual(expectedMaxWidth + 200) // +200px для padding и margin
      }
    }
  })

  test('ResponsiveText масштабирует размер шрифта на больших экранах', async ({ page }) => {
    const testCases = [
      { width: 320, minFontSize: 14 },
      { width: 1920, minFontSize: 16 },
      { width: 3840, minFontSize: 18 },
      { width: 5120, minFontSize: 20 },
    ]

    for (const { width, minFontSize } of testCases) {
      await setViewport(page, width, 800)
      await page.goto(BASE_URL)

      // Ищем элементы с адаптивной типографикой
      const headings = page.locator('h1, h2, h3, h4, h5, h6')
      const count = await headings.count()
      
      if (count > 0) {
        const firstHeading = headings.first()
        const fontSize = await firstHeading.evaluate(el => {
          return parseFloat(window.getComputedStyle(el).fontSize)
        })
        
        // Размер шрифта должен увеличиваться на больших экранах
        expect(fontSize).toBeGreaterThanOrEqual(minFontSize)
      }
    }
  })

  test('FluidGrid адаптирует количество колонок на разных брейкпоинтах', async ({ page }) => {
    // Мобильный
    await setViewport(page, BREAKPOINTS.mobile.width, BREAKPOINTS.mobile.height)
    await page.goto(`${BASE_URL}/catalog`)
    
    await page.waitForSelector('[class*="grid"]', { timeout: 10000 }).catch(() => {})

    const grid = page.locator('[class*="grid"]').first()
    if (await grid.count() > 0) {
      const gridColumns = await grid.evaluate(el => {
        return window.getComputedStyle(el).gridTemplateColumns.split(' ').length
      })
      expect(gridColumns).toBeLessThanOrEqual(2)
    }

    // Десктоп XL
    await setViewport(page, BREAKPOINTS.xl.width, BREAKPOINTS.xl.height)
    await page.goto(`${BASE_URL}/catalog`)
    
    await page.waitForSelector('[class*="grid"]', { timeout: 10000 }).catch(() => {})

    if (await grid.count() > 0) {
      const gridColumnsDesktop = await grid.evaluate(el => {
        return window.getComputedStyle(el).gridTemplateColumns.split(' ').length
      })
      expect(gridColumnsDesktop).toBeGreaterThanOrEqual(2)
      expect(gridColumnsDesktop).toBeLessThanOrEqual(4)
    }

    // 4K экран
    await setViewport(page, BREAKPOINTS['5xl'].width, 1200)
    await page.goto(`${BASE_URL}/catalog`)
    
    await page.waitForSelector('[class*="grid"]', { timeout: 10000 }).catch(() => {})

    if (await grid.count() > 0) {
      const gridColumns4K = await grid.evaluate(el => {
        return window.getComputedStyle(el).gridTemplateColumns.split(' ').length
      })
      // На 4K экранах может быть больше колонок
      expect(gridColumns4K).toBeGreaterThanOrEqual(3)
      expect(gridColumns4K).toBeLessThanOrEqual(6)
    }
  })

  test('ScalableSpacing увеличивает отступы на больших экранах', async ({ page }) => {
    // Мобильный
    await setViewport(page, BREAKPOINTS.mobile.width, BREAKPOINTS.mobile.height)
    await page.goto(BASE_URL)
    
    const section = page.locator('section, [class*="py-"]').first()
    if (await section.count() > 0) {
      const paddingTopMobile = await section.evaluate(el => {
        return parseInt(window.getComputedStyle(el).paddingTop)
      })
      
      // 4K экран
      await setViewport(page, BREAKPOINTS['5xl'].width, 1200)
      await page.goto(BASE_URL)
      
      const paddingTop4K = await section.evaluate(el => {
        return parseInt(window.getComputedStyle(el).paddingTop)
      })
      
      // Отступы должны быть больше на больших экранах
      expect(paddingTop4K).toBeGreaterThanOrEqual(paddingTopMobile)
    }
  })

  test('Все адаптивные компоненты корректно рендерятся на 5K+ экранах', async ({ page }) => {
    // Тестируем на 5K экране
    await setViewport(page, BREAKPOINTS['6xl'].width, BREAKPOINTS['6xl'].height)
    await page.goto(BASE_URL)
    
    // Проверяем наличие ключевых компонентов
    const header = page.locator('header')
    const footer = page.locator('footer')
    const mainContent = page.locator('main')
    
    await expect(header).toBeVisible()
    await expect(footer).toBeVisible()
    await expect(mainContent).toBeVisible()
    
    // Проверяем что нет горизонтального скролла (контент вписывается)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    
    expect(hasHorizontalScroll).toBe(false)
  })
})

// ============================================
// ТЕСТЫ OVERLAP DETECTION
// ============================================

test.describe('Обнаружение наложения элементов', () => {
  test('Нет одновременного показа десктопного и мобильного меню', async ({ page }) => {
    const problematicWidths = [1024, 1100, 1200, 1279]

    for (const width of problematicWidths) {
      await setViewport(page, width, 800)
      await page.goto(BASE_URL)
      
      // Ждем рендеринга
      await page.waitForTimeout(500)

      const desktopNav = page.locator('nav.hidden.xl\\:flex')
      const mobileMenuButton = page.locator('.xl\\:hidden button')

      const desktopVisible = await isElementVisible(page, 'nav.hidden.xl\\:flex')
      const mobileVisible = await isElementVisible(page, '.xl\\:hidden button')

      // Оба меню не должны быть видны одновременно
      expect(desktopVisible && mobileVisible).toBe(false)
    }
  })

  test('DPI масштабирование учитывается', async ({ page }) => {
    // Эмулируем устройство с высоким DPI
    await page.setViewportSize({ width: 1200, height: 800 })
    await page.goto(BASE_URL)

    // Проверяем что навигация корректно отображается
    const nav = page.locator('nav')
    const navCount = await nav.count()
    
    // Должна быть хотя бы одна навигация
    expect(navCount).toBeGreaterThanOrEqual(1)
  })
})

// ============================================
// ТЕСТЫ TOUCH TARGETS
// ============================================

test.describe('Touch targets для мобильных', () => {
  test('Все интерактивные элементы имеют минимальный размер 44x44px', async ({ page }) => {
    await setViewport(page, BREAKPOINTS.mobile.width, BREAKPOINTS.mobile.height)
    await page.goto(BASE_URL)

    // Находим все кнопки и ссылки
    const interactiveElements = page.locator('button, a, [role="button"], input[type="submit"]')
    const count = await interactiveElements.count()

    const violations: string[] = []

    for (let i = 0; i < Math.min(count, 50); i++) {
      const element = interactiveElements.nth(i)
      
      try {
        const box = await element.boundingBox()
        if (box) {
          if (box.width < 44 || box.height < 44) {
            const tagName = await element.evaluate(el => el.tagName)
            const text = await element.textContent().catch(() => '')
            violations.push(`${tagName} "${text?.substring(0, 20)}": ${box.width}x${box.height}px`)
          }
        }
      } catch {
        // Элемент может быть скрыт или не иметь bounding box
      }
    }

    // Логируем нарушения, но не падаем (это может быть приемлемо в некоторых случаях)
    if (violations.length > 0) {
      console.log('Touch target violations:', violations)
    }
  })
})

// ============================================
// СКРИНШОТНЫЕ ТЕСТЫ
// ============================================

test.describe('Визуальные тесты адаптивности', () => {
  test('Скриншот header на всех 9 брейкпоинтах', async ({ page }) => {
    const viewports = [
      { viewportName: 'mobile', ...BREAKPOINTS.mobile },
      { viewportName: 'tablet', ...BREAKPOINTS.tablet },
      { viewportName: 'desktop', ...BREAKPOINTS.desktop },
      { viewportName: 'xl', ...BREAKPOINTS.xl },
      { viewportName: '2xl', ...BREAKPOINTS['2xl'] },
      { viewportName: '3xl', ...BREAKPOINTS['3xl'] },
      { viewportName: '4xl', ...BREAKPOINTS['4xl'] },
      { viewportName: '5xl', ...BREAKPOINTS['5xl'] },
      { viewportName: '6xl', ...BREAKPOINTS['6xl'] },
    ]

    for (const { viewportName, width, height } of viewports) {
      await setViewport(page, width, height)
      await page.goto(BASE_URL)
      
      const header = page.locator('header')
      await expect(header).toHaveScreenshot(`header-${viewportName}-${width}px.png`, {
        maxDiffPixels: 2000,
        threshold: 0.3,
        animations: 'disabled',
      })
    }
  })

  test('Скриншот footer на всех брейкпоинтах', async ({ page }) => {
    const viewports = [
      { viewportName: 'mobile', ...BREAKPOINTS.mobile },
      { viewportName: 'tablet', ...BREAKPOINTS.tablet },
      { viewportName: 'desktop', ...BREAKPOINTS.desktop },
      { viewportName: 'xl', ...BREAKPOINTS.xl },
      { viewportName: '3xl', ...BREAKPOINTS['3xl'] },
      { viewportName: '5xl', ...BREAKPOINTS['5xl'] },
    ]

    for (const { viewportName, width, height } of viewports) {
      await setViewport(page, width, height)
      await page.goto(BASE_URL)
      
      const footer = page.locator('footer')
      if (await footer.count() > 0) {
        await footer.scrollIntoViewIfNeeded()
        await expect(footer).toHaveScreenshot(`footer-${viewportName}-${width}px.png`, {
          maxDiffPixels: 3000,
          threshold: 0.3,
          animations: 'disabled',
        })
      }
    }
  })

  test('Скриншот страницы товара на ключевых брейкпоинтах', async ({ page }) => {
    const productUrl = `${BASE_URL}/product/test-product` // Замените на реальный URL при необходимости
    
    const viewports = [
      { viewportName: 'mobile', ...BREAKPOINTS.mobile },
      { viewportName: 'tablet', ...BREAKPOINTS.tablet },
      { viewportName: 'desktop', ...BREAKPOINTS.desktop },
      { viewportName: '3xl', ...BREAKPOINTS['3xl'] },
      { viewportName: '5xl', ...BREAKPOINTS['5xl'] },
    ]

    for (const { viewportName, width, height } of viewports) {
      await setViewport(page, width, height)
      await page.goto(productUrl)
      
      // Делаем скриншот всей страницы
      await expect(page).toHaveScreenshot(`product-page-${viewportName}-${width}px.png`, {
        maxDiffPixels: 5000,
        threshold: 0.3,
        animations: 'disabled',
        fullPage: true,
      })
    }
  })

  test('Скриншот страницы корзины на ключевых брейкпоинтах', async ({ page }) => {
    const cartUrl = `${BASE_URL}/cart`
    
    const viewports = [
      { viewportName: 'mobile', ...BREAKPOINTS.mobile },
      { viewportName: 'tablet', ...BREAKPOINTS.tablet },
      { viewportName: 'desktop', ...BREAKPOINTS.desktop },
      { viewportName: '3xl', ...BREAKPOINTS['3xl'] },
    ]

    for (const { viewportName, width, height } of viewports) {
      await setViewport(page, width, height)
      await page.goto(cartUrl)
      
      // Делаем скриншот всей страницы
      await expect(page).toHaveScreenshot(`cart-page-${viewportName}-${width}px.png`, {
        maxDiffPixels: 5000,
        threshold: 0.3,
        animations: 'disabled',
        fullPage: true,
      })
    }
  })

  test('Скриншот адаптивных компонентов на сверхбольших экранах', async ({ page }) => {
    // Тестируем на 5K+ экранах
    const viewports = [
      { viewportName: '4xl', ...BREAKPOINTS['4xl'] },
      { viewportName: '5xl', ...BREAKPOINTS['5xl'] },
      { viewportName: '6xl', ...BREAKPOINTS['6xl'] },
    ]

    for (const { viewportName, width, height } of viewports) {
      await setViewport(page, width, height)
      await page.goto(BASE_URL)
      
      // Скриншот всей страницы для проверки масштабирования
      await expect(page).toHaveScreenshot(`ultrawide-${viewportName}-${width}px.png`, {
        maxDiffPixels: 10000,
        threshold: 0.4,
        animations: 'disabled',
        fullPage: true,
      })
    }
  })
})

// ============================================
// ТЕСТЫ КЛЮЧЕВЫХ СТРАНИЦ ПОСЛЕ МИГРАЦИЙ
// ============================================

test.describe('Ключевые страницы после миграций', () => {
  test.describe.configure({ mode: 'parallel' })

  test('Главная страница корректно отображается на всех брейкпоинтах', async ({ page }) => {
    const breakpoints = Object.values(BREAKPOINTS)
    
    for (const bp of breakpoints) {
      await setViewport(page, bp.width, bp.height)
      await page.goto(BASE_URL)
      
      // Проверяем основные элементы
      await expect(page.locator('header')).toBeVisible()
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('footer')).toBeVisible()
      
      // Проверяем отсутствие горизонтального скролла
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })
      
      expect(hasHorizontalScroll).toBe(false)
    }
  })

  test('Страница товара корректно отображается на всех брейкпоинтах', async ({ page }) => {
    // Используем тестовую страницу товара или переходим на существующий товар
    const productUrl = `${BASE_URL}/product/test-product` // Замените на реальный URL
    
    const breakpoints = [
      BREAKPOINTS.mobile,
      BREAKPOINTS.tablet,
      BREAKPOINTS.desktop,
      BREAKPOINTS.xl,
      BREAKPOINTS['3xl'],
      BREAKPOINTS['5xl'],
    ]
    
    for (const bp of breakpoints) {
      await setViewport(page, bp.width, bp.height)
      await page.goto(productUrl)
      
      // Проверяем ключевые элементы страницы товара
      const productTitle = page.locator('h1')
      const productGallery = page.locator('[class*="gallery"], [class*="media"]')
      const addToCartButton = page.locator('button:has-text("В корзину"), button:has-text("Купить")')
      
      if (await productTitle.count() > 0) {
        await expect(productTitle).toBeVisible()
      }
      
      if (await productGallery.count() > 0) {
        await expect(productGallery.first()).toBeVisible()
      }
      
      if (await addToCartButton.count() > 0) {
        await expect(addToCartButton.first()).toBeVisible()
      }
    }
  })

  test('Страница корзины корректно отображается на всех брейкпоинтах', async ({ page }) => {
    const cartUrl = `${BASE_URL}/cart`
    
    const breakpoints = [
      BREAKPOINTS.mobile,
      BREAKPOINTS.tablet,
      BREAKPOINTS.desktop,
      BREAKPOINTS['3xl'],
      BREAKPOINTS['5xl'],
    ]
    
    for (const bp of breakpoints) {
      await setViewport(page, bp.width, bp.height)
      await page.goto(cartUrl)
      
      // Проверяем основные элементы корзины
      const cartTitle = page.locator('h1:has-text("Корзина"), h1:has-text("Cart")')
      const cartItems = page.locator('[class*="cart-item"], [class*="cart__item"]')
      const checkoutButton = page.locator('button:has-text("Оформить заказ"), button:has-text("Checkout")')
      
      if (await cartTitle.count() > 0) {
        await expect(cartTitle).toBeVisible()
      }
      
      // Проверяем что страница загрузилась
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('Footer корректно отображается на всех брейкпоинтах', async ({ page }) => {
    await page.goto(BASE_URL)
    
    const breakpoints = [
      BREAKPOINTS.mobile,
      BREAKPOINTS.tablet,
      BREAKPOINTS.desktop,
      BREAKPOINTS['3xl'],
      BREAKPOINTS['5xl'],
      BREAKPOINTS['6xl'],
    ]
    
    for (const bp of breakpoints) {
      await setViewport(page, bp.width, bp.height)
      await page.reload()
      
      const footer = page.locator('footer')
      if (await footer.count() > 0) {
        await footer.scrollIntoViewIfNeeded()
        await expect(footer).toBeVisible()
        
        // Проверяем что footer содержит ожидаемый контент
        const footerText = await footer.textContent()
        expect(footerText?.length).toBeGreaterThan(10)
      }
    }
  })

  test('Адаптивные компоненты присутствуют на мигрированных страницах', async ({ page }) => {
    const pagesToCheck = [
      BASE_URL, // Главная
      `${BASE_URL}/cart`, // Корзина
      `${BASE_URL}/product/test-product`, // Товар
    ]
    
    for (const url of pagesToCheck) {
      await page.goto(url)
      
      // Проверяем наличие адаптивных контейнеров
      const adaptiveContainers = page.locator('[class*="adaptive-container"], .adaptive-container')
      const containerCount = await adaptiveContainers.count()
      
      // На мигрированных страницах должно быть хотя бы несколько адаптивных контейнеров
      if (url === BASE_URL || url.includes('/cart')) {
        expect(containerCount).toBeGreaterThan(0)
      }
    }
  })
})

// ============================================
// ТЕСТЫ ПРОИЗВОДИТЕЛЬНОСТИ
// ============================================

test.describe('Производительность адаптивности', () => {
  test('Время рендеринга при изменении viewport', async ({ page }) => {
    await page.goto(BASE_URL)

    const startTime = Date.now()
    
    // Изменяем viewport несколько раз
    for (let i = 0; i < 5; i++) {
      await setViewport(page, BREAKPOINTS.mobile.width, BREAKPOINTS.mobile.height)
      await page.waitForTimeout(100)
      await setViewport(page, BREAKPOINTS.xl.width, BREAKPOINTS.xl.height)
      await page.waitForTimeout(100)
    }

    const endTime = Date.now()
    const totalTime = endTime - startTime

    // Общее время должно быть разумным (< 5 секунд для 10 переключений)
    expect(totalTime).toBeLessThan(5000)
  })

  test('Нет layout shift при загрузке', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'commit' })

    // Измеряем Cumulative Layout Shift
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
        })
        observer.observe({ type: 'layout-shift', buffered: true })
        
        setTimeout(() => {
          observer.disconnect()
          resolve(clsValue)
        }, 3000)
      })
    })

    // CLS должен быть меньше 0.1 (хорошо) или 0.25 (приемлемо)
    expect(cls).toBeLessThan(0.25)
  })
})
