/**
 * El precio del novillo en pie en los países con los que Argentina compite,
 * en dólares por kilo VIVO.
 *
 * POR QUÉ. El MCP contestaba "cuánto vale en Argentina" y nada más. La pregunta
 * del que mira el país desde afuera es otra: **cuánto más barato está acá**. Nadie
 * publica esa comparación armada — se buscó, y lo único que existe es Faxcarne,
 * que cuesta US$768 al año. Así que el número comparado es producto propio.
 *
 * ⚠️ EL HALLAZGO QUE ORDENA EL RELATO: Argentina NO está regalada contra todos.
 * Al 07-10-2026 opera a US$2,73/kg vivo y Brasil a US$2,65: estamos ARRIBA del
 * vecino. La brecha real y defendible es contra Estados Unidos (×1,8), la Unión
 * Europea (×1,5) y Uruguay (×1,2). Un comprador con asesor desarma en una reunión
 * cualquier pitch que diga "la más barata de la región".
 *
 * QUÉ ENTRA Y QUÉ NO, Y POR QUÉ.
 * Se toman sólo las fuentes que se pueden republicar y que publican PESO VIVO sin
 * obligarnos a estimar un rendimiento de carcasa:
 *  - **Estados Unidos (USDA AMS)**: obra del gobierno federal → dominio público.
 *    El campo `LIVE FOB` ya es peso vivo. Es la fuente más limpia que existe.
 *  - **Australia (MLA)**: su licencia autoriza explícitamente el uso comercial con
 *    una frase de atribución fija, que va incluida en la salida. El indicador 4
 *    viene etiquetado `c/kg lwt`, o sea vivo.
 *  - **Uruguay (INAC)**: publica "Novillo en pie" en USD/kg. Organismo público sin
 *    licencia declarada; se cita.
 *
 * **Brasil queda afuera a propósito.** CEPEA es la referencia y técnicamente es
 * trivial —7.271 filas desde 1997, ya en dólares— pero su política de derechos
 * prohíbe expresamente *"la transmisión de series de precios"* y su licencia es
 * no comercial. Entra el día que haya autorización escrita, no antes.
 *
 * Uso: node scripts/scrapers/precios-internacionales.mjs
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SALIDA = 'src/lib/data/precios-internacionales.json'
const UA = 'ConsignatariasBot/1.0 (+https://www.consignatarias.com.ar/mcp; agro@memola.com.ar)'
/** Libras en 100 libras (un cwt), para pasar USD/cwt a USD/kg. */
const KG_POR_CWT = 45.3592

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Varias de estas fuentes cortan la conexión sin devolver código, y el PDF de
 * INAC llegó truncado a la mitad en el primer intento (436 KB de 1,57 MB) sin que
 * nada lo avisara. Por eso todo pasa por acá y por eso se valida el tamaño.
 */
async function bajar(url, { binario = false, intentos = 3, minBytes = 0 } = {}) {
  let ultimo
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (binario) {
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length < minBytes) throw new Error(`descarga corta: ${buf.length} de ${minBytes}+ bytes`)
        return buf
      }
      return await res.text()
    } catch (e) {
      ultimo = e
      await dormir([2000, 6000, 15000][i] ?? 15000)
    }
  }
  throw new Error(`${url} falló tras ${intentos} intentos: ${ultimo?.message}`)
}

/** Estados Unidos — USDA AMS, 5 Area Weekly Weighted Average, novillo LIVE FOB. */
async function estadosUnidos() {
  const hoy = new Date()
  const desde = new Date(hoy.getTime() - 21 * 86_400_000)
  const f = (d) => `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`
  const url =
    'https://mpr.datamart.ams.usda.gov/services/v1.1/reports/2477/Detail' +
    `?q=report_date=${f(desde)}:${f(hoy)}`
  const d = JSON.parse(await bajar(url))
  const filas = (d.results || d || []).filter(
    (r) =>
      r.selling_basis_description === 'LIVE FOB' &&
      r.class_description === 'STEER' &&
      r.grade_description === 'Total all grades' &&
      r.weighted_avg_price,
  )
  if (!filas.length) throw new Error('USDA no devolvió novillo LIVE FOB')
  // El datamart NO devuelve las filas ordenadas: tomar la última del array daba
  // una semana vieja (21/09 en vez de 05/10). Se ordena por fecha a mano.
  const aISO = (f) => { const [m, d, a] = String(f).split('/'); return `${a}-${m}-${d}` }
  filas.sort((x, y) => aISO(x.report_date).localeCompare(aISO(y.report_date)))
  const u = filas[filas.length - 1]
  const cwt = Number(String(u.weighted_avg_price).replace(/,/g, ''))
  return {
    pais: 'Estados Unidos',
    usd_kg_vivo: Number((cwt / KG_POR_CWT).toFixed(3)),
    nativo: `${cwt} USD/cwt`,
    base: 'peso vivo (LIVE FOB), sin estimar rendimiento',
    fecha: u.report_date,
    fuente: 'USDA AMS Market News — LM_CT150, 5 Area Weekly Weighted Average Direct Slaughter Cattle',
    url: 'https://mpr.datamart.ams.usda.gov/services/v1.1/reports/2477/Detail',
    licencia: 'Dominio público (obra del gobierno federal de EE.UU.)',
  }
}

