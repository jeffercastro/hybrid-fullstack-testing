import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30000,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Automatically starts the app server before running tests.
  // Uses a dedicated start.ts script for reliable cross-platform compatibility.
  webServer: {
    command: 'npx ts-node app/start.ts',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
});
