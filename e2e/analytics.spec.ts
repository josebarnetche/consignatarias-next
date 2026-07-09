import { test, expect, type Page } from '@playwright/test'

/**
 * Verificación de instrumentado (Fase C, ver docs/analytics/).
 *
 * Cómo funciona: en dev/CI los eventos NO disparan a GA4 (analytics.ts se guarda
 * en PROD_HOSTS). El hook de modo-test (`window.__CNSG_TRACK_TEST__`) hace que
 * cada evento que pasa por `trackEvent` se acumule en `window.__cnsgEvents`, y acá
 * lo afirmamos. Es la red de seguridad contra deploys que rompen el tracking.
 *
 * NOTA: `calendar_download` NO aparece acá a propósito — usa `window.gtag` crudo
 * y bypassa el helper (ver audit.md, hallazgo P0-1). Su ausencia es la prueba del
 * drift; cuando se arregle, agregar su assert.
 */

// Prende la captura ANTES de que corra cualquier script de la página.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { __CNSG_TRACK_TEST__?: boolean }).__CNSG_TRACK_TEST__ = true
  })
})

async function trackedEventNames(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    ((window as unknown as { __cnsgEvents?: Array<{ event: string }> }).__cnsgEvents ?? []).map(
      (e) => e.event,
    ),
  )
}

test('calculadora — calcular dispara calculadora_calculate y el nudge de cuenta', async ({ page }) => {
  await page.goto('/calculadora')
  await page.getByRole('button', { name: /calcular valor estimado/i }).click()
  await expect
    .poll(() => trackedEventNames(page), { message: 'calculadora_calculate no disparó' })
    .toContain('calculadora_calculate')
  await expect
    .poll(() => trackedEventNames(page), { message: 'account_nudge no disparó tras el cálculo' })
    .toContain('account_nudge')
})

test('perfil de consignataria — la carga dispara profile_view (key event)', async ({ page }) => {
  await page.goto('/consignatarias/sivero')
  await expect
    .poll(() => trackedEventNames(page), { message: 'profile_view no disparó al cargar el perfil' })
    .toContain('profile_view')
})

test('remates — aplicar un filtro dispara filter_apply', async ({ page }) => {
  await page.goto('/remates')
  // Selector best-effort: el filtro de provincia. Si el UI cambia, ajustar acá.
  const provincia = page.getByRole('combobox').first()
  if (await provincia.count()) {
    await provincia.selectOption({ index: 1 }).catch(() => {})
  }
  await expect
    .poll(() => trackedEventNames(page), { message: 'filter_apply no disparó' })
    .toContain('filter_apply')
})

test('página — page_view se emite en la navegación', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => trackedEventNames(page)).toContain('page_view')
})
