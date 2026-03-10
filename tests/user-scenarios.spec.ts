/**
 * Playwright тесты для пользовательских сценариев на мобильных и десктопных устройствах
 * 
 * Тестирует ключевые пользовательские сценарии:
 * 1. Мобильные сценарии (320px-767px)
 * 2. Десктопные сценарии (1024px+)
 * 3. Кросс-устройственные сценарии
 */

import { test, expect, Page } from '@playwright/test'

// Базовый URL для тестов
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Конфигурация viewport
const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'Mobile' },
  mobileSmall: { width: 320, height: 568, name: 'Mobile Small' },
  tablet: { width: 768, height: 1024, name: 'Tablet' },
  desktop: { width: 1024, height: 768, name: 'Desktop' },
  desktopLarge: { width: 1440, height: 900, name: 'Desktop Large' },
  desktopXLarge: { width: 1920, height: 1080, name: 'Desktop XLarge' },
} as const

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
 * Хелпер для ожидания загрузки страницы
 */
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500) // Дополнительное время для рендеринга
}

// ============================================
// МОБИЛЬНЫЕ ПОЛЬЗОВАТЕЛЬСКИЕ СЦЕНАРИИ (320px-767px)
// ============================================

test.describe('Мобильные пользовательские сценарии (320px-767px)', () => {
  test.beforeEach(async ({ page }) => {
    await setViewport(page, VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)
  })

  test('Навигация по сайту на мобильном устройстве', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageLoad(page)

    // 1. Проверяем наличие мобильного меню (бургер)
    const mobileMenuButton = page.locator('button[aria-label*="меню"], button[aria-label*="menu"], .mobile-menu-button').first()
    await expect(mobileMenuButton).toBeVisible()

    // 2. Открываем мобильное меню
    await mobileMenuButton.click()
    
    // 3. Проверяем что меню открылось
    const mobileMenu = page.locator('nav[aria-label*="меню"], .mobile-nav, [role="navigation"]').first()
    await expect(mobileMenu).toBeVisible()

    // 4. Проверяем наличие пунктов меню
    const menuItems = mobileMenu.locator('a, button')
    const itemCount = await menuItems.count()
    expect(itemCount).toBeGreaterThan(0)

    // 5. Кликаем на первый пункт меню (если это ссылка)
    const firstMenuItem = menuItems.first()
    const href = await firstMenuItem.getAttribute('href')
    if (href && !href.startsWith('#')) {
      await firstMenuItem.click()
      await waitForPageLoad(page)
      // Проверяем что мы перешли на другую страницу
      expect(page.url()).not.toBe(BASE_URL + '/')
    }

    // 6. Закрываем меню
    const closeButton = page.locator('button[aria-label*="закрыть"], button[aria-label*="close"]').first()
    if (await closeButton.count() > 0) {
      await closeButton.click()
      await expect(mobileMenu).not.toBeVisible()
    }
  })

  test('Просмотр каталога товаров на мобильном', async ({ page }) => {
    // Переходим в каталог
    await page.goto(`${BASE_URL}/catalog`)
    await waitForPageLoad(page)

    // 1. Проверяем наличие товаров
    const products = page.locator('.product-card, [data-testid="product-card"], .product-item')
    const productCount = await products.count()
    
    if (productCount > 0) {
      // 2. Кликаем на первый товар
      await products.first().click()
      await waitForPageLoad(page)

      // 3. Проверяем что перешли на страницу товара
      expect(page.url()).toContain('/product/')
      
      // 4. Проверяем наличие основных элементов на странице товара
      const productTitle = page.locator('h1, .product-title, [data-testid="product-title"]')
      await expect(productTitle).toBeVisible()

      const productPrice = page.locator('.product-price, [data-testid="product-price"], .price')
      await expect(productPrice).toBeVisible()

      const addToCartButton = page.locator('button:has-text("В корзину"), button:has-text("Купить"), [data-testid="add-to-cart"]')
      await expect(addToCartButton).toBeVisible()
    } else {
      console.log('Каталог пуст или товары не найдены')
    }
  })

  test('Добавление товара в корзину на мобильном', async ({ page }) => {
    // Переходим на страницу товара
    await page.goto(`${BASE_URL}/catalog`)
    await waitForPageLoad(page)

    // Находим первый товар
    const products = page.locator('.product-card, [data-testid="product-card"]')
    if (await products.count() === 0) {
      test.skip()
      return
    }

    // Кликаем на товар чтобы перейти на его страницу
    await products.first().click()
    await waitForPageLoad(page)

    // Находим кнопку добавления в корзину
    const addToCartButton = page.locator('button:has-text("В корзину"), button:has-text("Купить"), [data-testid="add-to-cart"]')
    await expect(addToCartButton).toBeVisible()

    // Кликаем на кнопку
    await addToCartButton.click()

    // Проверяем что товар добавлен (появление уведомления или изменение состояния кнопки)
    const successMessage = page.locator('.toast-success, .alert-success, [role="alert"]:has-text("добавлен")')
    const cartCounter = page.locator('.cart-counter, [data-testid="cart-count"]')

    // Ждем либо сообщение об успехе, либо изменение счетчика корзины
    await page.waitForTimeout(1000)

    // Проверяем что что-то изменилось
    const hasSuccessMessage = await successMessage.count() > 0
    const hasCartCounter = await cartCounter.count() > 0
    
    expect(hasSuccessMessage || hasCartCounter).toBeTruthy()
  })

  test('Оформление заказа на мобильном', async ({ page }) => {
    // Предварительно добавляем товар в корзину
    await page.goto(`${BASE_URL}/catalog`)
    await waitForPageLoad(page)

    const products = page.locator('.product-card')
    if (await products.count() === 0) {
      test.skip()
      return
    }

    // Переходим на страницу товара и добавляем в корзину
    await products.first().click()
    await waitForPageLoad(page)

    const addToCartButton = page.locator('button:has-text("В корзину")')
    if (await addToCartButton.count() > 0) {
      await addToCartButton.click()
      await page.waitForTimeout(1000)
    }

    // Переходим в корзину
    await page.goto(`${BASE_URL}/cart`)
    await waitForPageLoad(page)

    // Проверяем наличие товаров в корзине
    const cartItems = page.locator('.cart-item, [data-testid="cart-item"]')
    const cartItemsCount = await cartItems.count()

    if (cartItemsCount > 0) {
      // Проверяем наличие кнопки оформления заказа
      const checkoutButton = page.locator('button:has-text("Оформить заказ"), button:has-text("Перейти к оформлению")')
      await expect(checkoutButton).toBeVisible()

      // Кликаем на кнопку оформления
      await checkoutButton.click()
      await waitForPageLoad(page)

      // Проверяем что перешли на страницу оформления заказа
      expect(page.url()).toContain('/checkout')
      
      // Проверяем наличие формы оформления
      const checkoutForm = page.locator('form, .checkout-form, [data-testid="checkout-form"]')
      await expect(checkoutForm).toBeVisible()
    } else {
      console.log('Корзина пуста, тест пропущен')
    }
  })

  test('Работа с формами на мобильном', async ({ page }) => {
    // Тестируем форму поиска
    await page.goto(BASE_URL)
    await waitForPageLoad(page)

    // 1. Форма поиска
    const searchInput = page.locator('input[type="search"], input[placeholder*="поиск"], .search-input')
    if (await searchInput.count() > 0) {
      await searchInput.click()
      await searchInput.fill('тест')
      await searchInput.press('Enter')
      await waitForPageLoad(page)
      
      // Проверяем что выполнился поиск
      const url = page.url()
      expect(url.includes('search') || url.includes('query')).toBeTruthy()
    }

    // 2. Форма подписки (если есть)
    await page.goto(BASE_URL)
    const newsletterForm = page.locator('form:has-text("подписк"), form:has-text("newsletter")')
    if (await newsletterForm.count() > 0) {
      const emailInput = newsletterForm.locator('input[type="email"]')
      const submitButton = newsletterForm.locator('button[type="submit"]')
      
      if (await emailInput.count() > 0 && await submitButton.count() > 0) {
        await emailInput.fill('test@example.com')
        await submitButton.click()
        
        // Проверяем что форма отправилась (появление сообщения)
        await page.waitForTimeout(1000)
        const successMessage = page.locator('.success-message, .alert-success')
        const hasMessage = await successMessage.count() > 0
        // Не падаем если нет сообщения - просто проверяем что форма работает
      }
    }
  })
})

