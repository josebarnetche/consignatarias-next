/**
 * Capturas REALES del panel de una firma para su propuesta PRO (18-10-2026).
 *
 * La propuesta genérica (la que cualquiera pide con su mail) muestra el panel con datos
 * de ejemplo. Cuando la armamos a mano para una firma con cuenta, conviene que vea SU
 * panel: entra con su usuario y se fotografían los bloques. Las imágenes van a
 * private/capturas-firmas/<slug>/ (fuera de git: llevan sus visitas y sus búsquedas) y
 * src/lib/pdf/propuesta/generar.tsx las usa en lugar de las de ejemplo.
 *
 * Uso:
 *   node scripts/propuesta-capturas-firma.mjs <base> <slug> <email> <contraseña>
 *   ej.: node scripts/propuesta-capturas-firma.mjs http://localhost:3000 reggi reggi@consignatarias.com '…'
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const [base, slug, email, clave] = process.argv.slice(2)
if (!base || !slug || !email || !clave) {
  console.error('Uso: node scripts/propuesta-capturas-firma.mjs <base> <slug> <email> <contraseña>')
  process.exit(1)
}
const dir = `private/capturas-firmas/${slug}`
mkdirSync(dir, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const ctx = await browser.newContext({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
const page = await ctx.newPage()
page.setDefaultTimeout(120_000)

await page.goto(`${base}/login`, { waitUntil: 'networkidle' })
await page.getByText('Tengo usuario y contraseña').click()
await page.locator('input[type=email]').fill(email)
await page.locator('input[type=password]').fill(clave)
await page.locator('button[type=submit]').last().click()
await page.waitForURL(/dashboard/)

// Sin banner de cookies, botón flotante de WhatsApp ni indicador de Next.
const limpiar = () => page.addStyleTag({
  content: `[class*='fixed'], .fixed, nextjs-portal { display: none !important; }`,
})

/** El bloque más chico con borde que contiene el texto. */
async function bloque(texto) {
  const el = page.getByText(texto, { exact: false }).first()
  await el.waitFor()
  return el.evaluateHandle((n) => {
    let e = n
    while (e && e !== document.body) {
      const c = String(e.className || '')
      if (/terminal-panel|rounded/.test(c) && /border|terminal-panel/.test(c) && e.getBoundingClientRect().width > 600) return e
      e = e.parentElement
    }
    return n
  })
}

async function foto(id, handle) {
  await handle.asElement().scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await handle.asElement().screenshot({ path: `${dir}/${id}.png` })
  console.log('ok', id)
}

// PANEL: la cabecera de la firma y la bienvenida con sus vistas.
await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' })
await limpiar()
await page.waitForTimeout(1500)
{
  const a = await (await bloque('Ver tu perfil público')).asElement().boundingBox()
  const b = await (await bloque('Vistas de perfil')).asElement().boundingBox()
  await page.screenshot({
    path: `${dir}/panel.png`,
    clip: { x: a.x, y: a.y, width: a.width, height: b.y + b.height - a.y },
    fullPage: true,
  })
  console.log('ok panel')
}
await foto('visitas', await bloque('Quién te mira'))

// REMATES: la pestaña tal como la ve la firma.
await page.goto(`${base}/dashboard?tab=remates`, { waitUntil: 'networkidle' })
await limpiar()
await page.waitForTimeout(1500)
{
  const a = await (await bloque('MIS REMATES')).asElement().boundingBox()
  const ult = page.locator('text=/Los encontramos solos|REMATES DEL CALENDARIO|TUS REMATES/').last()
  const b = await (await ult.evaluateHandle((n) => {
    let e = n
    while (e && !/terminal-panel/.test(String(e.className || ''))) e = e.parentElement
    return e || n
  })).asElement().boundingBox()
  await page.screenshot({
    path: `${dir}/remates.png`,
    clip: { x: a.x, y: a.y, width: a.width, height: b.y + b.height - a.y },
    fullPage: true,
  })
  console.log('ok remates')
}

await browser.close()
