import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // sequential to guarantee isolated DB state
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

  // Automatically start the local application server before running tests
  webServer: {
    command: 'npx ts-node -e "import { createServer } from \'./app/server\'; createServer().listen(3000, () => console.log(\'Server ready on 3000\'));"',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
});