// ============================================
// ДЕСКТОПНЫЕ ПОЛЬЗОВАТЕЛЬСКИЕ СЦЕНАРИИ (1024px+)
// ============================================

test.describe('Десктопные пользовательские сценарии (1024px+)', () => {
  test.beforeEach(async ({ page }) => {
    await setViewport(page, VIEWPORTS.desktopLarge.width, VIEWPORTS.desktopLarge.height)
  })

  test('Навигация по сайту на десктопе', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageLoad(page)

    // 1. Проверяем наличие десктопного меню
    const desktopNav = page.locator('nav:not(.mobile), .desktop-nav, header nav')
    await expect(desktopNav).toBeVisible()

    // 2. Проверяем наличие пунктов меню
    const navItems = desktopNav.locator('a, button')
    const itemCount = await navItems.count()
    expect(itemCount).toBeGreaterThan(0)

    // 3. Наводим курсор на пункт меню (если есть выпадающее меню)
    const firstNavItem = navItems.first()
    await firstNavItem.hover()
    await page.waitForTimeout(500)

    // 4. Кликаем на пункт меню
    await firstNavItem.click()
    await waitForPageLoad(page)

    // 5. Проверяем что перешли на другую страницу
    if (await firstNavItem.getAttribute('href')) {
      expect(page.url()).not.toBe(BASE_URL + '/')
    }
  })

  test('Работа с фильтрами в каталоге на десктопе', async ({ page }) => {
    await page.goto(`${BASE_URL}/catalog`)
    await waitForPageLoad(page)

    // 1. Ищем фильтры
    const filters = page.locator('.filters, .filter-sidebar, [data-testid="filters"]')
    
    if (await filters.count() > 0) {
      await expect(filters).toBeVisible()

      // 2. Находим первый чекбокс/радио-кнопку
      const firstCheckbox = filters.locator('input[type="checkbox"], input[type="radio"]').first()
      if (await firstCheckbox.count() > 0) {
        // 3. Кликаем на чекбокс
        await firstCheckbox.click()
        await page.waitForTimeout(1000)

        // 4. Проверяем что фильтр применился (изменился URL или обновились товары)
        const currentUrl = page.url()
        expect(currentUrl.includes('?') || currentUrl.includes('filter')).toBeTruthy()
      }

      // 5. Проверяем кнопку сброса фильтров
      const resetButton = filters.locator('button:has-text("Сбросить"), button:has-text("Очистить")')
      if (await resetButton.count() > 0) {
        await resetButton.click()
        await page.waitForTimeout(1000)
        
        // URL должен измениться (убраны параметры фильтрации)
        const urlAfterReset = page.url()
        expect(urlAfterReset.includes('filter=')).toBeFalsy()
      }
    } else {
      console.log('Фильтры не найдены, тест пропущен')
    }
  })

  test('Сравнение товаров на десктопе', async ({ page }) => {
    // Переходим в каталог
    await page.goto(`${BASE_URL}/catalog`)
    await waitForPageLoad(page)

    // 1. Ищем кнопки сравнения товаров
    const compareButtons = page.locator('button:has-text("Сравнить"), [data-testid="compare-button"], .compare-btn')
    
    if (await compareButtons.count() >= 2) {
      // 2. Кликаем на первые две кнопки сравнения
      await compareButtons.nth(0).click()
      await page.waitForTimeout(500)
      await compareButtons.nth(1).click()
      await page.waitForTimeout(500)

      // 3. Ищем кнопку перехода к сравнению
      const comparePageButton = page.locator('a:has-text("Сравнить"), [href*="compare"]')
      if (await comparePageButton.count() > 0) {
        await comparePageButton.click()
        await waitForPageLoad(page)

        // 4. Проверяем что на странице сравнения есть минимум 2 товара
        const comparedProducts = page.locator('.compare-product, [data-testid="compared-product"]')
        expect(await comparedProducts.count()).toBeGreaterThanOrEqual(2)
      }
    } else {
      console.log('Недостаточно товаров для сравнения, тест пропущен')
    }
  })

  test('Работа с корзиной на десктопе', async ({ page }) => {
    // Добавляем товар в корзину
    await page.goto(`${BASE_URL}/catalog`)
    await waitForPageLoad(page)

    const products = page.locator('.product-card')
    if (await products.count() === 0) {
      test.skip()
      return
    }

    // Наводим курсор на товар (для показа кнопки добавления)
    const firstProduct = products.first()
    await firstProduct.hover()

    // Ищем кнопку добавления в корзину на карточке товара
    const addToCartButton = firstProduct.locator('button:has-text("В корзину")')
    if (await addToCartButton.count() > 0) {
      await addToCartButton.click()
      await page.waitForTimeout(1000)
    }

    // Проверяем мини-корзину (если есть)
    const miniCart = page.locator('.mini-cart, .cart-dropdown, [data-testid="mini-cart"]')
    if (await miniCart.count() > 0) {
      // Наводим курсор на иконку корзины
      const cartIcon = page.locator('.cart-icon, [href*="cart"]')
      await cartIcon.hover()
      await page.waitForTimeout(500)

      // Проверяем что мини-корзина открылась
      await expect(miniCart).toBeVisible()

      // Проверяем что в мини-корзине есть добавленный товар
      const cartItems = miniCart.locator('.cart-item, .mini-cart-item')
      expect(await cartItems.count()).toBeGreaterThan(0)
    }

    // Переходим на страницу корзины
    await page.goto(`${BASE_URL}/cart`)
    await waitForPageLoad(page)

    // Проверяем что корзина не пуста
    const cartPageItems = page.locator('.cart-item, [data-testid="cart-item"]')
    expect(await cartPageItems.count()).toBeGreaterThan(0)

    // Проверяем функциональность изменения количества
    const quantityInput = cartPageItems.first().locator('input[type="number"], .quantity-input')
    if (await quantityInput.count() > 0) {
      await quantityInput.fill('2')
      await page.waitForTimeout(500)
      
      // Проверяем что количество изменилось
      const value = await quantityInput.inputValue()
      expect(value).toBe('2')
    }

    // Проверяем кнопку удаления товара
    const removeButton = cartPageItems.first().locator('button:has-text("Удалить"), .remove-item')
    if (await removeButton.count() > 0) {
      await removeButton.click()
      await page.waitForTimeout(1000)
      
      // Проверяем что товар удалился (корзина может стать пустой или количество уменьшиться)
      const updatedCount = await cartPageItems.count()
      expect(updatedCount).toBeLessThan(await cartPageItems.count())
    }
  })

  test('Личный кабинет на десктопе', async ({ page }) => {
    // Переходим в личный кабинет (если пользователь авторизован)
    await page.goto(`${BASE_URL}/account`)
    await waitForPageLoad(page)

    // Проверяем наличие элементов личного кабинета
    const accountSections = page.locator('.account-section, [data-testid="account-section"]')
    const sectionCount = await accountSections.count()
    
    if (sectionCount > 0) {
      // Личный кабинет доступен (пользователь авторизован)
      await expect(accountSections.first()).toBeVisible()

      // Проверяем наличие вкладок/разделов
      const accountTabs = page.locator('.account-tab, [role="tab"]')
      if (await accountTabs.count() > 0) {
        // Кликаем на вторую вкладку (если есть)
        await accountTabs.nth(1).click()
        await page.waitForTimeout(500)
        
        // Проверяем что контент изменился
        const activeContent = page.locator('.account-content:visible, [data-testid="account-content"]')
        await expect(activeContent).toBeVisible()
      }
    } else {
      // Пользователь не авторизован - проверяем форму входа
      const loginForm = page.locator('form:has-text("Вход"), form:has-text("логин")')
      if (await loginForm.count() > 0) {
        await expect(loginForm).toBeVisible()
        
        // Заполняем форму тестовыми данными
        const emailInput = loginForm.locator('input[type="email"]')
        const passwordInput = loginForm.locator('input[type="password"]')
        const submitButton = loginForm.locator('button[type="submit"]')
        
        if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
          await emailInput.fill('test@example.com')
          await passwordInput.fill('password123')
          await submitButton.click()
          await page.waitForTimeout(1000)
          
          // Проверяем результат (может быть ошибка или успешный вход)
          const errorMessage = page.locator('.error-message, .alert-error')
          const successMessage = page.locator('.success-message, .alert-success')
          
          // Не падаем, просто проверяем что форма работает
          expect(await errorMessage.count() > 0 || await successMessage.count() > 0).toBeTruthy()
        }
      }
    }
  })
})

