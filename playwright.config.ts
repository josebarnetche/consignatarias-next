import { defineConfig, devices } from '@playwright/test'

/**
 * Config de verificación de tracking (Fase C). Requiere un install de una vez:
 *   npm i -D @playwright/test && npx playwright install chromium
 * Correr:  npx playwright test         (levanta `pnpm dev` solo si hace falta)
 *          E2E_BASE_URL=https://... npx playwright test   (contra un deploy)
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Arranca el dev server si no hay uno. Desactivar con E2E_NO_SERVER=1.
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