/** Australia — MLA, National Heavy Steer Indicator, etiquetado `c/kg lwt`. */
async function australia(audPorUsd) {
  const hoy = new Date()
  const ayer = new Date(hoy.getTime() - 86_400_000)
  const desde = new Date(hoy.getTime() - 21 * 86_400_000)
  const iso = (d) => d.toISOString().slice(0, 10)
  // `toDate` no acepta hoy ni el futuro: devuelve un mensaje de error, no datos.
  const url = `https://api-mlastatistics.mla.com.au/report/5?indicatorID=4&fromDate=${iso(desde)}&toDate=${iso(ayer)}`
  const d = JSON.parse(await bajar(url))
  const filas = (d.data || []).filter((x) => x.indicator_value > 0)
  if (!filas.length) throw new Error('MLA no devolvió el Heavy Steer')
  const u = filas[filas.length - 1]
  if (!String(u.indicator_units || '').includes('lwt')) {
    // Si MLA cambiara el indicador a peso de carcasa, el número dejaría de ser
    // comparable y hay que enterarse, no publicarlo igual.
    throw new Error(`MLA cambió la unidad del indicador 4: ${u.indicator_units}`)
  }
  return {
    pais: 'Australia',
    usd_kg_vivo: Number((u.indicator_value / 100 / audPorUsd).toFixed(3)),
    nativo: `${u.indicator_value.toFixed(1)} c/kg lwt (AUD)`,
    base: 'peso vivo (indicador lwt), sin estimar rendimiento',
    fecha: u.calendar_date,
    fuente: 'Meat & Livestock Australia — National Heavy Steer Indicator (NLRS)',
    url: 'https://api-mlastatistics.mla.com.au/',
    licencia: 'Uso comercial autorizado con atribución',
    atribucion: 'Reproduced courtesy of Meat & Livestock Australia Limited – www.mla.com.au',
  }
}

/** Uruguay — INAC. El único que publica "Novillo en pie" directo en USD/kg vivo. */
async function uruguay() {
  const pdf = await bajar(
    'https://www.inac.uy/innovaportal/file/17274/1/precios-de-hacienda-bovina-y-ovina.pdf',
    { binario: true, minBytes: 1_000_000 },
  )
  const ruta = join(tmpdir(), `inac-${Date.now()}.pdf`)
  writeFileSync(ruta, pdf)
  const texto = execFileSync('pdftotext', ['-layout', ruta, '-'], { encoding: 'utf8', maxBuffer: 20e6 })

  const m = texto.match(/Novillo en pie\s+([\d.,]+)/)
  if (!m) throw new Error('INAC cambió el formato: no se encontró "Novillo en pie"')
  // Uruguay escribe 3,378 con coma decimal.
  const valor = Number(m[1].replace(/\./g, '').replace(',', '.'))
  const fecha = texto.match(/Informe actualizado el\s+(\d{2}\/\d{2}\/\d{4})/)?.[1] ?? null
  const semana = texto.match(/Semana actual:\s*(.+)/)?.[1]?.trim() ?? null
  return {
    pais: 'Uruguay',
    usd_kg_vivo: Number(valor.toFixed(3)),
    nativo: `${valor} USD/kg en pie`,
    base: 'peso vivo, publicado así por la fuente',
    fecha,
    semana,
    fuente: 'INAC — Precios de Hacienda Bovinos y Ovinos',
    url: 'https://www.inac.uy/innovaportal/v/17274/37/innova.bs/precios-de-hacienda-bovinos-y-ovinos',
    licencia: 'Organismo público, sin licencia declarada: se cita',
  }
}

async function main() {
  const fx = JSON.parse(await bajar('https://api.frankfurter.dev/v1/latest?base=USD&symbols=AUD'))
  const audPorUsd = fx?.rates?.AUD
  if (!audPorUsd) throw new Error('sin tipo de cambio AUD')

  const paises = []
  const fallas = []
  for (const [nombre, fn] of [
    ['Estados Unidos', estadosUnidos],
    ['Australia', () => australia(audPorUsd)],
    ['Uruguay', uruguay],
  ]) {
    try {
      paises.push(await fn())
      process.stderr.write(`✓ ${nombre}\n`)
    } catch (e) {
      // Una fuente caída no tira la corrida: se declara la ausencia. Publicar la
      // comparación sin decir que falta un país sería peor que no publicarla.
      fallas.push({ pais: nombre, error: String(e.message || e) })
      process.stderr.write(`✗ ${nombre}: ${e.message}\n`)
    }
    await dormir(1000)
  }
  if (!paises.length) throw new Error('ninguna fuente internacional respondió')

  paises.sort((a, b) => b.usd_kg_vivo - a.usd_kg_vivo)
  mkdirSync('src/lib/data', { recursive: true })
  writeFileSync(
    SALIDA,
    JSON.stringify(
      {
        generadoEl: new Date().toISOString(),
        unidad: 'USD por kilogramo de novillo en pie (peso vivo)',
        metodo:
          'Sólo fuentes que publican peso vivo: no se estima rendimiento de carcasa en ningún país. ' +
          'Brasil queda afuera porque la licencia de CEPEA prohíbe la transmisión de series de precios.',
        tipoCambio: { aud_por_usd: audPorUsd, fuente: 'frankfurter.dev' },
        paises,
        fallas,
      },
      null,
      1,
    ) + '\n',
  )
  for (const p of paises) {
    process.stderr.write(`  ${p.pais.padEnd(16)} US$${p.usd_kg_vivo.toFixed(2)}/kg vivo  (${p.fecha})\n`)
  }
  process.stderr.write(`→ ${SALIDA}\n`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()
