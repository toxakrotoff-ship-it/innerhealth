import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 45_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/smoke', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3317',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'smoke-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'smoke-mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node tests/smoke/start-server.mjs',
    url: 'http://127.0.0.1:3317/api/auth/session',
    reuseExistingServer: false,
    stdout: 'pipe',
    timeout: 240_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
  },
})
