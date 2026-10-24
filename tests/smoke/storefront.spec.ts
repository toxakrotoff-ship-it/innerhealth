import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page, baseURL }) => {
  // Keep browser analytics, maps and other external integrations offline.
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    return url.origin === baseURL || !['http:', 'https:'].includes(url.protocol)
      ? route.continue()
      : route.abort()
  })
})

test('catalog, product, cart quantities and persisted cart', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const response = await page.goto('/catalog')
  expect(response?.status()).toBe(200)
  const product = page.getByRole('heading', { name: 'Smoke Inner Product' })
  await expect(product).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Smoke Sprint Product' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Да, я согласен(-на)', exact: true }).click()
  await page.getByRole('link', { name: 'Подробнее', exact: true }).click()
  await expect(page).toHaveURL(/\/product\/smoke-inner-product$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Smoke Inner Product')
  await page.getByRole('button', { name: /В корзину/ }).first().click()
  await expect(page.locator('aside[aria-label="Корзина"]')).toBeVisible()
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await page.goto('/cart')
  await expect(page.getByRole('link', { name: 'Smoke Inner Product', exact: true })).toBeVisible()
  await page.getByRole('spinbutton').fill('2')
  await expect(page.getByRole('spinbutton')).toHaveValue('2')
  await page.reload()
  await expect(page.getByRole('spinbutton')).toHaveValue('2')
  await expect(page.getByRole('link', { name: 'Smoke Inner Product', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(page.getByRole('main').getByText('Корзина пуста', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('Sprint storefront isolates its catalog', async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-brand': 'sprint-power' })
  const response = await page.goto('/catalog')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Smoke Sprint Product' })).toBeVisible()
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#060A14')
  await expect(page.getByRole('heading', { name: 'Smoke Inner Product' })).toHaveCount(0)
  await page.goto('/product/smoke-sprint-product')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Smoke Sprint Product')
})

test('guest is redirected, then customer can sign in and open account', async ({ page }) => {
  await page.goto('/account')
  await expect(page).toHaveURL(/\/login/)
  await page.goto('/login?email=customer%40example.test')
  await page.getByPlaceholder('Пароль', { exact: true }).fill('SmokePassword123!')
  await page.getByRole('button', { name: /Войти|Продолжить с email/ }).click()
  await expect(page).toHaveURL(/\/account$/)
  await page.reload()
  await expect(page).toHaveURL(/\/account$/)
  await expect(page.locator('body')).toContainText('customer@example.test')
})

test('invalid credentials show an error and admin stays protected', async ({ page, request }) => {
  const response = await request.get('/api/admin/checkout-sessions', { maxRedirects: 0 })
  expect([302, 307, 401, 403]).toContain(response.status())
  if ([302, 307].includes(response.status())) {
    const redirectPath = new URL(response.headers().location, response.url()).pathname
    expect(['/login', '/api/auth/signin']).toContain(redirectPath)
  }
  await page.goto('/admin/catalog')
  await expect(page).toHaveURL(/\/login/)
  await page.goto('/login?email=customer%40example.test')
  await page.getByPlaceholder('Пароль', { exact: true }).fill('WrongPassword123!')
  await page.getByRole('button', { name: /Войти|Продолжить с email/ }).click()
  await expect(page.getByText('Неверные учетные данные', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})
