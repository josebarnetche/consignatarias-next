#!/usr/bin/env node
/**
 * Saca las capturas del panel que usa el PDF de la propuesta PRO.
 *
 *   node scripts/propuesta-capturas.mjs <base-url> <cookies.json>
 *
 * Abre /propuesta/capturas (sólo admin: el JSON trae las cookies de una sesión de
 * admin en formato Playwright) y guarda cada [data-captura] a 2x en
 * src/lib/pdf/propuesta/capturas/<id>.png. Correrlo de nuevo si cambia el panel.
 */
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const [base = 'http://localhost:3000', cookiesPath] = process.argv.slice(2)
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const ctx = await browser.newContext({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
if (cookiesPath) await ctx.addCookies(JSON.parse(readFileSync(cookiesPath, 'utf8')))
const page = await ctx.newPage()
await page.goto(`${base}/propuesta/capturas`, { waitUntil: 'load', timeout: 180_000 })
await page.waitForTimeout(2500)
const bloques = await page.locator('[data-captura]').all()
if (!bloques.length) throw new Error('No hay capturas: ¿la sesión es de admin?')
for (const b of bloques) {
  const id = await b.getAttribute('data-captura')
  await b.screenshot({ path: `src/lib/pdf/propuesta/capturas/${id}.png` })
  console.log('ok', id)
}
await browser.close()