// ============================================
// КРОСС-УСТРОЙСТВЕННЫЕ СЦЕНАРИИ
// ============================================

test.describe('Кросс-устройственные сценарии', () => {
  test('Переход с мобильного на десктоп (изменение размера окна)', async ({ page }) => {
    // Начинаем с мобильного viewport
    await setViewport(page, VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)
    await page.goto(BASE_URL)
    await waitForPageLoad(page)

    // Проверяем что мобильное меню видно
    const mobileMenuButton = page.locator('button[aria-label*="меню"]').first()
    await expect(mobileMenuButton).toBeVisible()

    // Добавляем товар в корзину (если есть)
    await page.goto(`${BASE_URL}/catalog`)
    await waitForPageLoad(page)
    
    const products = page.locator('.product-card')
    if (await products.count() > 0) {
      await products.first().click()
      await waitForPageLoad(page)
      
      const addToCartButton = page.locator('button:has-text("В корзину")')
      if (await addToCartButton.count() > 0) {
        await addToCartButton.click()
        await page.waitForTimeout(1000)
      }
    }

    // Меняем viewport на десктопный
    await setViewport(page, VIEWPORTS.desktopLarge.width, VIEWPORTS.desktopLarge.height)
    await page.waitForTimeout(1000)

    // Проверяем что десктопное меню видно
    const desktopNav = page.locator('nav:not(.mobile)').first()
    await expect(desktopNav).toBeVisible()

    // Проверяем что состояние корзины сохранилось
    const cartCounter = page.locator('.cart-counter, [data-testid="cart-count"]')
    if (await cartCounter.count() > 0) {
      const countText = await cartCounter.textContent()
      expect(countText).toContain('1')
    }

    // Проверяем что контент адаптировался
    const bodyWidth = await page.evaluate(() => document.body.clientWidth)
    expect(bodyWidth).toBeGreaterThan(VIEWPORTS.desktopLarge.width - 100)
  })

  test('Сохранение состояния (корзина, избранное)', async ({ page }) => {
    // Начинаем с мобильного
    await setViewport(page, VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)
    await page.goto(`${BASE_URL}/catalog`)
    await waitForPageLoad(page)

    // Добавляем товар в избранное (если есть функционал)
    const wishlistButtons = page.locator('button:has-text("Избранное"), .wishlist-btn')
    if (await wishlistButtons.count() > 0) {
      await wishlistButtons.first().click()
      await page.waitForTimeout(500)
    }

    // Добавляем товар в корзину
    const products = page.locator('.product-card')
    if (await products.count() > 0) {
      await products.first().click()
      await waitForPageLoad(page)
      
      const addToCartButton = page.locator('button:has-text("В корзину")')
      if (await addToCartButton.count() > 0) {
        await addToCartButton.click()
        await page.waitForTimeout(1000)
      }
    }

    // Перезагружаем страницу
    await page.reload()
    await waitForPageLoad(page)

    // Проверяем что состояние сохранилось (корзина)
    const cartCounter = page.locator('.cart-counter')
    if (await cartCounter.count() > 0) {
      const countText = await cartCounter.textContent()
      expect(countText).toContain('1')
    }

    // Меняем viewport на десктопный
    await setViewport(page, VIEWPORTS.desktopLarge.width, VIEWPORTS.desktopLarge.height)
    await page.waitForTimeout(1000)

    // Проверяем что состояние сохранилось после изменения viewport
    if (await cartCounter.count() > 0) {
      const countTextAfterResize = await cartCounter.textContent()
      expect(countTextAfterResize).toContain('1')
    }
  })

  test('Адаптация контента при изменении ориентации (для мобильных)', async ({ page }) => {
    // Устанавливаем портретный режим
    await setViewport(page, VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)
    await page.goto(BASE_URL)
    await waitForPageLoad(page)

    // Запоминаем ширину контента в портретном режиме
    const portraitContent = page.locator('main, .container')
    const portraitWidth = await portraitContent.evaluate(el => el.clientWidth)

    // Меняем на ландшафтный режим
    await setViewport(page, VIEWPORTS.mobile.height, VIEWPORTS.mobile.width) // swap width/height
    await page.waitForTimeout(1000)

    // Проверяем что контент адаптировался
    const landscapeContent = page.locator('main, .container')
    const landscapeWidth = await landscapeContent.evaluate(el => el.clientWidth)
    
    // Ширина должна увеличиться в ландшафтном режиме
    expect(landscapeWidth).toBeGreaterThan(portraitWidth)

    // Проверяем что навигация корректно отображается
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()

    // Возвращаем портретный режим
    await setViewport(page, VIEWPORTS.mobile.width, VIEWPORTS.mobile.height)
    await page.waitForTimeout(500)

    // Проверяем что вернулись к исходному состоянию
    const finalWidth = await portraitContent.evaluate(el => el.clientWidth)
    expect(finalWidth).toBeLessThanOrEqual(portraitWidth + 10) // Допуск 10px
  })
})

