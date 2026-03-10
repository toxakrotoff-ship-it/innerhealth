import { defineConfig, devices } from '@playwright/test';

/**
 * Конфигурация Playwright для тестирования адаптивности
 *
 * Включает проекты для разных viewport размеров:
 * - Mobile (320px)
 * - Tablet (768px)
 * - Desktop (1024px)
 * - XL (1280px)
 * - 2XL (1536px)
 * - 3XL (1920px)
 * - 4XL (2560px)
 * - 5XL (3840px) - 4K UHD мониторы
 * - 6XL (5120px) - 5K и сверхбольшие экраны
 */

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // ============================================
    // Адаптивные тесты (основные)
    // ============================================
    {
      name: 'adaptive-mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 320, height: 568 },
        deviceScaleFactor: 2,
      },
      testMatch: /adaptive\.spec\.ts/,
    },
    {
      name: 'adaptive-tablet',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
      testMatch: /adaptive\.spec\.ts/,
    },
    {
      name: 'adaptive-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
      },
      testMatch: /adaptive\.spec\.ts/,
    },
    {
      name: 'adaptive-xl',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      testMatch: /adaptive\.spec\.ts/,
    },
    {
      name: 'adaptive-2xl',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1536, height: 864 },
      },
      testMatch: /adaptive\.spec\.ts/,
    },
    {
      name: 'adaptive-3xl',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: /adaptive\.spec\.ts/,
    },
    {
      name: 'adaptive-4xl',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
      },
      testMatch: /adaptive\.spec\.ts/,
    },

    // ============================================
    // Кроссбраузерные тесты
    // ============================================
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /adaptive\.spec\.ts/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /adaptive\.spec\.ts/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /adaptive\.spec\.ts/,
    },

    // ============================================
    // Мобильные устройства
    // ============================================
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /mobile\.spec\.ts/,
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testMatch: /mobile\.spec\.ts/,
    },

    // ============================================
    // Тесты с высоким DPI
    // ============================================
    {
      name: 'high-dpi',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1.5, // 150% масштабирование
      },
      testMatch: /adaptive\.spec\.ts/,
    },
  ],

  // Запуск dev сервера перед тестами
  webServer: process.env.CI ? {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  } : undefined,
});
