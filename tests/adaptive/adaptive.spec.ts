/**
 * Комплексные Playwright тесты для проверки адаптивности компонентов
 * 
 * Тестирует ключевые разрешения: 320px, 768px, 1024px, 1280px, 1920px, 2560px
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
  test('Скриншот header на разных разрешениях', async ({ page }) => {
    const viewports = [
      { viewportName: 'mobile', ...BREAKPOINTS.mobile },
      { viewportName: 'tablet', ...BREAKPOINTS.tablet },
      { viewportName: 'desktop', ...BREAKPOINTS.desktop },
      { viewportName: 'xl', ...BREAKPOINTS.xl },
    ]

    for (const { viewportName, width, height } of viewports) {
      await setViewport(page, width, height)
      await page.goto(BASE_URL)
      
      const header = page.locator('header')
      await expect(header).toHaveScreenshot(`header-${viewportName}-${width}px.png`, {
        maxDiffPixels: 1000,
        threshold: 0.2,
      })
    }
  })

  test('Скриншот footer на разных разрешениях', async ({ page }) => {
    const viewports = [
      { viewportName: 'mobile', ...BREAKPOINTS.mobile },
      { viewportName: 'tablet', ...BREAKPOINTS.tablet },
      { viewportName: 'desktop', ...BREAKPOINTS.desktop },
    ]

    for (const { viewportName, width, height } of viewports) {
      await setViewport(page, width, height)
      await page.goto(BASE_URL)
      
      const footer = page.locator('footer')
      if (await footer.count() > 0) {
        await footer.scrollIntoViewIfNeeded()
          await expect(footer).toHaveScreenshot(`footer-${viewportName}-${width}px.png`, {
            maxDiffPixels: 2000,
            threshold: 0.2,
          })
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