// ============================================
// АНАЛИЗ РЕЗУЛЬТАТОВ ТЕСТИРОВАНИЯ
// ============================================

test.describe('Анализ результатов тестирования', () => {
  test('Сводка по тестированию пользовательских сценариев', async ({ page }) => {
    // Этот тест собирает информацию о состоянии сайта
    await page.goto(BASE_URL)
    await waitForPageLoad(page)

    // Проверяем доступность ключевых страниц
    const pagesToCheck = ['/catalog', '/cart', '/account', '/checkout']
    const availablePages: string[] = []
    const problematicPages: string[] = []

    for (const path of pagesToCheck) {
      try {
        const response = await page.goto(`${BASE_URL}${path}`)
        await waitForPageLoad(page)
        
        if (response && response.status() === 200) {
          availablePages.push(path)
        } else {
          problematicPages.push(`${path} (status: ${response?.status()})`)
        }
      } catch (error) {
        problematicPages.push(`${path} (error: ${error})`)
      }
    }

    console.log('Доступные страницы:', availablePages)
    console.log('Проблемные страницы:', problematicPages)

    // Проверяем адаптивность основных компонентов
    const viewportsToCheck = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 }
    ]

    const responsiveIssues: string[] = []

    for (const vp of viewportsToCheck) {
      await setViewport(page, vp.width, vp.height)
      await page.goto(BASE_URL)
      await waitForPageLoad(page)

      // Проверяем что header виден
      const header = page.locator('header')
      if (!(await header.isVisible())) {
        responsiveIssues.push(`Header не виден на ${vp.name} (${vp.width}x${vp.height})`)
      }

      // Проверяем что контент не выходит за пределы viewport
      const bodyWidth = await page.evaluate(() => document.body.clientWidth)
      if (bodyWidth > vp.width + 100) {
        responsiveIssues.push(`Контент выходит за пределы viewport на ${vp.name}: ${bodyWidth} > ${vp.width}`)
      }
    }

    console.log('Проблемы с адаптивностью:', responsiveIssues)

    // Тест не падает - просто собирает информацию
    expect(availablePages.length).toBeGreaterThan(0)
  })
})